/**
 * Dev-only entry for verifying hadith retrieval against the LIVE Vectorize index.
 *
 * Not deployed, not routed, not referenced by index.ts. It exists because "the vectors are in the
 * index" and "a question returns the right hadith" are different claims, and only the second one
 * matters. Run it with wrangler.dalil-probe.toml — see that file's header.
 */
import { capForDisplay, embedQuestion, fetchDisplayRecords, searchDalil, type DalilEnv } from "./dalil.ts";

export default {
  async fetch(request: Request, env: DalilEnv): Promise<Response> {

    /**
     * ISC-323.2 — paired scoring arms, run INSIDE the Worker runtime.
     *
     * `wrangler vectorize query` shows the live candidate set differing from an offline exhaustive
     * cosine over the same vectors, and shows that difference vanishing when `--return-values` is
     * passed. The CLI is not the production client, so it cannot answer whether the Worker BINDING
     * behaves the same way. This route asks the binding directly: same query vector, same topK,
     * one arm with `returnValues` and one without, reported side by side.
     */
    if (new URL(request.url).pathname === "/scoring") {
      const question = new URL(request.url).searchParams.get("q") ?? "gimana hukumnya meninggalkan sholat";
      const target = new URL(request.url).searchParams.get("id") ?? "hadith-muslim-154";
      const topK = Number(new URL(request.url).searchParams.get("k") ?? 50);
      const vector = await embedQuestion(question, env.OPENROUTER_API_KEY ?? "");
      // The shipped VECTORIZE interface deliberately does not declare `returnValues`; widening it
      // would change a production type to run a dev experiment. Cast here instead, in the dev-only file.
      const idx = env.VECTORIZE as unknown as {
        query(v: number[], o: Record<string, unknown>): Promise<{ matches: { id: string; score: number }[] }>;
      };
      // Serial, not Promise.all: the point is the per-arm cost, and concurrent arms hide it.
      const t0 = Date.now();
      const plain = await idx.query(vector, { topK, returnMetadata: "none" });
      const t1 = Date.now();
      const exact = await idx.query(vector, { topK, returnMetadata: "none", returnValues: true });
      const t2 = Date.now();
      const summarise = (m: { id: string; score: number }[]) => ({
        n: m.length,
        low: Number(Math.min(...m.map((x) => x.score)).toFixed(4)),
        high: Number(Math.max(...m.map((x) => x.score)).toFixed(4)),
        target_rank: m.findIndex((x) => x.id === target) + 1 || null,
        top8: m.slice(0, 8).map((x) => x.id),
      });
      let samePos = 0;
      for (let i = 0; i < Math.min(plain.matches.length, exact.matches.length); i++) {
        if (plain.matches[i]?.id === exact.matches[i]?.id) samePos++;
      }
      return new Response(
        JSON.stringify({ question, target, topK, ms: { plain: t1 - t0, exact: t2 - t1 }, plain: summarise(plain.matches), exact: summarise(exact.matches), identical_positions: samePos }, null, 2),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    /**
     * ISC-500..507 — does the exact-scored candidate pool survive the RERANKER?
     *
     * `/scoring` answered a question about the POOL: with `returnValues: true`, `hadith-muslim-154`
     * enters the top-50 at rank 24 instead of being absent. That is not the reader's experience, and
     * this repo's own rule says a ranking result that names a record proves nothing about what the
     * reader gets. `voyageai/rerank-2.5` runs after the pool is built and reorders it completely, so
     * rank 24 could become rank 1 or could be cut — nobody has looked.
     *
     * BOTH ARMS, ONE REQUEST, ONE QUESTION. The plain arm is the CONTROL and it is not optional:
     * this repo has twice shipped a false diagnosis off an unpaired single-shot turn. Serial rather
     * than concurrent so the per-arm cost stays readable, and through the REAL `searchDalil` rather
     * than a reimplementation, so what is measured is the production function with one flag flipped.
     */
    if (new URL(request.url).pathname === "/rerank") {
      const url = new URL(request.url);
      const question = url.searchParams.get("q") ?? "gimana hukumnya meninggalkan sholat";
      const target = url.searchParams.get("id") ?? "hadith-muslim-154";
      const arm = async (exactScores: boolean) => {
        const t = Date.now();
        const hits = await searchDalil(env, question, undefined, undefined, { exactScores });
        return {
          ms: Date.now() - t,
          retrieved: hits.length,
          // Rank AFTER the reranker — the only rank that describes what a reader could be shown.
          target_rank_after_rerank: hits.findIndex((h) => h.id === target) + 1 || null,
          // Displayable is capped at MAX_DISPLAY, so "reached the pool" and "reached the reader" differ.
          target_within_display_cap: capForDisplay(hits).some((h) => h.id === target),
          // Scores beside ranks: a rank alone hides whether the record barely made it or dominated.
          hits: hits.map((h, i) => ({
            rank: i + 1,
            id: h.id,
            cosine: Number(h.score.toFixed(4)),
            rerank: Number(h.rerank_score.toFixed(4)),
            ref: `${h.collection} ${h.hadith_number}`,
          })),
        };
      };
      const plain = await arm(false);
      const exact = await arm(true);
      return new Response(
        JSON.stringify(
          {
            question,
            target,
            note: "plain = production today (control arm); exact = returnValues:true. Ranks are POST-rerank.",
            plain,
            exact,
            verdict: {
              target_reached_rank_1_in_exact: exact.target_rank_after_rerank === 1,
              target_reached_rank_1_in_plain: plain.target_rank_after_rerank === 1,
              exact_cost_ms: exact.ms - plain.ms,
            },
          },
          null,
          2,
        ),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const q = new URL(request.url).searchParams.get("q");
    if (!q) return new Response(JSON.stringify({ error: "pass ?q=" }), { status: 400 });

    try {
      const hits = await searchDalil(env, q);
      const cards = await fetchDisplayRecords(env, hits);
      return new Response(
        JSON.stringify(
          {
            question: q,
            retrieved: hits.length,
            displayable: capForDisplay(hits).length,
            hits: hits.map((h) => ({
              id: h.id,
              cosine: Number(h.score.toFixed(4)),
              rerank: Number(h.rerank_score.toFixed(4)),
              ref: `${h.collection} ${h.hadith_number}`,
              grade: h.grade,
              topic: `${h.book_en} › ${h.bab_en}`,
              rights: h.rights_usage,
            })),
            // Proves the display path end to end: text is reachable, capped, and attributed.
            cards: cards.map((c) => ({
              id: c.id,
              ref: `${c.collection} ${c.hadith_number}`,
              grade: c.grade,
              arabic_chars: c.arabic.length,
              english_chars: c.english.length,
              source_url: c.source_url,
              translator: c.translator,
            })),
          },
          null,
          2,
        ),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
  },
};
