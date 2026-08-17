#!/usr/bin/env bun
/**
 * Probe the HADITH GATE — how often `/api/answer` is even eligible to retrieve a hadith.
 *
 * WHY THIS EXISTS. The 2026-08-15 live run rendered ZERO hadith cards across seven questions and
 * left the cause UNDETERMINED: either the Worker's `entries.length > 0` gate never fired, or
 * retrieval fired and returned nothing. Those need different fixes, and guessing between them is
 * how a timeout constant gets raised for a problem that was never a timeout.
 *
 * BOUNDARY DISCIPLINE. This calls `gatherGrounding` — the SAME function whose return value becomes
 * the POST body of `/api/answer` (answer.ts:135 → answer-live.ts:74). It does not re-implement the
 * lane. What this probe reports about `entries` is literally what the Worker receives.
 *
 * WHAT IT CANNOT SEE. It stops at the gate. A question reported ELIGIBLE here may still return no
 * hadith because Vectorize retrieval came up empty — that half needs the live index (dalil-probe).
 * Read this as a CEILING on hadith turns, never as a count of them.
 *
 *   bun run src/app/probe-hadith-gate.ts
 */
import type { Corpus } from "../../web/src/retrieve.ts";
import { gatherGrounding } from "../../web/src/answer.ts";

// Root-relative fetches (the knowledge lane reaches /peta/*.json) have no server in a bun script and
// would reject, making every question report 0 entries — i.e. the probe would "confirm" the gate is
// shut by measuring nothing at all. Resolve them against web/public. Same shim as probe-ask-seeds.ts.
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

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

/**
 * The seven from the 2026-08-15 live run (reconstructed from the checkpoint's slugs), plus
 * knowledge-shaped questions whose truthful answer IS a hadith — the population this whole cycle
 * was built for.
 */
const QUESTIONS: readonly string[] = [
  // — the live-run seven —
  "aku lagi marah banget sama temanku",
  "bagaimana hukum utang piutang dalam islam",
  "apa hukum cerai dalam islam",
  "bagaimana islam memandang prasangka buruk",
  "apa hukum menafkahi orang tua",
  "bagaimana jika anak murtad",
  "apakah sedekah boleh diungkit ungkit",
  // — knowledge-shaped, hadith-answerable —
  "apa keutamaan menuntut ilmu",
  "bagaimana adab makan dalam islam",
  "apa hukum ghibah",
  "bagaimana cara berbakti kepada orang tua",
  "apa keutamaan shalat berjamaah",
  "bagaimana adab bertetangga",
  "apa hukum berbohong",
  "apa keutamaan bersedekah",
  "bagaimana adab menuntut ilmu",
  "apa hukum memutus silaturahmi",
  "bagaimana hukum menipu dalam jual beli",
  "apa keutamaan menahan marah",
];

type Row = { q: string; verses: number; entries: number; weak: boolean; eligible: boolean };
const rows: Row[] = [];

for (const q of QUESTIONS) {
  const g = await gatherGrounding(corpus, q, []);
  rows.push({
    q,
    verses: g.verses.length,
    entries: g.entries.length,
    weak: g.weakVerses,
    // The Worker's gate, verbatim: `(entries.length > 0 || weakVerses) && …bindings`. The second
    // half arrived with the 2026-08-17 cascade; a probe still reporting only the first would call
    // the very turns that cascade opened "gated", which is the reading this probe exists to prevent.
    eligible: g.entries.length > 0 || g.weakVerses,
  });
}

for (const r of rows) {
  const mark = r.eligible ? (r.entries > 0 ? "ELIGIBLE" : "WEAK-LANE") : "gated    ";
  console.log(
    `${mark.padEnd(9)} | verses ${String(r.verses).padStart(2)} · entries ${String(r.entries).padStart(2)} | ${r.q}`,
  );
}

const eligible = rows.filter((r) => r.eligible).length;
const weakOnly = rows.filter((r) => r.eligible && r.entries === 0).length;
const noVerses = rows.filter((r) => r.verses === 0).length;
console.log(
  `\n${rows.length} probed — ELIGIBLE for hadith ${eligible} (${weakOnly} via the WEAK-verse lane) · zero-verse turns ${noVerses} · gated ${rows.length - eligible}`,
);
console.log(
  "`entries` is populated ONLY when verses.length === 0 (answer.ts:98); the weak-verse lane is what lets a turn WITH verses still reach hadith.",
);
