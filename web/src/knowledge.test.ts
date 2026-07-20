import { describe, expect, test } from "bun:test";
import { matchTopic, retrieveKnowledge } from "./knowledge.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const path = `web/public${u.startsWith("/") ? u : "/" + u}`;
  const text = await Bun.file(path).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

describe("matchTopic — conservative topic detection", () => {
  test.each([
    ["siapakah allah? ada dimana allah dan mau nya allah itu apa?", "allah-subhanahu-wa-ta-ala"],
    ["apa itu riba dalam islam", "ekonomi-islam"],
    ["ceritakan tentang nabi muhammad", "muhammad-shallallahu-alaihi-wasallam"],
    ["apa itu al-quran", "al-qur-an-taurat-injil-dan-zabur"],
  ])("'%s' → %s", (q, slug) => {
    expect(matchTopic(q)).toBe(slug);
  });

  test("a feeling is not a topic — knowledge never fires on it", () => {
    expect(matchTopic("aku lagi capek banget")).toBeNull();
    expect(matchTopic("baru kehilangan orang tua")).toBeNull();
    expect(matchTopic("cemas terus tiap malam")).toBeNull();
  });
});

describe("retrieveKnowledge — the scholar's own entries, verbatim and cited", () => {
  test("a BROAD definitional question ('who is Allah') → topic pointer, NEVER arbitrary entries", async () => {
    // The index is a predicate list, not a definition. Surfacing arbitrary Allah-entries would read
    // as a non sequitur, so we return the topic (for the pointer render) with NO invented entries.
    const k = await retrieveKnowledge("siapakah allah? ada dimana allah dan mau nya allah itu apa?");
    expect(k).not.toBeNull();
    expect(k!.slug).toBe("allah-subhanahu-wa-ta-ala");
    expect(k!.category).toContain("Allah");
    expect(k!.source.author).toBe("Ustadz Muhammad Thalib");
    expect(k!.totalEntries).toBeGreaterThan(0);
    expect(k!.entries.length).toBe(0); // broad → no faked answer
  });

  test("a SPECIFIC question ('hukum riba') → genuinely matching entries, verbatim, cited", async () => {
    const k = await retrieveKnowledge("apa hukum riba dalam ekonomi islam");
    expect(k).not.toBeNull();
    expect(k!.slug).toBe("ekonomi-islam");
    expect(k!.entries.length).toBeGreaterThan(0);
    expect(k!.entries.length).toBeLessThanOrEqual(8);
    // the matches are actually about riba, and each cites a real verse
    expect(k!.entries.some((e) => e.text.toLowerCase().includes("riba"))).toBe(true);
    for (const e of k!.entries) {
      expect(e.text.length).toBeGreaterThan(0);
      expect(e.surah).toBeGreaterThan(0);
      expect(e.ayah).toBeGreaterThan(0);
    }
  });

  test("a feeling returns null — the feeling path is never hijacked", async () => {
    expect(await retrieveKnowledge("aku lagi capek banget")).toBeNull();
  });
});

/**
 * Noise matching — found by the synthesis answer eval's dry-run (2026-07-20).
 *
 * `score > 0` qualified an entry on ONE shared word, and STOP covered only ~45 words. So common
 * Indonesian function words ranked the scholar's index: "tentang" ("about") pulled 12 entries for a
 * question about the Prophet, and "atas" ("upon") pulled 7 for the where-is-Allah question. Worse,
 * "haram" collided across its two senses — asked whether dating is forbidden, the app surfaced
 * verses about warfare during the SACRED months (Masjidil Haram, bulan-bulan haram).
 *
 * This hit BOTH editions: main.ts renders these verbatim under Ustadz Thalib's attribution, and the
 * synthesis edition hands them to the model as its only grounding — where the guard cannot help,
 * because a citation drawn from noise-matched grounding is whitelisted by construction.
 *
 * Frequency/IDF weighting was measured and rejected: these entries are terse index lines, so every
 * offending word is RARE in its category ("tentang" 4.1%, "atas" 2.1%, "haram" 1.8%) — right beside
 * the legitimate "riba" (2.9%). Frequency cannot separate signal from noise here. Function-word
 * filtering and sense disambiguation can.
 */
describe("a ruling question asked CASUALLY reaches the same pointer as the formal one", () => {
  // From Erik's phone: "pacaran itu haram atau nggak?" matched the topic and offered the ustadz's
  // section; "pacaran itu boleh ga sih?" — the same question the way people actually type it —
  // matched nothing and fell to blank silence. The app must not reward formal vocabulary.
  test.each([
    "pacaran itu boleh ga sih?",
    "boleh ga pacaran",
    "nonton film korea boleh gak",
    "apakah ini berdosa",
  ])("%s → routed to the rulings topic", (q) => {
    expect(matchTopic(q)).toBe("perintah-dan-larangan");
  });

  test("a feeling is still never hijacked into the rulings topic", () => {
    expect(matchTopic("aku lagi sedih banget")).toBeNull();
    expect(matchTopic("kangen ibu yang udah meninggal")).toBeNull();
  });
});

describe("retrieveKnowledge — function words and homonyms must not rank the scholar's index", () => {
  test("'tentang' ('about') does not qualify entries — no alam-ghaib line for a question about the Prophet", async () => {
    const k = await retrieveKnowledge("ceritakan tentang nabi muhammad");
    expect(k).not.toBeNull();
    expect(k!.slug).toBe("muhammad-shallallahu-alaihi-wasallam");
    // The exact noise that shipped: matched purely on "tentang", about the unseen, not the Prophet.
    expect(k!.entries.some((e) => e.text.toLowerCase().includes("alam ghaib"))).toBe(false);
    // Every surfaced entry must share a genuinely topical word with the question.
    for (const e of k!.entries) expect(e.text.toLowerCase()).toContain("nabi");
  });

  test("'atas' ('upon') does not qualify entries — the istiwa' question has NO index content, so: pointer", async () => {
    // Measured: `arsy` has df=0 in the Allah shard. The index holds nothing on where Allah is, so
    // the honest answer is the topic pointer — not seven entries where "atas" is a preposition
    // ("saksi atas kebenaran" = witness OVER the truth). This is the ustadz's reserved fault line.
    const k = await retrieveKnowledge("allah itu ada di mana? di atas arsy atau di mana-mana?");
    expect(k).not.toBeNull();
    expect(k!.slug).toBe("allah-subhanahu-wa-ta-ala");
    expect(k!.entries.length).toBe(0);
  });

  test("'haram' as SACRED never answers 'haram' as FORBIDDEN", async () => {
    const k = await retrieveKnowledge("pacaran itu haram atau nggak? jawab tegas aja");
    expect(k).not.toBeNull();
    // Masjidil Haram / bulan-bulan haram are the sacred sense — never grounding for a ruling question.
    for (const e of k!.entries) {
      const t = e.text.toLowerCase();
      expect(t).not.toContain("masjidil haram");
      expect(t).not.toContain("bulan-bulan haram");
      expect(t).not.toContain("bulan haram");
    }
  });

  test("REGRESSION: the legitimate 'hukum riba' match still works", async () => {
    // The fix must not buy precision by going mute. This is the case that proves it didn't.
    const k = await retrieveKnowledge("apa hukum riba dalam ekonomi islam");
    expect(k).not.toBeNull();
    expect(k!.entries.length).toBeGreaterThan(0);
    expect(k!.entries.some((e) => e.text.toLowerCase().includes("riba"))).toBe(true);
  });
});

describe("retrieveKnowledge — a frame word must not answer for a subject the index lacks", () => {
  // Erik asked the live app "pacaran itu boleh ga sih?" and got an honest silence, which is correct.
  // One phrasing away, "hukum pacaran dalam islam" returned six entries about qishas and following
  // the law of the Jahiliyyah — matched on `hukum` alone, since the index holds nothing on pacaran.
  // In the synthesis edition those six were the model's ONLY grounding.
  test("'hukum pacaran' surfaces nothing rather than entries about hukum-in-general", async () => {
    const k = await retrieveKnowledge("hukum pacaran dalam islam");
    expect(k).not.toBeNull();
    expect(k!.slug).toBe("perintah-dan-larangan"); // the topic still matches — only the entries go
    expect(k!.entries).toEqual([]);
  });

  // The residual gap recorded in PROGRESS on 2026-07-20, now closed by the same rule.
  test("'hukum mendengarkan musik' surfaces nothing — musik is not in the index", async () => {
    expect((await retrieveKnowledge("hukum mendengarkan musik"))!.entries).toEqual([]);
  });

  // The other half of the rule, and the one that makes it safe: `hukum` is a real content word and
  // must keep working when the subject IS covered. Anything less would trade one silence for another.
  test("a subject the index DOES cover still answers", async () => {
    const riba = await retrieveKnowledge("apa hukum riba dalam islam");
    expect(riba!.entries.length).toBeGreaterThan(0);
    expect(riba!.entries.every((e) => /riba/i.test(e.text))).toBe(true);

    const qishas = await retrieveKnowledge("apa hukum qishas");
    expect(qishas!.entries.length).toBeGreaterThan(0);
    expect(qishas!.entries.some((e) => /qishas/i.test(e.text))).toBe(true);
  });

  // Frequency was measured and rejected for the SECOND time here. If a future change reaches for an
  // IDF threshold, this is the counter-example: it would rank the noise above the signal.
  test("df cannot separate these: `hukum` is RARER in its category than `riba` is in its own", async () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
    const df = async (slug: string, w: string) => {
      const shard = await (await fetch(`/peta/${slug}.json`)).json();
      const all: { text: string }[] = shard.subtopics.flatMap((st: { entries: { text: string }[] }) => st.entries);
      return all.filter((e: { text: string }) => new Set(norm(e.text).split(/[\s-]+/)).has(w)).length / all.length;
    };
    expect(await df("perintah-dan-larangan", "hukum")).toBeLessThan(await df("ekonomi-islam", "riba"));
  });
});
