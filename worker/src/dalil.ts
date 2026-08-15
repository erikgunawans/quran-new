/**
 * Hadith retrieval over the OKF corpus — the `cari_dalil` capability.
 *
 * Three stages: embed the question with bge-m3, pull a WIDE candidate window from the `okf-hadith`
 * Vectorize index, then rerank those candidates on their English body text and keep the best few.
 *
 * FOUR RULES THAT ARE NOT NEGOTIABLE HERE:
 *
 * 1. THE DISPLAY CAP IS ENFORCED IN CODE, NOT IN A PROMPT. sunnah.com's terms permit per-hadith
 *    didactic display with attribution and forbid mass reproduction of collections. So retrieval may
 *    range over all 14,736 records, but `MAX_DISPLAY` of them may ever reach a reader. A prompt is a
 *    request; this is a wall.
 *
 * 2. SIMILARITY SCORE IS NOT A CONFIDENCE SIGNAL. Measured in Phase 0 and re-measured on 2026-08-10:
 *    right and wrong hits share the same cosine band, and the rerank scores do not separate them
 *    either — a correct hit scored 0.3551 on one question while a wrong hit scored 0.3682 on
 *    another. No threshold, on either score, may be used to gate trust. Downstream safety comes from
 *    the marker protocol and the answer guard, never from a number produced here.
 *
 * 3. THE CANDIDATE WINDOW IS THE WHOLE POINT, AND IT IS WHY THIS STAGE EXISTS.
 *    The Phase 0 false friend was diagnosed wrongly. "gimana hukumnya meninggalkan sholat" returned
 *    "To leave or depart from the right and from the left after finishing the Salat" — but the
 *    CORRECT record (Sahih Muslim 154, "Clarifying the usage of the word Kafir for one who abandons
 *    Salat") sits at cosine RANK 28 of 14,736. It was never in the old top-8 at all, so this was a
 *    RECALL failure, not a ranking failure, and a reranker over 8 candidates could not have fixed it
 *    under any model. Widening to `CANDIDATE_K` is what makes the truth reachable; the reranker is
 *    what finds it in there. Narrowing `CANDIDATE_K` back down silently reintroduces the bug.
 *
 * 4. THE RERANKER READS THE HADITH BODY, NOT THE CITATION LINE. Also measured: reranking on
 *    `collection · book › bab` alone does NOT fix the case — inside a 50-candidate window most of
 *    the bab titles are prayer-related, and the discriminating information is in the body. Reranking
 *    on the English body puts Muslim 154 at rank 1. The body comes from the private R2 text layer
 *    (`build-text-layer.ts`), never from Vectorize, which still carries no scripture.
 *
 * FAILURE IS LOUD ON PURPOSE. Every stage throws rather than degrading quietly. If embedding, the
 * text layer or the reranker is unavailable, hadith grounding goes dark for that turn and the caller
 * falls back to the Qur'an path — which is the principled behaviour. Silently serving cosine order
 * would restore exactly the defect this file exists to remove.
 */

export interface DalilHit {
  /** Frontmatter id, e.g. "hadith-bukhari-6962" — the marker the answer guard validates against. */
  id: string;
  /** Cosine score from the retrieval stage. Logging only. NOT a correctness signal — see rule 2. */
  score: number;
  /** Reranker relevance. Also NOT a correctness signal, and not comparable across questions. */
  rerank_score: number;
  path: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
  rights_usage: string;
}

/**
 * How many candidates the reranker gets to look at. NOT a tuning knob — see rule 3. The correct
 * record for the canonical regression case sits at rank 28, so anything below ~40 reintroduces a
 * known, named, reproducible failure.
 */
export const CANDIDATE_K = 50;
/** Retrieval breadth after reranking — what the model may reason over. */
export const MAX_RETRIEVE = 8;
/**
 * Display cap — what a reader may ever be shown in one answer. Decision 1 of the Tanya agent PRD,
 * resting on sunnah.com About §8 (per-entry didactic use, no mass reproduction).
 */
export const MAX_DISPLAY = 2;

const EMBED_MODEL = "baai/bge-m3";
/**
 * Bake-off, 2026-08-10, 8 Indonesian questions over the full corpus at K=50 with body text:
 * voyageai/rerank-2.5 7/8 and fixes the regression case; cohere/rerank-v3.5 6/8 and does not.
 * cohere additionally scored 5/8 on citation-surface documents — WORSE than no reranker at all.
 */
const RERANK_MODEL = "voyageai/rerank-2.5";

interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, string | number>;
}
interface VectorizeIndex {
  query(vector: number[], opts: { topK: number; returnMetadata: string }): Promise<{ matches: VectorizeMatch[] }>;
}
interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  json<T>(): Promise<T>;
}
interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface DalilEnv {
  VECTORIZE: VectorizeIndex;
  /** Private bucket holding the text layer. Never public, never mirrored into git. */
  CORPUS?: R2Bucket;
  /** First 16 hex of the manifest's corpus_digest — namespaces the text layer to a corpus revision. */
  CORPUS_DIGEST?: string;
  OPENROUTER_API_KEY?: string;
}

/** Embed one question. Throws on failure — the caller degrades to the principled path, never guesses. */
export async function embedQuestion(question: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: [question] }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  const v = data.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length === 0) throw new Error("empty embedding");
  return v;
}

/**
 * The rerank corpus: id → English body, ~1.8 MB gzipped for all 14,736 records.
 *
 * Held at module scope so an isolate fetches it once and reuses it, rather than issuing one
 * subrequest per candidate on every question. It is MACHINE-ONLY — nothing in this module renders
 * it, and the reader-facing text comes from `fetchDisplayRecords`, which is capped.
 */
let rerankTexts: Record<string, string> | null = null;

async function loadRerankTexts(env: DalilEnv): Promise<Record<string, string>> {
  if (rerankTexts) return rerankTexts;
  if (!env.CORPUS) throw new Error("CORPUS bucket not bound");
  if (!env.CORPUS_DIGEST) throw new Error("CORPUS_DIGEST not configured");

  const key = `text/${env.CORPUS_DIGEST}/rerank-en.json.gz`;
  const obj = await env.CORPUS.get(key);
  if (!obj) throw new Error(`text layer missing at ${key}`);

  // Stored gzipped; R2 hands back the raw bytes, so decompress here rather than relying on any
  // transport-level negotiation.
  const stream = new Response(await obj.arrayBuffer()).body!.pipeThrough(new DecompressionStream("gzip"));
  rerankTexts = (await new Response(stream).json()) as Record<string, string>;
  return rerankTexts;
}

/**
 * Rerank candidates on their English body.
 *
 * Callers must have already dropped candidates absent from `texts` — see the RETRIEVABLE ≡
 * DISPLAYABLE note in `searchDalil`.
 */
async function rerank(
  apiKey: string,
  question: string,
  candidates: DalilHit[],
  texts: Record<string, string>,
): Promise<DalilHit[]> {
  const documents = candidates.map(
    (h) => `${h.collection} ${h.hadith_number}. ${h.book_en} › ${h.bab_en}\n${texts[h.id]}`,
  );

  const res = await fetch("https://openrouter.ai/api/v1/rerank", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: RERANK_MODEL, query: question, documents, top_n: MAX_RETRIEVE }),
  });
  if (!res.ok) throw new Error(`rerank ${res.status}`);

  const { results } = (await res.json()) as { results: { index: number; relevance_score: number }[] };
  if (!Array.isArray(results) || results.length === 0) throw new Error("empty rerank result");

  return results
    .map((r) => {
      const hit = candidates[r.index];
      return hit ? { ...hit, rerank_score: r.relevance_score } : null;
    })
    .filter((h): h is DalilHit => h !== null);
}

const str = (m: Record<string, string | number> | undefined, k: string): string => String(m?.[k] ?? "");
const num = (m: Record<string, string | number> | undefined, k: string): number => Number(m?.[k] ?? 0);

/**
 * Per-stage wall-clock for one retrieval, in milliseconds. Optional sink — retrieval behaves
 * identically whether or not a caller passes one.
 *
 * THREE THINGS THAT MAKE THESE NUMBERS EASY TO MISREAD, all deliberate:
 *
 * 1. **They do not sum to the total.** The text layer is STARTED before `embed` and awaited after
 *    `vectorize`, so the stages overlap and adding them up over-counts. The total is measured by the
 *    caller, around the whole call — that is the only number the 12,000 ms client abort cares about.
 * 2. **`text_layer` is a RESIDUAL, not a cost.** It is what the blob still makes us wait AFTER embed
 *    and Vectorize have already run, which is the latency question. It is NOT how long the blob
 *    takes. A `text_layer: 0` means the overlap fully absorbed it, not that the fetch was free —
 *    reading it the second way is how a future session would "prove" the blob is cheap and then
 *    delete the overlap that made it look that way.
 * 3. **A span containing no I/O reads 0.** Workers freeze the clock between I/O operations as a
 *    Spectre mitigation, so `text_layer` covers its R2 fetch but UNDER-REPORTS the gunzip and
 *    `JSON.parse` behind it — measured 99-140 ms of pure CPU on a dev laptop for the 6.5 MB parse,
 *    and that time is real on the isolate even though this number will not show it. The SAME caveat
 *    binds `display` and `total`, which the caller measures with the same clock: `total` can
 *    under-report client-visible latency, so it is a floor on what the reader waited, not the figure.
 * 4. **A stage that did not RUN is absent; it never reads 0.** `timed` writes only in its `finally`,
 *    so an absent key means "did not reach this stage". One asymmetry that follows from the overlap
 *    and is worth knowing: an embed failure leaves `text_layer` ABSENT even though the R2 GET was
 *    already dispatched and may have spent real time and CPU before the turn died. The report
 *    under-describes that turn on purpose — attributing time to a stage nothing awaited would be
 *    worse than saying nothing.
 */
export interface DalilTimings {
  embed?: number;
  vectorize?: number;
  text_layer?: number;
  rerank?: number;
}

/**
 * Wall-clock one stage into `sink[key]`, without changing what it resolves to or throws.
 *
 * Takes a THUNK, not a promise. Passing `timed(sink, k, work())` would evaluate the call first, so
 * the stage would run up to its first `await` before `t0` was ever read — and, worse, a stage that
 * threw SYNCHRONOUSLY would never reach this function at all and would be silently absent from the
 * report rather than recorded. The thunk puts both inside the measured span.
 */
async function timed<T>(sink: DalilTimings | undefined, key: keyof DalilTimings, work: () => Promise<T>): Promise<T> {
  if (!sink) return work();
  const t0 = Date.now();
  try {
    return await work();
  } finally {
    sink[key] = Date.now() - t0;
  }
}

/**
 * Search the hadith corpus for one question.
 *
 * Returns up to MAX_RETRIEVE reranked hits for the model to reason over. Callers that intend to SHOW
 * hadith must go through `capForDisplay` and `fetchDisplayRecords` — retrieval breadth and display
 * breadth are different numbers on purpose.
 */
export async function searchDalil(
  env: DalilEnv,
  question: string,
  candidateK = CANDIDATE_K,
  timings?: DalilTimings,
): Promise<DalilHit[]> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  // THE TEXT LAYER DOES NOT DEPEND ON THE EMBEDDING, and used to wait for it anyway. Started here it
  // overlaps a 1.8 MB R2 GET plus a 6.5 MB gunzip+parse against two network round-trips, which is
  // free on a warm isolate (module-cached) and is the whole cold-start cost on a cold one. Ordering
  // was the only thing making it serial — nothing below reads `texts` before both have landed.
  //
  // The bare `.catch` marks the rejection HANDLED so a text-layer failure cannot surface as an
  // unhandled rejection while we are still awaiting embed. It does not swallow it: `textsPromise`
  // itself still rejects, and still re-throws at the `await` below, so `classifyDalilFailure` sees
  // the same "text layer missing" it always did. It must be attached in the SAME synchronous turn as
  // the call, because the config paths of `loadRerankTexts` return an ALREADY-rejected promise and
  // V8 fires `unhandledrejection` at the end of the microtask checkpoint.
  //
  // WHICH FAILURE GETS REPORTED, stated precisely because it changed. An embed failure still wins
  // over a text-layer failure — but the reason is now that embed is awaited FIRST, not that it
  // happened first. Post-overlap the text layer can fail hundreds of ms EARLIER in wall-clock and
  // still lose the report. Under the old serial code those two orderings were the same thing, so
  // "the earliest failure" used to be a true description and is no longer one. The stage token
  // reports the first stage we AWAIT.
  const textsPromise = loadRerankTexts(env);
  void textsPromise.catch(() => {});

  const vector = await timed(timings, "embed", () => embedQuestion(question, apiKey));
  const { matches } = await timed(timings, "vectorize", () =>
    env.VECTORIZE.query(vector, { topK: candidateK, returnMetadata: "all" }),
  );

  const candidates = matches
    // Defence in depth: `private` records are already excluded at build time, so this filter should
    // never fire. It exists because a rights failure must require TWO mistakes, not one.
    .filter((m) => str(m.metadata, "rights_usage") !== "private")
    .map((m) => ({
      id: m.id,
      score: m.score,
      rerank_score: 0,
      path: str(m.metadata, "path"),
      collection: str(m.metadata, "collection"),
      hadith_number: num(m.metadata, "hadith_number"),
      grade: str(m.metadata, "grade"),
      book_en: str(m.metadata, "book_en"),
      bab_en: str(m.metadata, "bab_en"),
      source_url: str(m.metadata, "source_url"),
      rights_usage: str(m.metadata, "rights_usage"),
    }));

  // The prefetched R2 GET is left UNAWAITED on this path — it is cancelled when the request context
  // ends, and the bare `.catch` above absorbs the rejection. That is a deliberate trade, not an
  // oversight: moving the prefetch below this return would restore the serial ordering the overlap
  // exists to remove, to save one Class B op on a path that barely occurs. Barely, because a topK=50
  // query over 14,736 populated vectors always matches; the reachable trigger is an EMPTY or
  // mid-rebuild index, where bindings resolve but no vector does. Nothing regressed either way — the
  // old code never called `loadRerankTexts` here, so this turn reported `failed:null` then and
  // reports `failed:null` now.
  if (candidates.length === 0) return [];

  const texts = await timed(timings, "text_layer", () => textsPromise);

  // RETRIEVABLE ≡ DISPLAYABLE. A candidate with no body in the text layer is one the display path
  // cannot render — the upstream corpus has one such record, Arabic with no English. Left in, the
  // model could cite it by marker, the marker would resolve against this turn's grounding, the
  // answer guard would pass it, and the renderer would then drop the card: a prophetic attribution
  // with nothing behind it, which is the exact failure `bad_hadith` exists to prevent. The text
  // layer already excludes these; this is the second of the two mistakes a leak would require.
  const groundable = candidates.filter((h) => typeof texts[h.id] === "string" && texts[h.id]!.length > 0);
  if (groundable.length === 0) return [];

  // Thunked like the rest — `rerank` concatenates up to 50 document bodies before its first `await`,
  // and that work belongs inside the measured span rather than ahead of it.
  return timed(timings, "rerank", () => rerank(apiKey, question, groundable, texts));
}

/** The rights wall. Whatever the model asked for, this is what a reader may see. */
export const capForDisplay = (hits: DalilHit[]): DalilHit[] => hits.slice(0, MAX_DISPLAY);

/** Where retrieval died, at the coarsest granularity that still tells us what to go fix. */
export type DalilFailure = "config" | "embed" | "text-layer" | "rerank" | "vectorize" | "unknown";

/**
 * Classify a retrieval failure into a STABLE, NON-REVEALING token.
 *
 * WHY NOT THE RAW MESSAGE. `/api/answer` is a public endpoint, and one of these throws is
 * `text layer missing at text/<digest>/rerank-en.json.gz` — echoing it would publish the private
 * bucket's key layout to anyone who asks a question. The tokens below carry everything a fix needs
 * ("which stage") and nothing an attacker does ("which path, which key, which status").
 *
 * ORDER MATTERS: the text-layer message CONTAINS the substring "rerank-en", so it must be tested
 * before any rerank rule. The rerank rule is anchored too, but relying on only one of those two
 * defences is how this would quietly start misreporting after an unrelated message edit.
 */
export function classifyDalilFailure(e: unknown): DalilFailure {
  const m = e instanceof Error ? e.message : String(e);
  if (/not configured|not bound/i.test(m)) return "config";
  if (/^embeddings \d|empty embedding/i.test(m)) return "embed";
  if (/text layer missing/i.test(m)) return "text-layer";
  if (/^rerank \d|empty rerank/i.test(m)) return "rerank";
  // Last, and deliberately loose: Vectorize errors come from the platform and have no shape we
  // control. Anything still unmatched stays "unknown" rather than being forced into a bucket — a
  // wrong stage name is worse than no stage name, because it sends the next session to the wrong file.
  if (/vectorize/i.test(m)) return "vectorize";
  return "unknown";
}

/** A hadith as a reader sees it: source text verbatim, plus everything an attribution line needs. */
export interface DisplayRecord {
  id: string;
  arabic: string;
  english: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
  translator: string;
}

/** `hadith/bukhari/010/060/0683.md` → `bukhari/010` — the display shard holding that record. */
const shardKey = (path: string): string => {
  const parts = path.split("/");
  return `${parts[1]}/${parts[2]}`;
};

/**
 * Fetch the reader-facing text for hits that have already passed the display cap.
 *
 * Re-applies `capForDisplay` rather than trusting the caller. The cap is the rights position of the
 * whole feature; a wall that only holds when called correctly is not a wall. Records missing from
 * the text layer are dropped — an unciteable hadith is not shown at all.
 */
export async function fetchDisplayRecords(env: DalilEnv, hits: DalilHit[]): Promise<DisplayRecord[]> {
  if (!env.CORPUS || !env.CORPUS_DIGEST) throw new Error("CORPUS bucket not bound");
  const capped = capForDisplay(hits);

  const shards = new Map<string, Promise<Record<string, DisplayRecord> | null>>();
  for (const hit of capped) {
    const key = shardKey(hit.path);
    if (!shards.has(key)) {
      shards.set(
        key,
        env.CORPUS.get(`text/${env.CORPUS_DIGEST}/display/${key}.json`).then((o) =>
          o ? o.json<Record<string, DisplayRecord>>() : null,
        ),
      );
    }
  }

  const out: DisplayRecord[] = [];
  for (const hit of capped) {
    const shard = await shards.get(shardKey(hit.path))!;
    const rec = shard?.[hit.id];
    if (rec) out.push(rec);
  }
  return out;
}
