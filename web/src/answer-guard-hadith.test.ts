/**
 * The `bad_hadith` rule — PRD decision 8.
 *
 * Kept separate from answer-guard.test.ts because it tests a different failure than the other three
 * rules do. The fabrication this rule exists for is NOT a wrong hadith number: it is an attribution
 * to the Prophet ﷺ carrying no number at all — invisible to `arabic` (no Arabic script), invisible
 * to `bad_ref` (no verse reference), and fluent enough to be believed.
 */
import { describe, expect, test } from "bun:test";
import {
  allowedRefsFrom,
  groundedHadithFrom,
  guardAnswerProse,
  markersInProse,
  markerToId,
  safeAnswer,
} from "./answer-guard.ts";

const allow = (...refs: string[]) => allowedRefsFrom(refs);
const grounded = (...ids: string[]) => groundedHadithFrom(ids);

describe("prophetic attribution needs a resolvable marker", () => {
  test("an attribution with no marker at all is rejected", () => {
    const r = guardAnswerProse("Rasulullah bersabda bahwa senyum itu sedekah.", allow(), grounded());
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("bad_hadith");
  });

  test("the same attribution passes when a marker resolves against this turn's grounding", () => {
    const prose = "Nabi ﷺ pernah mengingatkan bahwa meninggalkan sholat itu perkara berat. [H:muslim:154]";
    expect(guardAnswerProse(prose, allow(), grounded("hadith-muslim-154")).ok).toBe(true);
  });

  test("a marker resolving to a hadith NOT retrieved this turn is rejected", () => {
    const prose = "Nabi ﷺ bersabda demikian. [H:bukhari:6962]";
    const r = guardAnswerProse(prose, allow(), grounded("hadith-muslim-154"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "bad_hadith")).toBe(true);
  });

  test("an invented marker is rejected even with no attribution grammar around it", () => {
    const r = guardAnswerProse("Ada juga riwayat lain. [H:bukhari:99999]", allow(), grounded("hadith-muslim-154"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "bad_hadith")).toBe(true);
  });

  // Same discipline as the fatwa rule: a receipt in one sentence does not cover the next.
  test("one resolvable marker does not license a later unmarked attribution", () => {
    const prose = "Nabi ﷺ bersabda begitu. [H:muslim:154] Beliau juga mengatakan bahwa puasa menghapus dosa.";
    expect(guardAnswerProse(prose, allow(), grounded("hadith-muslim-154")).ok).toBe(false);
  });

  test("defaults to rejecting attribution when no grounding predicate is supplied", () => {
    expect(guardAnswerProse("Dalam sebuah hadits disebutkan hal itu.", allow()).ok).toBe(false);
  });

  test("HR. Bukhari with no marker is rejected", () => {
    expect(guardAnswerProse("Amal tergantung niat (HR. Bukhari).", allow(), grounded()).ok).toBe(false);
  });

  test("safeAnswer returns null on an unmarked attribution", () => {
    expect(safeAnswer("Diriwayatkan oleh Bukhari bahwa amal tergantung niat.", allow(), grounded())).toBeNull();
  });
});

describe("the rule does not fire on compliant prose", () => {
  // A word list would reject these. That is exactly why this is a construction list.
  test("saying you are not a hadith expert passes", () => {
    expect(guardAnswerProse("Aku bukan ahli hadits, lebih baik tanyakan pada ustadz.", allow(), grounded()).ok).toBe(true);
  });

  test("naming the Prophet without attributing a saying passes", () => {
    expect(guardAnswerProse("Nabi ﷺ adalah teladan yang baik bagi kita semua.", allow(), grounded()).ok).toBe(true);
  });

  test("ordinary comfort prose passes", () => {
    const prose = "Rasanya berat ya. Kamu tidak sendirian menghadapi ini.";
    expect(guardAnswerProse(prose, allow(), grounded()).ok).toBe(true);
  });
});

describe("honorifics are not scripture", () => {
  // The app's intended voice (PRD decision 2) uses ﷺ. It sits in the Arabic presentation-forms
  // block, so before the HONORIFIC exception the `arabic` rule made that sentence unshippable.
  test("ﷺ alone does not trip the arabic rule", () => {
    expect(guardAnswerProse("Nabi ﷺ adalah teladan.", allow(), grounded()).ok).toBe(true);
  });

  test("ﷻ alone does not trip the arabic rule", () => {
    expect(guardAnswerProse("Allah ﷻ Maha Pengampun.", allow(), grounded()).ok).toBe(true);
  });

  test("real Arabic script alongside an honorific still fails", () => {
    const r = guardAnswerProse("Nabi ﷺ bersabda: إنما الأعمال بالنيات [H:bukhari:1]", allow(), grounded("hadith-bukhari-1"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "arabic")).toBe(true);
  });
});

/**
 * The verb-list leak, found by probing live production rather than by reading the list.
 *
 * Asked prod Erik's own question — "apakah benar bahwa sakit itu akan menghapus dosa kita?" — and it
 * answered: "Rasulullah shallallahu alaihi wasallam MENGAJARKAN bahwa tidaklah seorang muslim
 * tertimpa kelelahan, penyakit, kesedihan…". A real hadith, no marker, guard `ok = true`, zero
 * violations. `PROPHETIC` carried `menganjurkan` and not `mengajarkan` — one letter apart to the eye,
 * different words — so the file's self-described highest-stakes wall was open.
 *
 * It also explains why the same question sometimes returned silence and sometimes an answer, which
 * had been read as a caching problem: the outcome depends on which verb the model reaches for.
 */
describe("weak attribution verbs — the live leak", () => {
  const live = `Benar, sakit bisa menjadi penghapus dosa. Rasulullah shallallahu alaihi wasallam mengajarkan bahwa tidaklah seorang muslim tertimpa kelelahan, penyakit, kesedihan, melainkan Allah menghapuskan sebagian dosanya.`;

  test("the exact prose live production shipped is now refused", () => {
    expect(guardAnswerProse(live, allow(), grounded()).ok).toBe(false);
  });

  test.each([
    ["mengajarkan", "Nabi ﷺ mengajarkan bahwa senyum itu sedekah."],
    ["menjelaskan", "Nabi ﷺ menjelaskan bahwa senyum itu sedekah."],
    ["menyebutkan", "Rasulullah menyebutkan bahwa amal tergantung niat."],
    ["memberitahu", "Beliau memberitahu bahwa sabar itu cahaya."],
    ["mengabarkan", "Nabi ﷺ mengabarkan bahwa surga itu dekat."],
    ["menuturkan", "Rasulullah menuturkan bahwa doa adalah senjata mukmin."],
    ["menyampaikan", "Nabi ﷺ menyampaikan bahwa kebersihan sebagian dari iman."],
    ["menegaskan", "Nabi Muhammad shallallahu alaihi wasallam menegaskan bahwa niat itu penting."],
  ])("%s + bahwa is an attribution and needs a receipt", (_verb, prose) => {
    expect(guardAnswerProse(prose, allow(), grounded()).ok).toBe(false);
  });

  test("direct speech after a colon counts too", () => {
    expect(guardAnswerProse(`Nabi ﷺ mengajarkan: "tidaklah seorang muslim ditimpa sakit"`, allow(), grounded()).ok).toBe(false);
  });

  test("the spelled-out Latin honorific does not push the verb out of range", () => {
    // The live answer wrote "shallallahu alaihi wasallam" in Latin rather than the ﷺ ligature, which
    // widens the gap between subject and verb. Pinned because a narrower window would silently reopen
    // the leak for exactly the phrasing production actually produced.
    expect(guardAnswerProse("Rasulullah shallallahu alaihi wasallam mengajarkan bahwa sakit menghapus dosa.", allow(), grounded()).ok).toBe(false);
  });
});

/**
 * PASSIVE VOICE — the second live leak, found minutes after the first fix was deployed and called done.
 *
 * The active-voice widening was verified against ONE phrasing and the model simply reached for another.
 * Prod shipped: *"…memang bisa menjadi penghapus dosa, sebagaimana yang DIAJARKAN OLEH Rasulullah ﷺ"*.
 *
 * Two misses at once. The active patterns anchor subject-then-verb, and Indonesian passive puts the
 * agent LAST via `oleh`, so the clause reads backwards to them. And `diajarkan` is the `di-` passive of
 * `mengajarkan`, absent from the list exactly as `mengajarkan` had been absent beside `menganjurkan`.
 *
 * `diriwayatkan\s+(oleh|dari|bahwa)` had been in the list all along — itself a `di-` passive taking
 * `oleh` — enumerated as one word instead of as the construction it is. The lesson is recorded in
 * ISC-440: a vocabulary cannot close this, only a grammar can.
 */
describe("passive attribution — the second live leak", () => {
  test("the exact prose prod shipped is refused", () => {
    const live = "Jawabannya, ya, sakit dan musibah yang menimpa seorang mukmin memang bisa menjadi penghapus dosa, sebagaimana yang diajarkan oleh Rasulullah ﷺ.";
    expect(guardAnswerProse(live, allow(), grounded()).ok).toBe(false);
  });

  test.each([
    "Hal ini disabdakan oleh Nabi ﷺ dalam sebuah kesempatan.",
    "Seperti dijelaskan oleh Rasulullah, sabar itu cahaya.",
    "Sebagaimana disebutkan oleh beliau, amal tergantung niat.",
    "Ini disampaikan oleh Nabi kepada para sahabat.",
    "Menurut Nabi ﷺ, senyum itu sedekah.",
    "Menurut Rasulullah, sakit menghapus dosa.",
  ])("refuses: %s", (prose) => {
    expect(guardAnswerProse(prose, allow(), grounded()).ok).toBe(false);
  });

  test.each([
    // `oleh` naming a NON-prophetic agent is how the app is supposed to speak, and must survive.
    "Seperti dijelaskan oleh Al-Qur'an dalam QS 2:155, ujian itu pasti datang.",
    "Doa ini disebutkan oleh Al-Qur'an dalam QS 26:80.",
    "Menurut Al-Qur'an, kesabaran itu indah.",
  ])("still ships: %s", (prose) => {
    expect(guardAnswerProse(prose, allow("2:155", "26:80"), grounded()).ok).toBe(true);
  });
});

describe("weak attribution verbs must NOT block Qur'anic narrative", () => {
  // The reason the new verbs are a separate `bahwa`-gated pattern instead of more alternatives in the
  // original list. Measured before choosing the design: a flat widening rejects every one of these,
  // and they are the app's core competency — telling a prophet's story from the mushaf.
  test.each([
    "Kisah Nabi Yusuf mengajarkan kita arti kesabaran.",
    "Nabi Ibrahim mengajarkan kita untuk bertawakal kepada Allah.",
    "Kisah Nabi Musa menjelaskan betapa besar pertolongan Allah.",
    "Nabi ﷺ adalah teladan yang baik bagi kita semua.",
    "Aku bukan ahli hadits, lebih baik tanyakan pada ustadz.",
  ])("still ships: %s", (prose) => {
    expect(guardAnswerProse(prose, allow(), grounded()).ok).toBe(true);
  });

  test("a verb attached to a NON-prophet subject is untouched", () => {
    // "Al-Qur'an menjelaskan bahwa…" and "QS 2:155 menyebutkan bahwa…" are how the app is supposed to
    // speak. The pattern requires a prophetic subject, so scripture citing itself never trips it.
    expect(guardAnswerProse("Al-Qur'an menjelaskan bahwa Allah dekat dengan hamba-Nya.", allow(), grounded()).ok).toBe(true);
    expect(guardAnswerProse("QS 2:155 menyebutkan bahwa ujian datang bagi orang yang sabar.", allow("2:155"), grounded()).ok).toBe(true);
  });
});

describe("markersInProse — the renderer's work list", () => {
  test("extracts markers in order, de-duped", () => {
    expect(markersInProse("[H:muslim:154] lalu [H:bukhari:1] lalu [H:muslim:154]")).toEqual([
      "hadith-muslim-154",
      "hadith-bukhari-1",
    ]);
  });

  test("prose with no markers yields an empty list", () => {
    expect(markersInProse("Tidak ada rujukan hadits di sini.")).toEqual([]);
  });

  test("markerToId matches the corpus id shape the retrieval layer returns", () => {
    expect(markerToId("muslim", "154")).toBe("hadith-muslim-154");
    expect(markerToId("bukhari", 6962)).toBe("hadith-bukhari-6962");
  });
});
