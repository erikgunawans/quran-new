/**
 * Dev-only entry for verifying hadith retrieval against the LIVE Vectorize index.
 *
 * Not deployed, not routed, not referenced by index.ts. It exists because "the vectors are in the
 * index" and "a question returns the right hadith" are different claims, and only the second one
 * matters. Run it with wrangler.dalil-probe.toml — see that file's header.
 */
import { capForDisplay, searchDalil, type DalilEnv } from "./dalil.ts";

export default {
  async fetch(request: Request, env: DalilEnv): Promise<Response> {
    const q = new URL(request.url).searchParams.get("q");
    if (!q) return new Response(JSON.stringify({ error: "pass ?q=" }), { status: 400 });

    try {
      const hits = await searchDalil(env, q);
      return new Response(
        JSON.stringify(
          {
            question: q,
            retrieved: hits.length,
            displayable: capForDisplay(hits).length,
            hits: hits.map((h) => ({
              id: h.id,
              score: Number(h.score.toFixed(4)),
              ref: `${h.collection} ${h.hadith_number}`,
              grade: h.grade,
              topic: `${h.book_en} › ${h.bab_en}`,
              rights: h.rights_usage,
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
