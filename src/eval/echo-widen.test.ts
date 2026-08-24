/**
 * Can the widening scorer FIRE, and does it discriminate?
 *
 * A delta of zero from a safe widening and a delta of zero from a broken scorer print the same
 * number. This repo has already paid for that shape once — `eval:grounding` pinned the hadith
 * predicate to `() => false` and reported ~24% whether the rule was reverted or not. So the positive
 * control here is not decoration: it is the only reason a zero from `echo-widen` means anything.
 *
 * The verse text is READ FROM THE SHIPPED CORPUS, never pasted in. A hand-written ayah in a fixture
 * teaches the suite to expect whatever the author typed, and Arabic/Indonesian text written here can
 * byte-differ from the corpus while rendering identically.
 */
import { describe, expect, it } from "bun:test";
import { scoreWidening } from "./echo-widen.ts";

const shippedText = async (surah: number, ayah: number): Promise<string> => {
  const shard = (await Bun.file(`web/public/surah/${surah}.json`).json()) as {
    verses: { a: number; p?: { text?: string }; c?: { text?: string } }[];
  };
  const v = shard.verses.find((x) => x.a === ayah);
  const t = v?.p?.text ?? v?.c?.text;
  if (!t) throw new Error(`no shipped translation for ${surah}:${ayah}`);
  return t;
};

describe("echo-widen — the widening's blast radius, measured", () => {
  it("FIRES on prose that copies a CITED ayah retrieval never handed the turn", async () => {
    const text = await shippedText(66, 6);
    const r = await scoreWidening([
      { q: "positive control", prose: `Dalam QS At-Tahrim 66:6 disebutkan: ${text}`, verseRefs: [], bucket: "answered" },
    ]);
    // The control arm is inert by construction — zero verses, so the wall never ran.
    expect(r.controlRefusals).toBe(0);
    expect(r.treatmentRefusals).toBe(1);
    expect(r.added.length).toBe(1);
    expect(r.added[0]?.newRefs).toEqual(["66:6"]);
  });

  it("does NOT fire when the same wording carries no citation — the documented blind spot", async () => {
    const text = await shippedText(66, 6);
    const r = await scoreWidening([{ q: "uncited", prose: text, verseRefs: [], bucket: "answered" }]);
    // Nothing anchors it, so neither arm has a verse to compare against. A zero delta here is the
    // instrument's LIMIT, not a clean bill of health.
    expect(r.citedUnretrieved).toBe(0);
    expect(r.added.length).toBe(0);
  });

  it("does NOT fire when the answer CITES an ayah but describes it in its own words", async () => {
    const r = await scoreWidening([
      {
        q: "described, not copied",
        prose: "Dalam QS At-Tahrim 66:6 Allah memerintahkan setiap keluarga untuk saling menjaga.",
        verseRefs: [],
        bucket: "answered",
      },
    ]);
    // This is the case the widening must NOT destroy: describing an ayah is what the app is for.
    expect(r.citedUnretrieved).toBe(1);
    expect(r.added.length).toBe(0);
  });

  it("counts a cited ref we ship no translation for as unarmable rather than as reach", async () => {
    const r = await scoreWidening([
      { q: "bogus ref", prose: "Lihat QS 200:999 untuk penjelasannya.", verseRefs: [], bucket: "answered" },
    ]);
    expect(r.unresolvable).toBe(r.citedUnretrieved);
    expect(r.added.length).toBe(0);
  });
});
