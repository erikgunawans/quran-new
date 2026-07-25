/**
 * Session distillation (issue 04 / T4): raw D1 log → derived KV profile.
 *
 * Decision 9 (Erik): re-distill EVERY session, over the FULL log, but SKIP when there are no new events.
 * Reading the full log every time is what makes it whipsaw-proof — one odd day is diluted by all the
 * history before it. The profile is regenerable: delete it and the next session rebuilds it identically.
 *
 * The profile is BILLBOARD-SAFE by construction — interest tags + a neutral 2-line summary, no PII, no
 * verbatim quotes. It is the only thing T5/T6 read to personalize, and it stays user-visible (issue 08).
 *
 * Runs in `ctx.waitUntil` — it never blocks or delays the user's request.
 */
import { callChatModel, resolveProvider } from "./providers.ts";
import { getEvents } from "./store.ts";
import type { Env } from "./index.ts";

/** Minimal inline KV type — self-contained, same style as the Worker's other inline bindings. */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Profile {
  interest_tags: string[];
  summary: string;
  /** The newest event ts at distill time — the skip marker for "no new events since". */
  last_event_ts: number;
  distilled_at: number;
}

const MAX_TAGS = 6;
const MAX_TAG_LEN = 40;
const MAX_SUMMARY_LEN = 240;
const MAX_EVENTS_IN_PROMPT = 100;

const profileKey = (userId: string): string => `profile:${userId}`;

const DISTILL_SYSTEM = [
  "Kamu menyusun profil MINAT singkat dari aktivitas seorang pengguna aplikasi Al-Qur'an",
  "(pertanyaan yang ia ajukan dan surah yang ia baca). Tujuannya HANYA membantu menampilkan topik",
  "yang relevan untuk pengguna itu sendiri — bukan menilai, bukan mendiagnosis, bukan menyimpan hal sensitif.",
  "",
  "Keluarkan HANYA JSON valid, tanpa teks lain:",
  '{"interest_tags": ["..."], "summary": "..."}',
  "",
  "Aturan:",
  "- interest_tags: maksimal 6 tema singkat (1-3 kata), mis. \"kecemasan\", \"rezeki\", \"sabar\", \"salat malam\".",
  "  Tema minat — bukan nama, bukan data pribadi, bukan diagnosis.",
  "- summary: maksimal 2 kalimat, netral, tentang apa yang sedang dieksplorasi pengguna. Tanpa nama,",
  "  tanpa detail identitas, tanpa penilaian. Aman untuk ditampilkan ke pengguna itu sendiri.",
  "- Utamakan aktivitas TERBARU (baris teratas berbobot lebih besar).",
  "- Jangan mengarang klaim agama. Jika data sedikit, keluarkan tag seadanya dan summary singkat.",
].join("\n");

export function buildUserMessage(events: { kind: string; payload: string | null }[]): string {
  const lines: string[] = [];
  for (const e of events.slice(0, MAX_EVENTS_IN_PROMPT)) {
    try {
      const p = JSON.parse(e.payload ?? "{}") as { question?: string; ref?: string };
      if (e.kind === "question" && p.question) lines.push(`Bertanya: ${p.question}`);
      else if (e.kind === "read" && p.ref) lines.push(`Membaca: QS ${p.ref}`);
    } catch {
      /* skip malformed payload */
    }
  }
  return `Aktivitas pengguna (terbaru di atas):\n${lines.join("\n")}`;
}

/** Coerce arbitrary model output into a safe, bounded profile shape. Returns null if unusable. */
export function parseProfile(raw: string): { interest_tags: string[]; summary: string } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const o = obj as { interest_tags?: unknown; summary?: unknown };
  const tags = Array.isArray(o.interest_tags)
    ? o.interest_tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().slice(0, MAX_TAG_LEN))
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : [];
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, MAX_SUMMARY_LEN) : "";
  if (!tags.length && !summary) return null;
  return { interest_tags: tags, summary };
}

/**
 * Distill this user's profile if there is new activity since the last run. No-op when: no DB/KV
 * binding, no events, or nothing new. Never throws out (the caller waitUntils it).
 */
export async function maybeDistill(env: Env, userId: string, now: number): Promise<void> {
  if (!env.DB || !env.PROFILE_KV) return;

  const events = await getEvents(env.DB, userId); // newest first
  if (events.length === 0) return;
  const newestTs = events[0].ts;

  // Skip when no new events since the last distill (the cost guard).
  const existing = await env.PROFILE_KV.get(profileKey(userId));
  if (existing) {
    try {
      const prev = JSON.parse(existing) as Profile;
      if (prev.last_event_ts >= newestTs) return;
    } catch {
      /* corrupt blob → fall through and rebuild */
    }
  }

  let out: string;
  try {
    const cfg = resolveProvider("openrouter", env);
    out = await callChatModel(cfg, DISTILL_SYSTEM, buildUserMessage(events), {
      temperature: 0.3,
      maxTokens: 400,
      reasoning: "none",
    });
  } catch {
    return; // model/key down → keep the old profile, try again next session
  }

  const parsed = parseProfile(out);
  if (!parsed) return; // unusable output → don't overwrite a good profile with junk

  const profile: Profile = {
    interest_tags: parsed.interest_tags,
    summary: parsed.summary,
    last_event_ts: newestTs,
    distilled_at: now,
  };
  await env.PROFILE_KV.put(profileKey(userId), JSON.stringify(profile));
}

/** Delete the derived profile (the KV half of "Forget me", issue 08). */
export async function deleteProfile(env: Env, userId: string): Promise<void> {
  if (!env.PROFILE_KV) return;
  await env.PROFILE_KV.delete(profileKey(userId));
}

/** Read the current derived profile (null if none). Used by the read endpoint. */
export async function readProfile(env: Env, userId: string): Promise<Profile | null> {
  if (!env.PROFILE_KV) return null;
  const raw = await env.PROFILE_KV.get(profileKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}
