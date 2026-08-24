/**
 * The CITED floor (`ECHO_MIN_RUN_CITED = 6`) — the half of the echo wall that arms on an ayah the
 * PROSE named rather than one retrieval handed the turn.
 *
 * Every string here is either READ FROM THE SHIPPED CORPUS or is a real sentence recorded from live
 * prod prose on 2026-08-24 (`docs/review/echo-widening-2026-08-24-cycle15.md`). Prose we invent is a
 * vocabulary of one, and this repo has already shipped a guard whose whole test set was prose we
 * wrote.
 */
import { describe, expect, it } from "bun:test";
import { scriptureEchoShape } from "./answer-guard.ts";

const shipped = async (surah: number, ayah: number): Promise<string> => {
  const shard = (await Bun.file(`web/public/surah/${surah}.json`).json()) as {
    verses: { a: number; p?: { text?: string }; c?: { text?: string } }[];
  };
  const v = shard.verses.find((x) => x.a === ayah);
  const t = v?.p?.text ?? v?.c?.text;
  if (!t) throw new Error(`no shipped translation for ${surah}:${ayah}`);
  return t;
};

// The two live FALSE REFUSALS the run≥4 floor produced, verbatim from the 2026-08-24 probe.
const PACARAN =
  "Dalam Al-Qur'an, Allah mengajarkan kita tentang hubungan laki-laki dan perempuan dengan cara yang sangat indah dan penuh kemuliaan.";
const PEMIMPIN =
  "Yang bisa saya sampaikan: Al-Qur'an mengajarkan bahwa ukuran kemuliaan di sisi Allah adalah ketakwaan, bukan jenis kelamin (QS Al-Hujurat 49:13).";
// The live row the widening exists to catch: QS 66:6 at run 7, unquoted.
const NERAKA =
  "Allah berfirman dalam QS At-Tahrim 66:6 bahwa neraka itu bahan bakarnya adalah manusia dan batu, dan dijaga oleh malaikat yang keras dan tegas.";

describe("cited verses carry a higher floor than retrieved ones", () => {
  it("REFUSES the QS 66:6 row — run 7 clears the cited floor of 6", async () => {
    const text = await shipped(66, 6);
    expect(scriptureEchoShape(NERAKA, [{ ref: "66:6", texts: [text], origin: "cited" }])).not.toBeNull();
  });

  it("does NOT refuse `bolehkah perempuan jadi pemimpin` — run 4 is below the cited floor", async () => {
    const text = await shipped(49, 13);
    expect(scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text], origin: "cited" }])).toBeNull();
  });

  it("does NOT refuse `bolehkah aku pacaran` — run 4 is below the cited floor", async () => {
    const text = await shipped(24, 32);
    expect(scriptureEchoShape(PACARAN, [{ ref: "24:32", texts: [text], origin: "cited" }])).toBeNull();
  });

  /**
   * THE POINT OF THE WHOLE CHANGE, stated as a paired assertion rather than described: the SAME
   * prose against the SAME ayah flips on provenance alone. If these two ever agree, the two floors
   * have collapsed into one and the widening has either gone dead or gone unsafe.
   */
  it("flips on provenance alone — retrieved refuses at run 4 where cited does not", async () => {
    const text = await shipped(49, 13);
    expect(scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text], origin: "retrieved" }])).not.toBeNull();
    expect(scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text], origin: "cited" }])).toBeNull();
  });

  it("treats a verse with NO origin as retrieved — every pre-existing caller means that", async () => {
    const text = await shipped(49, 13);
    const implicit = scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text] }]);
    const explicit = scriptureEchoShape(PEMIMPIN, [{ ref: "49:13", texts: [text], origin: "retrieved" }]);
    expect(implicit).toEqual(explicit);
    expect(implicit).not.toBeNull();
  });

  it("applies each verse's OWN floor within one mixed set", async () => {
    const t49 = await shipped(49, 13);
    const t66 = await shipped(66, 6);
    // The pemimpin sentence runs 4 against 49:13 and nothing against 66:6. With 49:13 CITED and
    // 66:6 retrieved, no verse's floor is met, so a set containing a retrieved verse must not
    // silently re-impose the retrieved floor on the cited one.
    const mixed = scriptureEchoShape(PEMIMPIN, [
      { ref: "49:13", texts: [t49], origin: "cited" },
      { ref: "66:6", texts: [t66], origin: "retrieved" },
    ]);
    expect(mixed).toBeNull();
  });
});
