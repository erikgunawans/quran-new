#!/usr/bin/env bun
/**
 * Probe the KNOWLEDGE lane for thinness, to size the third tafsir tier from data.
 *
 * WHY THIS EXISTS. The third tier fires "when tiers 1-2 come back thin". *Thin* is a threshold, and
 * a threshold picked by taste is how this repo has twice built the wrong thing (see the tanya-hukum
 * PRD, falsified in both halves). So before any tier-3 code: measure what the knowledge lane
 * actually returns for hukum-shaped questions — how many entries, and whether it hands us a
 * RESOLVABLE ayah reference at all.
 *
 * The last question is the one that decides the design. Tier 3 orients an ayah we already have; it
 * cannot invent one. A knowledge answer with no resolvable ref has nothing for tier 3 to orient,
 * and silence stays correct there.
 *
 * BOUNDARY DISCIPLINE. Calls `retrieveKnowledge(q)` — the same function `main.ts:540` calls, behind
 * the same `looksFactual` gate. Probing a routing function instead of the answer is exactly how the
 * two earlier PRDs were falsified.
 *
 *   bun run src/app/probe-tafsir-tier.ts
 */
import { retrieveKnowledge } from "../../web/src/knowledge.ts";
import { looksFactual } from "../../web/src/question-form.ts";
import { needsFamilyLawScholar } from "../../web/src/retrieve.ts";

// Same shim as probe-ask-seeds.ts, and for the same reason: `retrieveKnowledge` reaches
// `fetch("/peta/index.json")`, a bun script has no server, and every call would reject and return
// null — which reads as "the lane is empty" when it means "the probe never saw the lane".
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/")) {
    const file = Bun.file(`web/public${decodeURI(url.split("?")[0]!)}`);
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(await file.arrayBuffer(), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return realFetch(input, init);
}) as typeof fetch;

/** Hukum-shaped and definitional questions — the shapes that reach the knowledge lane at all. */
const QUESTIONS = [
  "hukum warisan di islam",
  "apa hukum riba",
  "hukum zakat fitrah",
  "apa itu zakat",
  "hukum puasa ramadhan",
  "apa hukum sholat jumat",
  "hukum aurat wanita",
  "apa hukum talak",
  "hukum makan babi",
  "apa hukum berbohong",
  "hukum ghibah",
  "apa itu sabar",
  "hukum menyembelih hewan",
  "apa hukum judi",
  "hukum minum khamr",
  "apa itu taubat",
  "hukum berbakti kepada orang tua",
  "apa hukum mencuri",
  "hukum membunuh",
  "apa itu rezeki",
  "pacaran itu haram atau nggak",
  "apa hukum nikah siri",
];

type Row = {
  q: string;
  gate: string;
  slug: string;
  entries: number;
  total: number;
  leadRef: string;
  resolvable: boolean;
  hasTafsir: boolean;
};

const rows: Row[] = [];

for (const q of QUESTIONS) {
  if (needsFamilyLawScholar(q)) {
    rows.push({ q, gate: "REFER", slug: "-", entries: -1, total: -1, leadRef: "-", resolvable: false, hasTafsir: false });
    continue;
  }
  if (!looksFactual(q)) {
    rows.push({ q, gate: "not-factual", slug: "-", entries: -1, total: -1, leadRef: "-", resolvable: false, hasTafsir: false });
    continue;
  }
  const k = await retrieveKnowledge(q);
  if (!k) {
    rows.push({ q, gate: "null", slug: "-", entries: -1, total: -1, leadRef: "-", resolvable: false, hasTafsir: false });
    continue;
  }
  // The FIRST resolvable entry is what tier 3 would orient — a ref the index cites but the mushaf
  // does not carry is shown and cited, never linked, and cannot be loaded.
  const lead = k.entries.find((e) => e.resolvable);
  const hasTafsir = lead ? await Bun.file(`web/public/tafsir/${lead.surah}/${lead.ayah}.json`).exists() : false;
  rows.push({
    q,
    gate: "KNOWLEDGE",
    slug: k.slug,
    entries: k.entries.length,
    total: k.totalEntries,
    leadRef: lead?.ref ?? "-",
    resolvable: Boolean(lead),
    hasTafsir,
  });
}

const pad = (s: string, n: number) => s.padEnd(n);
console.log(pad("question", 34), pad("gate", 12), pad("slug", 24), pad("entri", 6), pad("lead", 9), "tafsir");
console.log("-".repeat(100));
for (const r of rows) {
  console.log(
    pad(r.q, 34),
    pad(r.gate, 12),
    pad(r.slug, 24),
    pad(r.entries < 0 ? "-" : `${r.entries}/${r.total}`, 6),
    pad(r.leadRef, 9),
    r.gate === "KNOWLEDGE" ? (r.hasTafsir ? "yes" : "NO") : "-",
  );
}

const known = rows.filter((r) => r.gate === "KNOWLEDGE");
const dist = new Map<number, number>();
for (const r of known) dist.set(r.entries, (dist.get(r.entries) ?? 0) + 1);
console.log(
  `\n${rows.length} probed — KNOWLEDGE ${known.length} · REFER ${rows.filter((r) => r.gate === "REFER").length} · ` +
    `not-factual ${rows.filter((r) => r.gate === "not-factual").length} · null ${rows.filter((r) => r.gate === "null").length}`,
);
console.log("entry-count distribution:", [...dist].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}→${c}`).join(" "));
console.log("with a resolvable lead ref:", known.filter((r) => r.resolvable).length, "of", known.length);
console.log("lead ref has a tafsir shard:", known.filter((r) => r.hasTafsir).length, "of", known.filter((r) => r.resolvable).length);
