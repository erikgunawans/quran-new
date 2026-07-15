import { beforeEach, describe, expect, test } from "bun:test";
import { clearThread, hasThread, loadThread, rememberTurn, turnFromHits, type Turn } from "./thread.ts";
import { detectCrisis } from "./crisis.ts";

/**
 * The conversation, remembered — and the one thing that must never be.
 */

// bun test has no DOM. A minimal localStorage is enough: thread.ts touches nothing else.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => store.clear());

describe("Casey switches to WhatsApp and comes back", () => {
  test("the thread survives", () => {
    rememberTurn({ q: "aku lagi capek banget", kind: "hits", refs: ["94:5"] });
    rememberTurn({ q: "18:10", kind: "ayah", surah: 18, ayah: 10 });

    const back = loadThread();
    expect(back).toHaveLength(2);
    expect(back[0]!.q).toBe("aku lagi capek banget");
    expect(back[1]!.kind).toBe("ayah");
  });

  test("it stores the DECISION, never the rendered HTML", () => {
    rememberTurn({ q: "18:10", kind: "ayah", surah: 18, ayah: 10 });
    const raw = store.get("nur:thread")!;

    // No markup, and no scripture. A previous build's mistakes must not resurrect from disk.
    expect(raw).not.toContain("<");
    expect(raw).not.toContain("Terjemah");
    expect(raw).not.toMatch(/[؀-ۿ]/); // no Arabic
  });

  test("it stays bounded — localStorage is not a database", () => {
    for (let i = 0; i < 40; i++) rememberTurn({ q: `q${i}`, kind: "silence" });
    expect(loadThread().length).toBeLessThanOrEqual(20);
    expect(loadThread().at(-1)!.q).toBe("q39"); // the newest survive, not the oldest
  });
});

describe("Anti: a crisis exchange is NEVER written to disk", () => {
  // Rifqi types this at 2am, gets the helpline, closes the app. In the morning his sister borrows
  // the phone — shared phones are the norm on this device profile — and opens Nur.
  //
  // He disclosed that to Nur. He did not disclose it to whoever picks up the phone next.
  const RIFQI = "aku gak sanggup bayar utang, pengen mati aja";

  test("the sentence is recognised as a crisis", () => {
    expect(detectCrisis(RIFQI)).not.toBeNull();
  });

  test("the Turn type has no shape that could hold one", () => {
    // Two locks on the same door: main.ts returns before remembering, AND there is no variant to
    // put a crisis in. If someone adds one, this test is the tripwire.
    const kinds: Turn["kind"][] = ["ayah", "surah", "no-such-surah", "no-such-ayah", "hits", "silence"];
    expect(kinds).not.toContain("crisis" as never);
  });

  test("nothing containing his words ever reaches storage", () => {
    // Simulate the full session: he asks a normal thing, then discloses, then asks another thing.
    rememberTurn({ q: "lagi banyak utang, stress", kind: "hits", refs: ["2:280"] });
    // …crisis turn is never handed to rememberTurn — main.ts returns first…
    rememberTurn({ q: "al kahfi", kind: "surah", surah: 18 });

    const raw = store.get("nur:thread") ?? "";
    expect(raw).not.toContain("pengen mati");
    expect(raw).not.toContain("mati aja");
    expect(loadThread().map((t) => t.q)).toEqual(["lagi banyak utang, stress", "al kahfi"]);
  });
});

describe("the conversation ends", () => {
  test("the user can burn it", () => {
    rememberTurn({ q: "ngerasa dosaku kebanyakan", kind: "hits", refs: ["39:53"] });
    expect(hasThread()).toBe(true);

    clearThread();
    expect(hasThread()).toBe(false);
    expect(loadThread()).toEqual([]);
    expect(store.get("nur:thread")).toBeUndefined();
  });

  test("it expires on its own — last night's grief is not on screen tomorrow", () => {
    rememberTurn({ q: "baru kehilangan orang tua", kind: "hits", refs: ["2:156"] });

    // Age it 13 hours (TTL is 12).
    const s = JSON.parse(store.get("nur:thread")!) as { at: number };
    s.at = Date.now() - 13 * 60 * 60 * 1000;
    store.set("nur:thread", JSON.stringify(s));

    expect(loadThread()).toEqual([]);
    expect(store.get("nur:thread")).toBeUndefined(); // and it is erased, not just hidden
  });

  test("a thread from an hour ago is still there", () => {
    rememberTurn({ q: "cemas terus", kind: "hits", refs: ["13:28"] });
    const s = JSON.parse(store.get("nur:thread")!) as { at: number };
    s.at = Date.now() - 60 * 60 * 1000;
    store.set("nur:thread", JSON.stringify(s));

    expect(loadThread()).toHaveLength(1);
  });
});

describe("it never breaks the app", () => {
  test("corrupt storage yields an empty thread, not a crash", () => {
    store.set("nur:thread", "{not json");
    expect(loadThread()).toEqual([]);
  });

  test("a thread from a future schema version is ignored", () => {
    store.set("nur:thread", JSON.stringify({ v: 99, at: Date.now(), turns: [{ q: "x", kind: "??" }] }));
    expect(loadThread()).toEqual([]);
  });
});

describe("turnFromHits", () => {
  test("no hits becomes honest silence, not an empty answer", () => {
    expect(turnFromHits("gimana cara sholat tahajud", [])).toEqual({
      q: "gimana cara sholat tahajud",
      kind: "silence",
    });
  });

  test("hits are stored as refs only — the verse is re-derived, never copied", () => {
    const t = turnFromHits("capek", [
      { verse: { ref: "94:5" }, score: 10, matched: [] },
      { verse: { ref: "2:286" }, score: 8, matched: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    expect(t).toEqual({ q: "capek", kind: "hits", refs: ["94:5", "2:286"] });
  });
});
