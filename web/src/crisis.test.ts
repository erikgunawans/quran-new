import { describe, expect, test } from "bun:test";
import { crisisReply, detectCrisis, HELPLINE } from "./crisis.ts";
import { parseRef } from "./quran.ts";

/**
 * The regression suite for the worst thing this app has done.
 *
 * Typed into the live product: "aku gak sanggup bayar utang, pengen mati aja".
 * Nur matched on `utang`, served a verse about debt repayment, and never saw the rest.
 *
 * These tests exist so that cannot happen again — and so that no future refactor can quietly
 * reorder the checks and let retrieval answer first.
 */

describe("the sentence that started this", () => {
  test("'aku gak sanggup bayar utang, pengen mati aja' is a crisis, not a debt query", () => {
    const c = detectCrisis("aku gak sanggup bayar utang, pengen mati aja");
    expect(c).not.toBeNull();
    expect(c!.matched).toContain("mati");
  });

  test("it is caught even though the sentence is ALSO about debt", () => {
    // The failure mode was topical: `utang` won because it was scored and `pengen mati aja` wasn't.
    // Crisis detection must not depend on the rest of the sentence being quiet.
    expect(detectCrisis("utang numpuk, kerjaan gaada, pengen mati aja rasanya")).not.toBeNull();
    expect(detectCrisis("besok tagihan jatuh tempo dan aku udah capek hidup")).not.toBeNull();
  });
});

describe("how people actually type it at 2am", () => {
  test.each([
    "pengen mati",
    "pengin mati aja",
    "aku mau mati",
    "kepikiran bunuh diri terus",
    "kayaknya lebih baik mati",
    "capek idup",
    "udah gak kuat hidup",
    "gak sanggup hidup lagi",
    "pengen menghilang aja dari dunia",
    "buat apa hidup kalau gini terus",
    "hidupku sia-sia",
    "aku nyakitin diri sendiri lagi tadi malam",
    "pengen nyayat tangan",
    "udah nyerah sama hidup",
    "gaada gunanya hidup",
    "bundir aja kali ya",
  ])("%s → crisis", (msg) => {
    expect(detectCrisis(msg)).not.toBeNull();
  });
});

describe("it does not cry wolf", () => {
  test.each([
    "aku lagi capek banget",
    "lagi banyak utang, stress",
    "baru kehilangan orang tua",
    "ngerasa dosaku kebanyakan",
    "cemas terus tiap malam",
    "18:10",
    "al kahfi",
    "gimana cara sholat tahajud",
    "ayah aku meninggal minggu lalu",
    "capek kerja terus",
  ])("%s → NOT a crisis", (msg) => {
    expect(detectCrisis(msg)).toBeNull();
  });

  test("grief is not crisis — a death in the family gets scripture, not a hotline", () => {
    // Getting this wrong would be its own harm: handing a grieving person a suicide hotline
    // implies something about them that they did not say.
    expect(detectCrisis("baru kehilangan orang tua, sedih banget")).toBeNull();
  });
});

describe("what Nur says when it fires", () => {
  const reply = crisisReply();

  test("names a real, reachable Indonesian resource", () => {
    expect(HELPLINE.dial).toBe("119");
    expect(HELPLINE.ext).toBe("8");
    expect(reply).toContain("119");
    expect(reply).toContain("tel:119");
    expect(reply).toContain("SEJIWA");
  });

  test("offers the SAME service through a second door — chat — not just a phone call", () => {
    // The hotline is documented as not always quickly answered, and a call at 2am is a real barrier
    // for the young person this exists for. The same Kemenkes counsellors are reachable by chat;
    // both channels must be present so the phone is never the only way in.
    expect(reply).toContain(HELPLINE.wa); // wa.me deep link
    expect(reply).toContain(HELPLINE.waDisplay); // human-readable WhatsApp number
    expect(reply).toContain(HELPLINE.web); // healing119.id
  });

  test("the phone stays the primary CTA; chat is the calmer alternative BELOW it, never a menu", () => {
    const iPhone = reply.indexOf("crisis-cta");
    const iChat = reply.indexOf("crisis-alt");
    expect(iPhone).toBeGreaterThanOrEqual(0);
    expect(iChat).toBeGreaterThan(iPhone); // order: emergency call leads, chat follows
  });

  test("Anti: it does NOT render scripture", () => {
    // A person saying they want to die is not asking for a citation.
    //
    // Note what this does NOT forbid: the word "ayat" in prose. The copy says "aku nggak mau cuma
    // ngasih kamu ayat lalu pergi" — the sentence that *declines* to lead with a verse. Banning the
    // word would ban Nur from saying the one thing it most needs to say. What must not appear is a
    // rendered verse: no reference, no Arabic, no translation block.
    expect(reply).not.toMatch(/\d{1,3}:\d{1,3}/); // no verse reference
    expect(reply).not.toMatch(/[؀-ۿ]/); // no Arabic script
    expect(reply).not.toContain("Terjemah makna");
    expect(reply).not.toContain("Terjemah harfiah");
    expect(reply).not.toContain("class=\"verse\"");
  });

  test("Anti: it does not preach, rule, or moralise", () => {
    // The most harmful thing this app could do is make a person at their lowest feel judged.
    for (const word of ["dosa", "haram", "sabar", "azab", "neraka", "ujian", "cobaan"]) {
      expect(reply.toLowerCase()).not.toContain(word);
    }
  });

  test("it is announced to screen readers as an alert", () => {
    expect(reply).toContain('role="alert"');
  });

  test("the call target is a real tap target, not a text link", () => {
    expect(reply).toContain("crisis-cta");
  });
});

describe("crisis outranks every other path", () => {
  test("a crisis message that ALSO parses as a verse ref is still a crisis", () => {
    // "2:255 pengen mati aja" must never render Ayat al-Kursi and move on.
    const msg = "2:255 pengen mati aja";
    expect(detectCrisis(msg)).not.toBeNull();
    // parseRef would happily resolve it — which is exactly why crisis runs first in main.ts.
    expect(parseRef(msg).kind).toBe("ayah");
  });
});
