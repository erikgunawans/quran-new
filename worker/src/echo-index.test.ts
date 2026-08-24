/**
 * The ref→text index and the verse argument it builds (ISC-419's cited half).
 *
 * TWO THINGS ARE UNDER TEST and they fail in different ways:
 *   · `loadEchoIndex` / `parseEchoIndex` — can it tell a real index from the SPA fallback, which is
 *     `index.html` at **200**, not a 404. A status check alone passes that and would load nothing.
 *   · `echoVersesFor` — does the RETRIEVED half survive the move into this seam, and does the CITED
 *     half arm only on anchors retrieval did not hand the turn.
 *
 * The retrieved half is asserted behaviourally on purpose. `answer-guard-echo.test.ts` pins the call
 * site by source slice, and a source slice cannot see whether the mapping inside the seam still
 * exists — this repo has shipped a green grep over a deleted usage before.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import {
  ECHO_INDEX_URL,
  MAX_CITED_ECHO_VERSES,
  echoVersesFor,
  loadEchoIndex,
  parseEchoIndex,
  resetEchoIndexCache,
} from "./echo-index.ts";
import { allowedRefsFrom, refsInProse, scriptureEchoShape } from "../../web/src/answer-guard.ts";

/** The real fallback body, as Cloudflare's asset handler serves it for a missing asset. */
const SPA_SHELL = '<!doctype html><html><head><title>QuranKu</title></head><body><div id="app"></div></body></html>';

const assetsServing = (
  body: string,
  status = 200,
  contentType = "application/json",
): { fetch: (r: Request) => Promise<Response> } => ({
  fetch: async () => new Response(body, { status, headers: { "content-type": contentType } }),
});

beforeEach(() => resetEchoIndexCache());

describe("parseEchoIndex — telling an index from everything that is not one", () => {
  test("a well-formed index loads", () => {
    const m = parseEchoIndex({ count: 2, texts: { "66:6": "neraka", "2:261": "biji" } });
    expect(m?.get("66:6")).toBe("neraka");
    expect(m?.size).toBe(2);
  });

  test("the SPA shell parsed as JSON is not an index", () => {
    // It never reaches here in prod — `JSON.parse` throws on HTML first — but the shape check must
    // not be the only thing standing between a 200 and a loaded wall.
    expect(parseEchoIndex(SPA_SHELL)).toBeNull();
  });

  test("an EMPTY index is refused rather than loaded", () => {
    // A zero-entry Map is a switched-off wall wearing the face of a loaded one.
    expect(parseEchoIndex({ count: 0, texts: {} })).toBeNull();
  });

  test("an array, a null, and a missing `texts` are all refused", () => {
    expect(parseEchoIndex({ texts: [] })).toBeNull();
    expect(parseEchoIndex({ texts: null })).toBeNull();
    expect(parseEchoIndex({ count: 3 })).toBeNull();
    expect(parseEchoIndex(null)).toBeNull();
  });

  test("non-string entries are dropped, not coerced", () => {
    const m = parseEchoIndex({ texts: { "1:1": "ok", "1:2": 7, "1:3": "" } });
    expect([...(m ?? new Map()).keys()]).toEqual(["1:1"]);
  });
});

describe("loadEchoIndex — the SPA fallback is a 200, so `res.ok` proves nothing", () => {
  test("the shell served at 200 loads NOTHING", async () => {
    const got = await loadEchoIndex(assetsServing(SPA_SHELL, 200, "text/html"));
    expect(got).toBeNull();
  });

  test("a real index at 200 loads", async () => {
    const got = await loadEchoIndex(assetsServing(JSON.stringify({ count: 1, texts: { "66:6": "neraka" } })));
    expect(got?.get("66:6")).toBe("neraka");
  });

  test("it asks for the asset once per isolate, not once per turn", async () => {
    let calls = 0;
    const assets = {
      fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify({ count: 1, texts: { "1:1": "x" } }));
      },
    };
    await loadEchoIndex(assets);
    await loadEchoIndex(assets);
    await loadEchoIndex(assets);
    expect(calls).toBe(1);
  });

  test("a STRUCTURAL absence is remembered; a THROWN fetch is retried", async () => {
    // The distinction is the whole reason failure caching is conditional. A deployment without the
    // asset will never grow one mid-isolate; a fetch that threw may succeed on the next turn.
    let calls = 0;
    const missing = {
      fetch: async () => {
        calls += 1;
        return new Response("nope", { status: 404 });
      },
    };
    expect(await loadEchoIndex(missing)).toBeNull();
    expect(await loadEchoIndex(missing)).toBeNull();
    expect(calls).toBe(1);

    resetEchoIndexCache();
    let thrown = 0;
    const flaky = {
      fetch: async (): Promise<Response> => {
        thrown += 1;
        throw new Error("network");
      },
    };
    expect(await loadEchoIndex(flaky)).toBeNull();
    expect(await loadEchoIndex(flaky)).toBeNull();
    expect(thrown).toBe(2);
  });

  test("an unbound ASSETS binding is null, never a throw", async () => {
    expect(await loadEchoIndex(undefined)).toBeNull();
  });

  test("it asks for the index by name", async () => {
    let asked = "";
    await loadEchoIndex({
      fetch: async (r: Request) => {
        asked = r.url;
        return new Response(JSON.stringify({ texts: { "1:1": "x" } }));
      },
    });
    expect(asked).toBe(ECHO_INDEX_URL);
  });
});

describe("echoVersesFor — the retrieved half must survive the move into this seam", () => {
  const retrieved = [{ ref: "2:261", text: "perumpamaan sedekah seperti sebutir biji" }];
  const allowed = allowedRefsFrom(retrieved.map((v) => v.ref));

  test("every retrieved verse is passed through as one text, with NO origin", () => {
    const out = echoVersesFor("apa pun", retrieved, null, refsInProse, allowed);
    // `origin` absent, not `"retrieved"` — `floorFor` treats them identically and the retrieved arm
    // must stay byte-for-byte what prod has shipped.
    expect(out).toEqual([{ ref: "2:261", texts: ["perumpamaan sedekah seperti sebutir biji"] }]);
  });

  test("a null index leaves the argument exactly as it was before this change", () => {
    const prose = "Dalam QS At-Tahrim 66:6 disebutkan sesuatu.";
    expect(echoVersesFor(prose, retrieved, null, refsInProse, allowed)).toEqual([
      { ref: "2:261", texts: ["perumpamaan sedekah seperti sebutir biji"] },
    ]);
  });

  test("a cited, UNRETRIEVED ayah is appended and carries origin:cited", () => {
    const index = new Map([["66:6", "bahan bakarnya adalah manusia dan batu"]]);
    const out = echoVersesFor("Lihat QS 66:6.", retrieved, index, refsInProse, allowed);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ ref: "66:6", texts: ["bahan bakarnya adalah manusia dan batu"], origin: "cited" });
  });

  test("an ayah the turn WAS grounded on is not re-armed at the cited floor", () => {
    // Otherwise a retrieved verse the prose also cites would silently move from floor 4 to floor 6 —
    // a weakening dressed as a widening.
    const index = new Map([["2:261", "perumpamaan sedekah seperti sebutir biji"]]);
    const out = echoVersesFor("Lihat QS 2:261.", retrieved, index, refsInProse, allowed);
    expect(out).toHaveLength(1);
    expect(out[0]?.origin).toBeUndefined();
  });

  test("a cited ref the index cannot resolve is skipped, not faked", () => {
    const out = echoVersesFor("Lihat QS 99:99.", retrieved, new Map([["66:6", "x"]]), refsInProse, allowed);
    expect(out).toHaveLength(1);
  });

  test("the cap bounds the cited half, and keeps the anchors the prose leads with", () => {
    const index = new Map<string, string>();
    const refs: string[] = [];
    for (let i = 1; i <= MAX_CITED_ECHO_VERSES + 5; i += 1) {
      index.set(`3:${i}`, `teks ${i}`);
      refs.push(`QS 3:${i}`);
    }
    const out = echoVersesFor(refs.join(" dan "), [], index, refsInProse, allowedRefsFrom([]));
    expect(out).toHaveLength(MAX_CITED_ECHO_VERSES);
    expect(out[0]?.ref).toBe("3:1");
    expect(out.at(-1)?.ref).toBe(`3:${MAX_CITED_ECHO_VERSES}`);
  });
});

describe("end to end against the REAL wall — the located QS 66:6 shape", () => {
  /**
   * Every string here is READ FROM THE SHIPPED CORPUS or is live prod prose recorded on 2026-08-24
   * (`docs/review/echo-widening-2026-08-24-cycle15.md`), reused verbatim from
   * `web/src/answer-guard-echo-cited.test.ts`. Prose we invent is a vocabulary of one — an earlier
   * draft of this very file invented a QS 49:13 sentence, and its invented wording ran SIX and
   * "proved" a false refusal the real sentence does not produce.
   */
  const NERAKA =
    "Allah berfirman dalam QS At-Tahrim 66:6 bahwa neraka itu bahan bakarnya adalah manusia dan batu, dan dijaga oleh malaikat yang keras dan tegas.";
  const PEMIMPIN =
    "Yang bisa saya sampaikan: Al-Qur'an mengajarkan bahwa ukuran kemuliaan di sisi Allah adalah ketakwaan, bukan jenis kelamin (QS Al-Hujurat 49:13).";

  const shipped = async (surah: number, ayah: number): Promise<string> => {
    const shard = (await Bun.file(`web/public/surah/${surah}.json`).json()) as {
      verses: { a: number; p?: { text?: string }; c?: { text?: string } }[];
    };
    const t = shard.verses.find((x) => x.a === ayah);
    const text = t?.p?.text ?? t?.c?.text;
    if (!text) throw new Error(`no shipped translation for ${surah}:${ayah}`);
    return text;
  };

  test("with NO retrieval and no index, the wall is inert — the state that shipped it", () => {
    const inert = echoVersesFor(NERAKA, [], null, refsInProse, allowedRefsFrom([]));
    expect(inert).toHaveLength(0);
    expect(scriptureEchoShape(NERAKA, inert)).toBeNull();
  });

  test("with the index, the cited anchor arms the wall and it fires", async () => {
    const index = new Map([["66:6", await shipped(66, 6)]]);
    const verses = echoVersesFor(NERAKA, [], index, refsInProse, allowedRefsFrom([]));
    expect(verses).toEqual([{ ref: "66:6", texts: [await shipped(66, 6)], origin: "cited" }]);
    expect(scriptureEchoShape(NERAKA, verses)).not.toBeNull();
  });

  /**
   * THE COST THE CITED FLOOR EXISTS TO AVOID. Row 4 of the same measurement: `bolehkah perempuan
   * jadi pemimpin`, refused at the retrieved floor of 4 on the generic run `di sisi allah adalah`.
   * The ISA names it as an answer a hard egress rule must not destroy. Assembled here through the
   * real seam, not by hand-writing `origin: "cited"` — the wiring is what is under test.
   */
  test("the answer the cited floor exists to protect survives the wiring", async () => {
    const index = new Map([["49:13", await shipped(49, 13)]]);
    const verses = echoVersesFor(PEMIMPIN, [], index, refsInProse, allowedRefsFrom([]));
    expect(verses[0]?.origin).toBe("cited");
    expect(scriptureEchoShape(PEMIMPIN, verses)).toBeNull();
  });

  /**
   * THE MUTATION. Same prose, same text, marked as RETRIEVED instead — floor 4 — and it refuses.
   * Without this the test above passes for a wall that never ran at all, which is the reading this
   * project has shipped before.
   */
  test("...and it is the FLOOR doing that, not an inert wall", async () => {
    const text = await shipped(49, 13);
    expect(scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text] }])).not.toBeNull();
  });
});
