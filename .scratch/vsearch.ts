#!/usr/bin/env bun
/**
 * Search the FULL Qur'an (6,236 ayahs) by Indonesian translation text.
 *
 * Exists so verse candidates are chosen from text ACTUALLY READ, never from recall. Searching
 * "dengki" surfaces 2:109 and 4:54 — historical envy toward the Prophet, a different subject from a
 * person feeling envious at 2am. Only reading the text catches that.
 *
 *   bun .scratch/vsearch.ts "iri|dengki"                 # regex over both renderings
 *   bun .scratch/vsearch.ts "sabar" --limit 30
 *   bun .scratch/vsearch.ts "menahan amarah" --full      # full text, not trimmed
 *   bun .scratch/vsearch.ts --ref 4:32                   # look up one ayah exactly
 */
const ROOT = "/Users/erikgunawansupriatna/quran-new";
interface Tr { ayah_id: string; text: string; display_role: "primary" | "companion" }

const raw = await Bun.file(`${ROOT}/data/canonical/translations.json`).json();
const trs: Tr[] = Array.isArray(raw) ? raw : (raw.translations ?? Object.values(raw)[0]);
const prim = new Map<string, string>(), comp = new Map<string, string>();
for (const t of trs) (t.display_role === "primary" ? prim : comp).set(t.ayah_id, t.text);

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
const FULL = has("--full");
const LIMIT = val("--limit") ? Number(val("--limit")) : 20;
const trim = (s: string, n = 200) => (FULL || s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

const refArg = val("--ref");
if (refArg) {
  const [s, a] = refArg.split(":");
  const id = `ayah:${Number(s)}:${Number(a)}`;
  if (!prim.has(id)) { console.error(`✗ ${refArg} does not exist`); process.exit(1); }
  console.log(`── ${refArg} ──\n[tafsiriyah] ${prim.get(id)}\n[kemenag]    ${comp.get(id)}`);
  process.exit(0);
}

const pattern = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--limit");
if (!pattern) { console.error('usage: vsearch.ts "<regex>" [--limit N] [--full] | --ref S:A'); process.exit(1); }

const re = new RegExp(pattern, "i");
const key = (id: string) => { const [, s, a] = id.split(":"); return Number(s) * 10000 + Number(a); };
const hits = [...prim.keys()].filter((id) => re.test(`${prim.get(id)} ${comp.get(id) ?? ""}`)).sort((a, b) => key(a) - key(b));

console.log(`${hits.length} ayah(s) match /${pattern}/i\n`);
for (const id of hits.slice(0, LIMIT)) {
  console.log(`── ${id.replace("ayah:", "")} ──`);
  console.log(`[tafsiriyah] ${trim(prim.get(id) ?? "")}`);
  if (FULL) console.log(`[kemenag]    ${trim(comp.get(id) ?? "")}`);
  console.log();
}
if (hits.length > LIMIT) console.log(`(+${hits.length - LIMIT} more — raise --limit)`);
