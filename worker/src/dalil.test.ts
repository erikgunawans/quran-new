/**
 * Tests for the retrieval-failure classifier.
 *
 * WHY THIS IS TESTED AT ALL. The token it returns is the ONLY thing that will distinguish "retrieval
 * found nothing" from "retrieval died at stage X" on production traffic — `/api/answer` has no
 * logging by design, and the catch it feeds discarded the error entirely until 2026-08-15. A
 * classifier that silently mislabels a stage sends the next session to the wrong file with full
 * confidence, which is worse than the silence it replaced.
 */
import { describe, expect, it } from "bun:test";
import { classifyDalilFailure, publishedCardOf, type DisplayRecord } from "./dalil.ts";

describe("classifyDalilFailure", () => {
  it("names the stage for every message dalil.ts actually throws", () => {
    // These strings are copied from the throw sites, not invented. If a throw is reworded and this
    // test is not updated, the classifier starts reporting "unknown" for a stage it used to name —
    // which is exactly the drift the ordering comment in dalil.ts warns about.
    expect(classifyDalilFailure(new Error("OPENROUTER_API_KEY not configured"))).toBe("config");
    expect(classifyDalilFailure(new Error("CORPUS bucket not bound"))).toBe("config");
    expect(classifyDalilFailure(new Error("CORPUS_DIGEST not configured"))).toBe("config");
    expect(classifyDalilFailure(new Error("embeddings 401"))).toBe("embed");
    expect(classifyDalilFailure(new Error("empty embedding"))).toBe("embed");
    expect(classifyDalilFailure(new Error("rerank 429"))).toBe("rerank");
    expect(classifyDalilFailure(new Error("empty rerank result"))).toBe("rerank");
  });

  it("classifies the text-layer message as text-layer, though it CONTAINS the word rerank", () => {
    // The real message embeds the object key, which ends `rerank-en.json.gz`. Test the actual string.
    const real = new Error("text layer missing at text/8177e2e6e6c47370/rerank-en.json.gz");
    expect(classifyDalilFailure(real)).toBe("text-layer");
  });

  it("never echoes the failing object key back to the caller", () => {
    // The whole reason this returns a token instead of e.message: /api/answer is public, and the
    // text-layer throw carries the private bucket's key layout.
    const real = new Error("text layer missing at text/8177e2e6e6c47370/rerank-en.json.gz");
    const token = classifyDalilFailure(real);
    expect(token).not.toContain("8177e2e6e6c47370");
    expect(token).not.toContain("/");
    expect(token.length).toBeLessThan(20);
  });

  it("falls back to unknown rather than guessing a stage", () => {
    expect(classifyDalilFailure(new Error("Network connection lost"))).toBe("unknown");
    expect(classifyDalilFailure(new Error(""))).toBe("unknown");
  });

  it("survives a non-Error throw", () => {
    // Workers can reject with things that are not Errors; `e.message` on those is undefined and an
    // unguarded read would throw INSIDE the catch, turning a degraded turn into a 500.
    expect(classifyDalilFailure("some string")).toBe("unknown");
    expect(classifyDalilFailure(null)).toBe("unknown");
    expect(classifyDalilFailure(undefined)).toBe("unknown");
    expect(classifyDalilFailure({ weird: true })).toBe("unknown");
  });
});

/**
 * Tests for the retrieval TIMELINE — that the text layer overlaps the embedding rather than queuing
 * behind it.
 *
 * WHY A TEST AND NOT A COMMENT. The overlap is invisible in the shape of the code: `textsPromise` is
 * created a few lines above an `await` that has nothing to do with it, and any future edit that
 * moves the creation down to its use site — which reads BETTER, right next to `const texts = await`
 * — silently restores the serial version. Nothing would fail, no output would change, and the only
 * evidence would be a latency number nobody re-measures. So the ordering is asserted directly.
 *
 * These force-red against the old code: with `loadRerankTexts` called at its use site, `r2:start`
 * lands after `embed:end` and the first assertion fails.
 */
import { searchDalil, type DalilTimings } from "./dalil.ts";

const gzipJson = async (value: unknown): Promise<ArrayBuffer> => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Response(bytes).body!.pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
};

/** A candidate as Vectorize hands it back — only the fields `searchDalil` reads off metadata. */
const match = (id: string) => ({
  id,
  score: 0.5,
  metadata: {
    path: "hadith/bukhari/038.json",
    collection: "Sahih al-Bukhari",
    hadith_number: 2201,
    grade: "sahih",
    book_en: "Loans",
    bab_en: "Payment of Loans",
    source_url: "https://sunnah.com/bukhari:2201",
    rights_usage: "public",
  },
});

/**
 * Build an env plus a stubbed global `fetch`, both writing into one ordered event log.
 *
 * `embedHeld` holds the embedding response open until released, which is what makes the ordering
 * question decidable at all: if the R2 read were queued behind the embedding, it COULD NOT have
 * started while the embedding is still in flight.
 */
function harness(opts: { embedFails?: boolean; r2Fails?: boolean } = {}) {
  const log: string[] = [];
  let releaseEmbed: () => void = () => {};
  const embedHeld = new Promise<void>((resolve) => {
    releaseEmbed = resolve;
  });

  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes("/embeddings")) {
      log.push("embed:start");
      await embedHeld;
      log.push("embed:end");
      if (opts.embedFails) return new Response("nope", { status: 401 });
      return Response.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    }
    if (href.includes("/rerank")) {
      log.push("rerank");
      return Response.json({ results: [{ index: 0, relevance_score: 0.9 }] });
    }
    throw new Error(`unexpected fetch ${href}`);
  }) as typeof fetch;

  const env = {
    OPENROUTER_API_KEY: "k",
    CORPUS_DIGEST: "8177e2e6e6c47370",
    VECTORIZE: {
      query: async () => {
        log.push("vectorize");
        return { matches: [match("hadith-bukhari-2201")] };
      },
    },
    CORPUS: {
      get: async (key: string) => {
        log.push("r2:start");
        if (opts.r2Fails) return null;
        const body = await gzipJson({ "hadith-bukhari-2201": "A debt shall be repaid." });
        log.push("r2:end");
        return { arrayBuffer: async () => body, json: async () => ({}), key };
      },
    },
  };

  return { log, env, releaseEmbed, restore: () => (globalThis.fetch = realFetch) };
}

describe("searchDalil timeline", () => {
  it("starts the R2 text-layer read BEFORE the embedding resolves", async () => {
    const h = harness();
    try {
      const running = searchDalil(h.env as never, "bagaimana hukum utang piutang dalam islam");
      // Let the embed request register and the R2 read get its chance to start, with the embedding
      // still deliberately unresolved.
      await new Promise((r) => setTimeout(r, 20));
      expect(h.log).toContain("embed:start");
      // THE CLAIM: R2 is already moving while the embedding is still in flight.
      expect(h.log).toContain("r2:start");
      expect(h.log).not.toContain("embed:end");

      h.releaseEmbed();
      await running;
      expect(h.log.indexOf("r2:start")).toBeLessThan(h.log.indexOf("embed:end"));
    } finally {
      h.restore();
    }
  });

  it("still reports the EARLIEST stage when both embed and the text layer fail", async () => {
    // The overlap means the text layer can now fail while the embedding is still in flight. The
    // stage token must keep naming embed — the failure a reader hits first — and the text-layer
    // rejection must not escape as an unhandled rejection in the meantime.
    const h = harness({ embedFails: true, r2Fails: true });
    try {
      const running = searchDalil(h.env as never, "q");
      await new Promise((r) => setTimeout(r, 20));
      h.releaseEmbed();
      // AWAITED. An un-awaited `.rejects` is the classic vacuous assertion — it happens to be
      // surfaced by Bun 1.3.11 today, but resting on a runtime's un-awaited-rejection handling is
      // exactly how a test that can never fail gets written.
      await expect(running).rejects.toThrow(/embeddings 401/);
    } finally {
      h.restore();
    }
  });

  it("fills the timings sink with every stage it ran", async () => {
    const h = harness();
    const timings: DalilTimings = {};
    try {
      const running = searchDalil(h.env as never, "q", undefined, timings);
      h.releaseEmbed();
      await running;
      // Presence, not magnitude — a duration assertion would be a flaky clock test. What matters is
      // that a stage which ran is never silently absent from the diagnostic.
      for (const stage of ["embed", "vectorize", "text_layer", "rerank"] as const) {
        expect(typeof timings[stage]).toBe("number");
      }
    } finally {
      h.restore();
    }
  });

  it("leaves retrieval unchanged when no timings sink is passed", async () => {
    // `searchDalil` is called without timings by the smoke script and by every existing caller; the
    // optional sink must not change what retrieval returns.
    const h = harness();
    try {
      const running = searchDalil(h.env as never, "q");
      h.releaseEmbed();
      const hits = await running;
      expect(hits).toHaveLength(1);
      expect(hits[0]!.id).toBe("hadith-bukhari-2201");
    } finally {
      h.restore();
    }
  });
});

/**
 * THE RIGHTS WALL FOR THE ANSWER CARD — `publishedCardOf`.
 *
 * `/api/answer` returned `DisplayRecord` objects RAW in its `hadith:` array. `DisplayRecord` carries
 * `english` (sunnah.com's narration, whose terms are "private research use") and `translator` (the
 * Darussalam / Muhsin Khan credit). Erik withdrew both from publication on 2026-08-20, and the fix
 * that shipped removed them from the RENDERER — the evidence recorded for it was a grep of the
 * served client bundle, which could not have seen this, because the leak is in the Worker's
 * response. A curl-able public endpoint serving the narration is publication by the same argument
 * that retired the rendered element. `bab_en` — sunnah.com's English chapter title — was withdrawn
 * on Erik's ruling of 2026-08-20 (late) and is out for the same reason one level up.
 *
 * The `/api/dalil` route had this wall on HALF of its response — `referenceLineOf` guards `refs`,
 * an exact-SET test pins it, and `cards` was a raw spread that published everything. The answer
 * card had no wall at all. Both go through this projection now; the first draft of this comment
 * said the other endpoint was "already" walled, which was the stale-assertion shape one more time.
 * This is the same discipline on both routes, and
 * the assertion is deliberately on the SET: a denylist ("no english") passes for every field nobody
 * has thought of yet, which is exactly the leak it exists to stop.
 */
describe("publishedCardOf — the rights wall for the answer card", () => {
  const record = (): DisplayRecord & { book: number } => ({
    id: "hadith-bukhari-2201",
    arabic: "نص عربي",
    english: "English narration body.",
    collection: "Sahih al-Bukhari",
    hadith_number: 2201,
    grade: "sahih",
    book_en: "Loans",
    bab_en: "Payment of Loans",
    source_url: "https://sunnah.com/bukhari:2201",
    translator: "Muhsin Khan",
    book: 38,
  });

  /**
   * The keys a reader is permitted to receive for a hadith the app IS showing them.
   *
   * `book` IS ON THIS LIST AND MUST STAY. It is not a `DisplayRecord` field — `index.ts` grafts it
   * on from the corpus path specifically so the client can find the machine-Indonesian shard
   * (ISC-449). The first draft of this wall dropped it, and because `main.ts` bails on `!h.book`,
   * that silently deleted the Indonesian from EVERY answer card — leaving Arabic alone on a card
   * whose whole reason for carrying Indonesian is that most readers cannot read the Arabic. It is
   * also the one thing Erik explicitly ruled to KEEP in the same breath as withdrawing `bab_en`.
   * The exact-SET assertion below pinned that defect as correct for one commit.
   *
   * `book_en` was withdrawn 2026-08-20 (late) on Erik's ruling, one level up from `bab_en`.
   */
  const PERMITTED = ["id", "arabic", "collection", "hadith_number", "grade", "source_url", "book"] as const;

  it("carries no key beyond the permitted set", () => {
    expect(Object.keys(publishedCardOf(record())).sort()).toEqual([...PERMITTED].sort());
  });

  it("drops the English narration and its translator credit, on the wire as well as in the object", () => {
    const card = publishedCardOf(record()) as unknown as Record<string, unknown>;
    expect(card.english).toBeUndefined();
    expect(card.translator).toBeUndefined();
    const wire = JSON.stringify(card);
    expect(wire).not.toContain("English narration body.");
    expect(wire).not.toContain("Muhsin Khan");
  });

  it("drops bab_en and book_en, both withdrawn 2026-08-20 (late)", () => {
    const card = publishedCardOf(record()) as unknown as Record<string, unknown>;
    expect(card.bab_en).toBeUndefined();
    expect(card.book_en).toBeUndefined();
    const wire = JSON.stringify(card);
    expect(wire).not.toContain("Payment of Loans");
    expect(wire).not.toContain("Loans");
  });

  /**
   * THE CONSEQUENCE, NAMED. Asserting `book` is on the permitted SET says nothing about WHY, and a
   * set assertion is exactly what pinned its absence as correct for one commit. `web/src/main.ts`
   * bails on `!h.book` before it will even attempt the shard lookup, so a card without it renders
   * the Arabic and nothing else — to a reader who, by assumption, cannot read the Arabic.
   */
  it("carries `book`, without which the client cannot resolve the machine Indonesian at all", () => {
    const card = publishedCardOf(record());
    expect(card.book).toBe(38);
    // The exact predicate `main.ts` uses before it attempts the lookup. If this ever reads true,
    // the Indonesian is gone from every answer card and no other test in the repo notices.
    const c = card as unknown as Record<string, unknown>;
    expect(Boolean(c.reviewed_id || !card.book || !card.collection)).toBe(false);
  });

  /**
   * The Arabic STAYS. It is the sourced artifact and the only text on the card whose provenance is
   * not a machine translation; withdrawing it would leave a hadith card with no hadith on it.
   */
  it("keeps the Arabic and everything an attribution line needs", () => {
    const card = publishedCardOf(record());
    expect(card.arabic).toBe("نص عربي");
    expect(card.id).toBe("hadith-bukhari-2201");
    expect(card.collection).toBe("Sahih al-Bukhari");
    expect(card.hadith_number).toBe(2201);
    expect(card.grade).toBe("sahih");
    expect(card.source_url).toBe("https://sunnah.com/bukhari:2201");
  });
});
