import { describe, expect, test } from "bun:test";
import { allowedRefsFrom, guardAnswerProse, safeAnswer } from "./answer-guard.ts";

const allow = (...refs: string[]) => allowedRefsFrom(refs);

describe("guardAnswerProse — Arabic is always rejected", () => {
  test("any Arabic script in the prose fails", () => {
    const r = guardAnswerProse("Allah Maha Esa. قُلْ هُوَ ٱللَّهُ", allow("112:1"));
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("arabic");
  });

  test("plain Indonesian answer with no Arabic passes", () => {
    expect(guardAnswerProse("Allah itu Maha Esa dan tempat bergantung.", allow("112:1")).ok).toBe(true);
  });
});

describe("guardAnswerProse — citations must be grounded", () => {
  test("a cited ref that is in the grounding passes", () => {
    const prose = "Seperti disebut dalam QS Al-Ikhlas 112:1, Allah itu Esa.";
    expect(guardAnswerProse(prose, allow("112:1", "2:255")).ok).toBe(true);
  });

  test("a cited ref that is NOT in the grounding is a hallucination → rejected", () => {
    // The model invented 4:82; it was never handed that verse. This is the exact failure mode the
    // whole app refuses — the guard catches it even though the prose reads fluently.
    const prose = "Ini dijelaskan dalam QS 4:82 dan QS 112:1.";
    const r = guardAnswerProse(prose, allow("112:1"));
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toEqual({ kind: "bad_ref", rule: "bad_ref", detail: "4:82" });
  });

  test("ref spelled with a dot or spaces is still checked", () => {
    expect(guardAnswerProse("Lihat 2.255.", allow("2:255")).ok).toBe(true);
    expect(guardAnswerProse("Lihat 2 : 256.", allow("2:255")).ok).toBe(false);
  });

  test("a range citation is judged by its base ref", () => {
    expect(guardAnswerProse("Al-Ikhlas 112:1-4 menegaskan keesaan.", allow("112:1")).ok).toBe(true);
  });

  test("prose with no references at all passes (nothing to hallucinate)", () => {
    expect(guardAnswerProse("Allah Maha Pengasih dan dekat dengan hamba-Nya.", allow()).ok).toBe(true);
  });
});

describe("safeAnswer — the caller's fall-back gate", () => {
  test("clean prose returns as-is (trimmed)", () => {
    expect(safeAnswer("  Allah Maha Esa.  ", allow())).toBe("Allah Maha Esa.");
  });

  test("empty prose returns null", () => {
    expect(safeAnswer("   ", allow())).toBeNull();
  });

  test("an ungrounded citation returns null so the caller falls back", () => {
    expect(safeAnswer("Lihat QS 99:9.", allow("112:1"))).toBeNull();
  });
});

describe("allowedRefsFrom — a predicate over normalised grounding refs", () => {
  test("parses the scholar's display form and the bare form", () => {
    const citable = allowedRefsFrom(["QS. Al-Ikhlas, 112:1", "2:255"]);
    expect(citable("112:1")).toBe(true);
    expect(citable("2:255")).toBe(true);
    expect(citable("4:82")).toBe(false);
  });
});

describe("guardAnswerProse — no fiqh verdict may be issued", () => {
  // The failure this catches is invisible to the other two rules: fluent Indonesian, no Arabic,
  // and either a perfectly grounded citation or none at all. Only the SHAPE gives it away.
  test("an assigned ruling is rejected even when its citation is grounded", () => {
    const r = guardAnswerProse("Berdasarkan QS 2:275, hukumnya haram dan transaksimu batal.", allow("2:275"));
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("fatwa");
  });

  test("verdict-first phrasing is caught too", () => {
    expect(guardAnswerProse("Riba itu haram hukumnya.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Perbuatan itu haram.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Wajib bagi kamu mengqadha puasanya.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Shalatmu tidak sah.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Itu termasuk dosa besar.", allow()).ok).toBe(false);
  });

  // The prompt ORDERS the model to disclaim being a mufti, so a compliant answer contains these very
  // words. A word-level check would reject precisely the answers that obey rule 3.
  test("the obedient disclaimer is NOT a fatwa", () => {
    expect(guardAnswerProse("Aku tidak bisa menetapkan hukum halal atau haram — tanyakan pada ustadz.", allow()).ok).toBe(true);
    expect(guardAnswerProse("Soal wajib atau tidaknya, sebaiknya kamu bertanya kepada ulama.", allow()).ok).toBe(true);
    expect(guardAnswerProse("Ini bukan fatwa, dan aku bukan mufti.", allow()).ok).toBe(true);
  });

  test("ordinary warm prose is not mistaken for a ruling", () => {
    expect(guardAnswerProse("Kamu tidak boleh putus asa dari rahmat Allah.", allow()).ok).toBe(true);
    expect(guardAnswerProse("Rasanya berat, dan itu wajar.", allow()).ok).toBe(true);
  });

  // Hedging one sentence must not license a bare verdict in the next.
  test("a hedge elsewhere does not license a verdict sentence", () => {
    const prose = "Aku bukan mufti dan bukan ustadz. Tapi hukumnya haram.";
    expect(guardAnswerProse(prose, allow()).ok).toBe(false);
  });

  // The amnesty used to be a flat word list, and the words that bought amnesty were the ones that
  // appear in the strongest rulings a model can issue. Naming the scholars is not deferring to them.
  test("an ijma' claim is a verdict, not a hedge", () => {
    expect(guardAnswerProse("Para ulama sepakat perbuatan itu haram.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Menurut fatwa, perbuatan itu haram.", allow()).ok).toBe(false);
    expect(guardAnswerProse("Kata ustadz perbuatan itu haram.", allow()).ok).toBe(false);
  });

  // The amnesty must fire on a CONSTRUCTION that defers, not on proximity to an authority's name.
  test("only a real deferral buys the amnesty", () => {
    expect(guardAnswerProse("Aku tidak bisa memutuskan itu haram atau tidak.", allow()).ok).toBe(true);
    expect(guardAnswerProse("Untuk itu haram tidaknya, tanyakan kepada ustadz.", allow()).ok).toBe(true);
    expect(guardAnswerProse("Wallahu a'lam, sebagian menyebut itu makruh.", allow()).ok).toBe(true);
  });

  // An it-depends opener is the deferral most likely to carry a verdict behind a `tapi`.
  test("an it-depends opener does not license the verdict after it", () => {
    expect(guardAnswerProse("Tergantung niat, tapi perbuatan itu haram.", allow()).ok).toBe(false);
  });

  test("safeAnswer returns null on a fatwa so the caller falls back to principled", () => {
    expect(safeAnswer("Hukumnya wajib.", allow())).toBeNull();
  });
});
