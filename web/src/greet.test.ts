import { describe, expect, test } from "bun:test";
import { greeting } from "./greet";

const at = (h: number) => new Date(2026, 6, 16, h, 30, 0);

describe("greeting — the app notices what time it is for you", () => {
  test("2am does not say 'selamat pagi' — it asks", () => {
    // The tone rule this module exists for: someone opening a Qur'an app at 2am is not browsing.
    const g = greeting(at(2), "Erik");
    expect(g.band).toBe("dini-hari");
    expect(g.text).toBe("Belum bisa tidur, Erik?");
    expect(g.text).not.toContain("pagi");
  });

  test("bands map to the right Indonesian greeting", () => {
    expect(greeting(at(6), null).text).toBe("Selamat pagi");
    expect(greeting(at(12), null).text).toBe("Selamat siang");
    expect(greeting(at(16), null).text).toBe("Selamat sore");
    expect(greeting(at(21), null).text).toBe("Selamat malam");
  });

  test("every hour of the day produces a greeting — no gaps, no throw", () => {
    for (let h = 0; h < 24; h++) {
      const g = greeting(at(h), null);
      expect(g.text.length).toBeGreaterThan(0);
      expect(g.band).toBeTruthy();
    }
  });

  test("the name is optional — no account, no name, still a greeting", () => {
    // Masuk is out of scope (ISA § Out of Scope), so the nameless path is the DEFAULT path.
    expect(greeting(at(21), null).text).toBe("Selamat malam");
    expect(greeting(at(2), null).text).toBe("Belum bisa tidur?");
  });

  test("a name is appended, never interpolated into the middle", () => {
    expect(greeting(at(21), "Cia").text).toBe("Selamat malam, Cia");
  });

  test("band boundaries land on the right side", () => {
    expect(greeting(at(0), null).band).toBe("dini-hari");
    expect(greeting(at(3), null).band).toBe("dini-hari");
    expect(greeting(at(4), null).band).toBe("pagi");
    expect(greeting(at(10), null).band).toBe("pagi");
    expect(greeting(at(11), null).band).toBe("siang");
    expect(greeting(at(14), null).band).toBe("siang");
    expect(greeting(at(15), null).band).toBe("sore");
    expect(greeting(at(17), null).band).toBe("sore");
    expect(greeting(at(18), null).band).toBe("malam");
    expect(greeting(at(23), null).band).toBe("malam");
  });
});
