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
