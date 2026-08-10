/**
 * Phase 0 probe — does an Indonesian question find the right Arabic hadith?
 *
 * The single unproven assumption the whole Tanya-agent plan rests on. Runs a bake-off across
 * multilingual embedding models via OpenRouter, using REAL questions from src/eval fixtures and a
 * stratified sample of the OKF hadith corpus.
 *
 * No Vectorize, no Worker, no deploy. Cosine similarity in memory. Output is a markdown report.
 */
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OKF = "/Users/erikgunawansupriatna/printing-press/library/tafseer-okf/okf";
const KEY = (() => {
  const line = readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("OPENROUTER_API_KEY="));
  if (!line) throw new Error("OPENROUTER_API_KEY not in .env");
  return line.slice("OPENROUTER_API_KEY=".length).trim();
})();

/**
 * Per-model prefix conventions. These are NOT optional decoration — e5 and qwen are trained with
 * asymmetric query/document markers and score near-randomly without them. Omitting them in the
 * first run handicapped both models and made bge-m3 (which needs none) look better than it is.
 * OpenRouter's embeddings API exposes no task_type/input_type, so the convention goes in the text.
 */
const MODELS: { id: string; q: string; d: string }[] = [
  { id: "baai/bge-m3", q: "", d: "" },
  { id: "intfloat/multilingual-e5-large", q: "query: ", d: "passage: " },
  {
    id: "qwen/qwen3-embedding-8b",
    q: "Instruct: Given a question in Indonesian, retrieve hadith passages that answer it\nQuery: ",
    d: "",
  },
  // No task_type available through OpenRouter — Gemini is tested in its default mode, which is a
  // real limitation of this harness and must be reported as such rather than read as model quality.
  { id: "google/gemini-embedding-2", q: "", d: "" },
];

/** Real questions, taken from src/eval/answer-cases.ts + the app's own feeling fixtures. */
const QUESTIONS: { id: string; q: string; want: string }[] = [
  { id: "debt-exhaustion", q: "aku capek banget sama utang", want: "debt / hardship / provision" },
  { id: "hardship", q: "aku udah gak kuat, semua terasa berat banget akhir-akhir ini", want: "patience / relief after hardship" },
  { id: "grief", q: "baru kehilangan ibu, rasanya kosong banget", want: "death / parents / consolation" },
  { id: "anxiety", q: "cemas terus tiap malam gabisa tidur mikirin banyak hal", want: "worry / remembrance / trust in God" },
  { id: "who-is-allah", q: "siapakah allah itu sebenarnya?", want: "tawhid / attributes of God" },
  { id: "rukun-iman", q: "apa itu iman dan apa saja rukun iman", want: "the famous Jibril hadith on iman" },
  { id: "riba", q: "apa itu riba dalam islam", want: "riba / usury" },
  { id: "dhuha", q: "berapa rakaat sholat dhuha yang benar?", want: "duha prayer rakaat" },
  { id: "music", q: "hukum mendengarkan musik dalam islam apa?", want: "music / instruments" },
  { id: "pacaran", q: "pacaran itu haram atau nggak?", want: "lowering the gaze / khalwa / zina" },
  { id: "sabar", q: "kasih aku ayat tentang sabar", want: "patience" },
  { id: "parents", q: "gimana cara berbakti sama orang tua", want: "birr al-walidayn" },
  { id: "forgiveness", q: "aku banyak dosa, apa masih bisa diampuni?", want: "repentance / mercy" },
  { id: "prayer-missed", q: "gimana hukumnya meninggalkan sholat?", want: "abandoning prayer" },
  { id: "charity", q: "sedekah kecil apa tetap dihitung?", want: "charity even small" },
];

interface Doc {
  id: string;
  ref: string;
  arabic: string;
  english: string;
  title: string;
}

/** Walk a directory tree, returning every .md file path. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

function parse(path: string): Doc | null {
  const raw = readFileSync(path, "utf8");
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) return null;
  const meta = Object.fromEntries(
    fm[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return i === -1 ? ["", ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
  );
  const body = fm[2];
  const ar = body.match(/## العربية\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() ?? "";
  const en = body.match(/## English\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() ?? "";
  if (!ar) return null;
  return {
    id: String(meta.id ?? path),
    ref: `${meta.collection ?? "?"} ${meta.hadith_number ?? "?"}`,
    arabic: ar,
    english: en,
    title: `${meta.book_en ?? ""} › ${meta.bab_en ?? ""}`.trim(),
  };
}

/** Text actually embedded — title + Arabic + English, the realistic production config. */
const embedText = (d: Doc) => `${d.title}\n${d.arabic}\n${d.english}`.slice(0, 4000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One batch, with retries. A 14k-document run WILL hit a dropped socket; that must not restart it. */
async function embedBatch(model: string, chunk: string[]): Promise<number[][]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: chunk }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`${res.status}`);
      if (!res.ok) throw new Error(`${model} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      return data.data.map((d) => d.embedding);
    } catch (e) {
      lastErr = e;
      await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s, 16s
    }
  }
  throw lastErr;
}

/**
 * Embed with an optional on-disk cache (JSONL, one {i, v} per line), so a crash resumes rather than
 * re-spending. Cache lives OUTSIDE the repo — this repo is public and vectors are bulky.
 */
async function embed(model: string, inputs: string[], cachePath?: string): Promise<number[][]> {
  const out: number[][] = new Array(inputs.length);
  let done = 0;
  if (cachePath && existsSync(cachePath)) {
    for (const line of readFileSync(cachePath, "utf8").split("\n")) {
      if (!line) continue;
      try {
        const { i, v } = JSON.parse(line) as { i: number; v: number[] };
        if (i < out.length) { out[i] = v; done++; }
      } catch { /* truncated final line from a kill — ignore */ }
    }
    process.stdout.write(`  cache: ${done}/${inputs.length} already embedded\n`);
  }

  const BATCH = 32;
  for (let i = 0; i < inputs.length; i += BATCH) {
    const idx = Array.from({ length: Math.min(BATCH, inputs.length - i) }, (_, k) => i + k).filter((k) => !out[k]);
    if (idx.length === 0) continue;
    const vecs = await embedBatch(model, idx.map((k) => inputs[k]));
    idx.forEach((k, n) => { out[k] = vecs[n]; });
    if (cachePath) appendFileSync(cachePath, idx.map((k, n) => JSON.stringify({ i: k, v: vecs[n] })).join("\n") + "\n");
    done += idx.length;
    process.stdout.write(`\r  ${model}: ${done}/${inputs.length}   `);
  }
  process.stdout.write("\n");
  return out;
}

const cosine = (a: number[], b: number[]): number => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

// ── run ───────────────────────────────────────────────────────────────────────

/** SAMPLE=0 → the entire corpus. ONLY=<slug> → run a single model (for the full-corpus winner run). */
const SAMPLE = Number(process.env.SAMPLE ?? 400);
const ONLY = process.env.ONLY;
if (ONLY) {
  const keep = MODELS.filter((m) => m.id === ONLY);
  MODELS.length = 0;
  MODELS.push(...keep);
}

console.log("Collecting OKF hadith…");
const all = [...walk(join(OKF, "hadith", "bukhari")), ...walk(join(OKF, "hadith", "muslim"))];
// Stratified: every Nth file, so the sample spreads across books/topics rather than clustering.
const stride = SAMPLE === 0 ? 1 : Math.max(1, Math.floor(all.length / SAMPLE));
const docs = (SAMPLE === 0 ? all : all.filter((_, i) => i % stride === 0).slice(0, SAMPLE)).map(parse).filter((d): d is Doc => d !== null);
console.log(`  ${all.length} total hadith, sampled ${docs.length}`);

const corpusText = docs.map(embedText);
const questionText = QUESTIONS.map((q) => q.q);

const results: Record<string, { ok: true; dims: number; hits: Record<string, { ref: string; score: number; title: string; english: string }[]> } | { ok: false; error: string }> = {};

for (const { id: model, q: qPrefix, d: dPrefix } of MODELS) {
  console.log(`\n${model}`);
  try {
    const qv = await embed(model, questionText.map((t) => qPrefix + t));
    const dv = await embed(model, corpusText.map((t) => dPrefix + t), process.env.CACHE);
    const hits: Record<string, { ref: string; score: number; title: string; english: string }[]> = {};
    QUESTIONS.forEach((q, qi) => {
      hits[q.id] = dv
        .map((v, di) => ({ di, score: cosine(qv[qi], v) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ di, score }) => ({
          ref: docs[di].ref,
          score,
          title: docs[di].title,
          english: docs[di].english.replace(/\s+/g, " ").slice(0, 220),
        }));
    });
    results[model] = { ok: true, dims: qv[0].length, hits };
  } catch (e) {
    console.log(`  FAILED: ${(e as Error).message}`);
    results[model] = { ok: false, error: (e as Error).message };
  }
}

// ── report ────────────────────────────────────────────────────────────────────

let md = `# Phase 0 probe — Indonesian question → Arabic hadith\n\n`;
md += `Corpus: ${docs.length} hadith sampled from ${all.length} (Bukhari + Muslim, stratified).\n`;
md += `Embedded text: book/bab title + Arabic + English. Cosine similarity, top 3.\n\n`;
md += `## Models\n\n| Model | Status | Dimensions |\n|---|---|---|\n`;
for (const { id: m } of MODELS) {
  const r = results[m];
  md += `| \`${m}\` | ${r.ok ? "ok" : "FAILED"} | ${r.ok ? r.dims : "—"} |\n`;
}
md += `\n${Object.values(results).some((r) => !r.ok) ? `Failures:\n\n` + MODELS.map((x) => x.id).filter((m) => !results[m].ok).map((m) => `- \`${m}\`: ${(results[m] as { error: string }).error}`).join("\n") + "\n\n" : ""}`;

for (const q of QUESTIONS) {
  md += `\n## "${q.q}"\n\n*Expected territory: ${q.want}*\n\n`;
  for (const { id: m } of MODELS) {
    const r = results[m];
    if (!r.ok) continue;
    md += `**\`${m}\`**\n\n`;
    for (const h of r.hits[q.id]) {
      md += `- \`${h.score.toFixed(3)}\` **${h.ref}** — ${h.title}\n  > ${h.english}\n`;
    }
    md += `\n`;
  }
}

await Bun.write(process.env.OUT ?? ".scratch/tanya-agent/phase-0-report.md", md);
console.log(`\nWrote .scratch/tanya-agent/phase-0-report.md`);
