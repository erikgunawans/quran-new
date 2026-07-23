import { describe, expect, test } from "bun:test";
import { needsFamilyLawScholar, retrieve, type Corpus } from "./retrieve.ts";

/**
 * The nafkah referral, as a property.
 *
 * The failure that motivated this: "suami saya ga ngasih nafkah, saya harus bagaimana?" is a matter
 * of hak & kewajiban — fiqh, not feeling. The word "suami" hit the broad `Family` theme, which
 * surfaced 17:23 (honouring PARENTS) under an answer that itself said the verse did not fit. The
 * scholar KB holds no real answer either (its one nafkah line, 65:6, is a pregnant divorcée's
 * maintenance). So the honest move is a pointer to a human ustadz — a `refer` turn, decided in the
 * orchestrator before the feeling and KB lanes ever run.
 *
 * These pin the DETECTOR (retrieve.ts) and the underlying reason it must fire in the orchestrator:
 * retrieve() itself is deliberately unchanged, so it STILL returns the mismatched 17:23 — which is
 * exactly why the gate cannot live inside it.
 */
const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

describe("needsFamilyLawScholar — fires on a marital rights/obligation question", () => {
  const REFERS = [
    "suami saya ga ngasih nafkah, saya harus bagaimana?",
    "suami tidak menafkahi saya harus gimana",
    "gimana kalau suami ga kasih nafkah",
    "istri minta nafkah tapi ga dikasih, langkah apa yang harus diambil",
    // Ruling-framed rights questions — no plain action word, but still a rights matter. These slipped
    // through to a mismatched verse/KB card before the frame was widened (adversarial review 2026-07-23).
    "suami tidak memberi nafkah, boleh minta cerai?",
    "suami ga nafkahin aku, bolehkah aku menolak?",
    "hak istri kalau tidak dinafkahi apa?",
    "suami tidak kasih nafkah, hukumnya apa?",
    "suami tidak menafkahi, apa hak saya?",
  ];
  for (const q of REFERS) test(q, () => expect(needsFamilyLawScholar(q)).toBe(true));
});

describe("needsFamilyLawScholar — stays out of the feeling and definition lanes", () => {
  const KEEPS = [
    // A bare definition belongs to the scholar's Indeks Tematik, not a human-ustadz deferral.
    "apa itu nafkah",
    "nafkah itu apa sih",
    // EARNING sense of nafkah — livelihood hardship, not marital rights. A tired breadwinner must get
    // the feeling lane, never a family-law deferral (the false positive adversarial review caught).
    "aku capek cari nafkah, gimana biar tenang?",
    "aku sedih nafkahku seret, harus kuat gimana?",
    "nafkah lagi susah, aku harus sabar bagaimana?",
    // No nafkah at all — these are feelings/other topics and must reach their own lanes untouched.
    "aku sedih banget hari ini",
    "suami ku selingkuh, aku harus gimana",
    "capek ngurus anak sendirian",
    "lagi banyak utang stress",
  ];
  for (const q of KEEPS) test(q, () => expect(needsFamilyLawScholar(q)).toBe(false));
});

test("the reason the gate lives in the orchestrator: raw retrieve() still mismatches to 17:23", () => {
  // retrieve() is untouched on purpose — "suami" still qualifies the Family-tagged parents verse.
  // The orchestrator short-circuits to `refer` BEFORE calling this, so a reader never sees it; but
  // if the gate were ever removed, this is the tone-deaf card that would come back.
  const hits = retrieve(corpus, "suami saya ga ngasih nafkah, saya harus bagaimana?", 2);
  expect(hits.some((h) => h.verse.ref === "17:23")).toBe(true);
});
