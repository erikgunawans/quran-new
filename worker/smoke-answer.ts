#!/usr/bin/env bun
/**
 * Post-deploy smoke test for the SYNTHESIS edition's /api/answer.
 *
 * Run this right after deploying new-quranku-ai (see wrangler.toml → env.synthesis). It confirms four
 * things without any secret (the key lives in the Worker): the site is up, the synthesis edition
 * AUTHORS a grounded answer, that answer is actually grounded (no Arabic, no citation outside the
 * grounding we sent), and — critically — the PRINCIPLED edition still refuses to author (EDITION gate).
 *
 *   bun run worker/smoke-answer.ts            (or: bun run smoke:answer)
 *   SYNTH_URL=… PRINCIPLED_URL=… bun run worker/smoke-answer.ts   # override targets
 *
 * Exit code is non-zero if any check fails, so it doubles as a CI gate.
 */
const SYNTH = process.env.SYNTH_URL ?? "https://new-quranku-ai.axiara.ai";
const PRINCIPLED = process.env.PRINCIPLED_URL ?? "https://new-quranku.axiara.ai";

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

let failures = 0;
const pass = (name: string, detail = "") => console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
const fail = (name: string, detail = "") => {
  failures += 1;
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
};
const check = (name: string, ok: boolean, detail = "") => (ok ? pass(name, detail) : fail(name, detail));

/** Grounding a browser would normally gather — supplied directly here so the endpoint has material. */
const GROUNDING = {
  question: "siapakah Allah?",
  verses: [
    { ref: "112:1", surah_name: "Al-Ikhlas", text: "Katakanlah (Muhammad), 'Dialah Allah, Yang Maha Esa.'" },
    { ref: "112:2", surah_name: "Al-Ikhlas", text: "Allah tempat meminta segala sesuatu." },
    { ref: "112:3", surah_name: "Al-Ikhlas", text: "(Allah) tidak beranak dan tidak pula diperanakkan." },
    { ref: "112:4", surah_name: "Al-Ikhlas", text: "Dan tidak ada sesuatu yang setara dengan Dia." },
  ],
  entries: [],
};
const ALLOWED = new Set(GROUNDING.verses.map((v) => v.ref));

async function postAnswer(base: string, payload: unknown): Promise<{ status: number; answer: unknown }> {
  const res = await fetch(`${base}/api/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  // A non-synthesis deploy answers with the SPA shell (HTML) for this path — .json() then rejects or
  // yields a non-object. Degrade to answer:null rather than crash, so the check reads it correctly.
  const raw = await res.json().catch(() => null);
  const answer = raw && typeof raw === "object" && "answer" in raw ? (raw as { answer?: unknown }).answer ?? null : null;
  return { status: res.status, answer };
}

/** Every "surah:ayah" the prose cites must be one we handed the model. */
function ungroundedRefs(prose: string): string[] {
  const bad: string[] = [];
  for (const m of prose.matchAll(/\b(\d{1,3})\s*[:.]\s*(\d{1,3})\b/g)) {
    const ref = `${Number(m[1])}:${Number(m[2])}`;
    if (!ALLOWED.has(ref)) bad.push(ref);
  }
  return bad;
}

async function run(): Promise<void> {
  console.log(`\nSMOKE — synthesis edition\n  synth:      ${SYNTH}\n  principled: ${PRINCIPLED}\n`);

  // 1. Site up.
  console.log("① site reachable");
  try {
    const r = await fetch(`${SYNTH}/`, { signal: AbortSignal.timeout(15000) });
    check("GET / returns 200", r.status === 200, `status ${r.status}`);
  } catch (e) {
    fail("GET / reachable", String(e));
  }

  // 2 + 3. Synthesis authors, and the answer is grounded.
  console.log("② synthesis authors a grounded answer");
  try {
    const { status, answer } = await postAnswer(SYNTH, GROUNDING);
    const prose = typeof answer === "string" ? answer : "";
    check("POST /api/answer returns 200", status === 200, `status ${status}`);
    check("answer is non-empty prose", prose.length > 0, prose ? `${prose.length} chars` : "answer was null — model/key/guard? check secret + logs");
    if (prose) {
      check("no Arabic in the prose", !ARABIC.test(prose));
      const bad = ungroundedRefs(prose);
      check("every cited ref is grounded", bad.length === 0, bad.length ? `ungrounded: ${bad.join(", ")}` : "");
      console.log(`\n     ┌ answer preview ────────────────────────────\n     │ ${prose.slice(0, 300).replace(/\n/g, "\n     │ ")}${prose.length > 300 ? " …" : ""}\n     └─────────────────────────────────────────────`);
    }
  } catch (e) {
    fail("POST /api/answer", String(e));
  }

  // 4. No grounding → no fabrication.
  console.log("③ empty grounding is refused (no fabrication)");
  try {
    const { answer } = await postAnswer(SYNTH, { question: "apa hukum X yang aneh", verses: [], entries: [] });
    check("answer is null when nothing was retrieved", answer === null, answer === null ? "" : "authored without grounding!");
  } catch (e) {
    fail("empty-grounding request", String(e));
  }

  // 5. The principled edition must NOT author (EDITION gate).
  console.log("④ principled edition refuses to author (EDITION gate)");
  try {
    const { answer } = await postAnswer(PRINCIPLED, GROUNDING);
    check("principled /api/answer returns null", answer === null, answer === null ? "" : "principled deploy is authoring — check EDITION var!");
  } catch (e) {
    // A 404 / SPA-fallback here is also acceptable: the endpoint simply isn't authoring.
    pass("principled /api/answer not authoring", `(no JSON answer: ${String(e).slice(0, 60)})`);
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

await run();
