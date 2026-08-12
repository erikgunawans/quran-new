#!/usr/bin/env bun
/**
 * Probe candidate questions for the landing's random-question generator.
 *
 * WHY THIS EXISTS. The generator hands a question straight to Tanya. Anything in its pool that
 * retrieves badly turns a failure the user used to have to TYPE into one the app OFFERS unprompted.
 * `apa hukum nikah siri` currently answers with QS 4:25 ("Nikahi budak perempuan dengan izin
 * tuannya") as its only entry — that is the shape of thing this probe exists to keep out of the pool.
 *
 * BOUNDARY DISCIPLINE. This calls the SAME two functions `main.ts` calls, in the same order:
 * `needsFamilyLawScholar(q)` first (a referral is an honest, acceptable outcome — the app says "ask
 * a scholar" rather than guessing), then `retrieve(corpus, q, 2, [])`. Probing some other
 * plausible-looking function is exactly how two PRDs got falsified in this repo; the boundary is
 * whatever main.ts actually reaches, not whatever looks like the answer.
 *
 * The one honest gap: main.ts may pass `modelThemes` from a live model when keyword themes miss.
 * This probe passes `[]`, which reproduces the app's own no-model fallback path — the floor, not
 * the ceiling. A question that passes here passes without model help; it cannot pass only BECAUSE
 * of help this probe did not give it.
 *
 *   bun run src/app/probe-ask-seeds.ts
 */
import { needsFamilyLawScholar, retrieve, type Corpus } from "../../web/src/retrieve.ts";
import { knowledgeOnly, looksFactual } from "../../web/src/question-form.ts";
import { retrieveKnowledge } from "../../web/src/knowledge.ts";
import { matchAqidah } from "../../web/src/aqidah.ts";
import { CANDIDATES } from "./ask-seed-candidates.ts";

// The knowledge lane reaches `fetch("/peta/index.json")` through peta-data.ts. In a bun script
// there is no server, so those fetches reject and `retrieveKnowledge` returns null for EVERY
// input — which reads as "the knowledge lane holds nothing" when it actually means "the probe
// could not see the knowledge lane at all". The first run of this script reported KNOWLEDGE 0
// across 30 factual questions for exactly that reason. Resolve root-relative URLs against
// web/public so the lane is measured rather than merely called.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/")) {
    const file = Bun.file(`web/public${decodeURI(url.split("?")[0]!)}`);
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(await file.arrayBuffer(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(input, init);
}) as typeof fetch;

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

type Verdict = "REFER" | "AQIDAH" | "KNOWLEDGE" | "FEELING" | "SILENT";
const rows: { q: string; verdict: Verdict; detail: string }[] = [];

/** Mirrors main.ts's branch ORDER exactly: referral → looksFactual ? (aqidah → knowledge) →
 *  feelings fall-through → the second knowledge pass that catches silence. Getting the order wrong
 *  is how you measure a lane the app never reaches for that input. */
for (const q of CANDIDATES) {
  if (needsFamilyLawScholar(q)) {
    rows.push({ q, verdict: "REFER", detail: "referred to a scholar by design" });
    continue;
  }

  let verdict: Verdict = "SILENT";
  let detail = "";

  if (looksFactual(q)) {
    const aq = matchAqidah(q);
    if (aq) {
      verdict = "AQIDAH";
      detail = aq.id;
    } else {
      const k = await retrieveKnowledge(q);
      if (k && k.entries.length > 0) {
        verdict = "KNOWLEDGE";
        detail = `${k.slug} (${k.entries.length} entri)`;
      } else if (knowledgeOnly(q)) {
        verdict = k ? "KNOWLEDGE" : "SILENT";
        detail = k ? `${k.slug} (POINTER ONLY, 0 entri)` : "knowledgeOnly and nothing held";
      }
    }
  }

  if (verdict === "SILENT") {
    const hits = retrieve(corpus, q, 2, []);
    if (hits.length) {
      verdict = "FEELING";
      detail = hits.map((h) => String((h as { ref?: string }).ref ?? "?")).join(", ");
    } else {
      const aq = matchAqidah(q);
      if (aq) {
        verdict = "AQIDAH";
        detail = aq.id;
      } else {
        const k = await retrieveKnowledge(q);
        if (k) {
          verdict = "KNOWLEDGE";
          detail = `${k.slug} (fallback pass)`;
        }
      }
    }
  }

  rows.push({ q, verdict, detail });
}

const by = (v: Verdict) => rows.filter((r) => r.verdict === v);
for (const r of rows) {
  console.log(`${r.verdict.padEnd(9)} | ${r.q}`);
  if (r.detail) console.log(`          └─ ${r.detail}`);
}
console.log(
  `\n${rows.length} probed — KNOWLEDGE ${by("KNOWLEDGE").length} · AQIDAH ${by("AQIDAH").length} · FEELING ${by("FEELING").length} · REFER ${by("REFER").length} · SILENT ${by("SILENT").length}`,
);
console.log("SILENT must NOT ship. POINTER ONLY is a topic pointer with no entries — read by eye.");
