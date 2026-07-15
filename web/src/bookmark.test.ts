import { beforeEach, describe, expect, test } from "bun:test";
import { cancelBookmark, clearBookmark, flushBookmark, loadBookmark, saveBookmark } from "./bookmark.ts";

/**
 * The place, remembered — and only the place.
 */

type LocalStorageMock = {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
  clear: () => void;
};

// bun test has no DOM. A minimal localStorage is enough: bookmark.ts touches nothing else.
const store = new Map<string, string>();
const localStorageMock: LocalStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
(globalThis as { localStorage?: unknown }).localStorage = localStorageMock;

const KEY = "nur:baca";
const THREAD_KEY = "nur:thread";

const waitForDebounce = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 450);
  });

function resetLocalStorageMock(): void {
  localStorageMock.getItem = (k: string) => store.get(k) ?? null;
  localStorageMock.setItem = (k: string, v: string) => void store.set(k, v);
  localStorageMock.removeItem = (k: string) => void store.delete(k);
  localStorageMock.clear = () => store.clear();
}

beforeEach(() => {
  resetLocalStorageMock();
  clearBookmark();
  store.clear();
});

describe("Casey switches away and comes back", () => {
  test("save then load round-trips the chosen place", () => {
    saveBookmark(18, 10);
    flushBookmark();

    const back = loadBookmark();
    expect(back).toEqual({
      surah: 18,
      ayah: 10,
      at: expect.any(Number),
    });
  });

  test("it stores only the coordinate, never verse text or markup", () => {
    saveBookmark(18, 10);
    flushBookmark();

    const raw = store.get(KEY)!;
    expect(raw).toMatch(/^\{"v":1,"surah":18,"ayah":10,"at":\d+\}$/);
    expect(raw).not.toContain("<");
    expect(raw).not.toMatch(/[؀-ۿ]/);
  });

  test("the key is nur:baca, and nur:thread stays untouched", () => {
    store.set(THREAD_KEY, "keep-this-thread");

    saveBookmark(2, 286);
    flushBookmark();

    expect(store.get(KEY)).toBeDefined();
    expect(store.get(THREAD_KEY)).toBe("keep-this-thread");
  });

  test("rapid saves coalesce to the latest position in the burst", () => {
    saveBookmark(2, 1);
    saveBookmark(2, 255);
    flushBookmark();

    expect(loadBookmark()).toEqual({
      surah: 2,
      ayah: 255,
      at: expect.any(Number),
    });
  });
});

describe("A bookmark persists until the reader changes it", () => {
  test("there is no TTL: a bookmark from 30 days ago still loads", () => {
    store.set(
      KEY,
      JSON.stringify({ v: 1, surah: 18, ayah: 10, at: Date.now() - 30 * 24 * 60 * 60 * 1000 }),
    );

    expect(loadBookmark()).toEqual({
      surah: 18,
      ayah: 10,
      at: expect.any(Number),
    });
  });

  test("clearBookmark removes the saved place", () => {
    saveBookmark(18, 10);
    flushBookmark();

    clearBookmark();

    expect(loadBookmark()).toBeNull();
    expect(store.get(KEY)).toBeUndefined();
  });

  test("cancelBookmark drops a pending write but keeps the last committed place (the navigation race)", async () => {
    // Reader is on 18:47, a write is scheduled; then they navigate away within the debounce window.
    saveBookmark(18, 47);
    flushBookmark(); // this is the "last committed" position while reading
    expect(loadBookmark()).toEqual({ surah: 18, ayah: 47, at: expect.any(Number) });

    // A newer scroll schedules a write, but navigation cancels it before it can land on the next surah.
    saveBookmark(18, 60);
    cancelBookmark();
    await waitForDebounce();
    flushBookmark();

    // The pending {18,60} was dropped; the committed {18,47} survives, un-clobbered.
    expect(loadBookmark()).toEqual({ surah: 18, ayah: 47, at: expect.any(Number) });
  });

  test("clearBookmark also cancels a pending debounced write", async () => {
    saveBookmark(18, 10);
    clearBookmark();
    await waitForDebounce();

    expect(store.get(KEY)).toBeUndefined();
    flushBookmark();
    expect(store.get(KEY)).toBeUndefined();
  });

  test("flushBookmark clears the timer so the same pending write is not written twice", async () => {
    let writes = 0;
    localStorageMock.setItem = (k: string, v: string) => {
      writes += 1;
      store.set(k, v);
    };

    saveBookmark(18, 10);
    flushBookmark();
    await waitForDebounce();

    expect(writes).toBe(1);
    expect(loadBookmark()).toEqual({
      surah: 18,
      ayah: 10,
      at: expect.any(Number),
    });
  });
});

describe("It never breaks the app", () => {
  test("missing storage yields null", () => {
    expect(loadBookmark()).toBeNull();
  });

  test("corrupt JSON yields null, not a throw", () => {
    store.set(KEY, "{not json");

    expect(() => loadBookmark()).not.toThrow();
    expect(loadBookmark()).toBeNull();
  });

  test("a future schema version is ignored", () => {
    store.set(KEY, JSON.stringify({ v: 99, surah: 18, ayah: 10, at: Date.now() }));
    expect(loadBookmark()).toBeNull();
  });

  test("localStorage.getItem throwing yields null", () => {
    localStorageMock.getItem = () => {
      throw new Error("private mode");
    };

    expect(() => loadBookmark()).not.toThrow();
    expect(loadBookmark()).toBeNull();
  });

  test("localStorage.setItem throwing is swallowed", () => {
    localStorageMock.setItem = () => {
      throw new Error("quota");
    };

    expect(() => {
      saveBookmark(18, 10);
      flushBookmark();
    }).not.toThrow();
    expect(store.get(KEY)).toBeUndefined();
  });

  test("localStorage.removeItem throwing is swallowed, and the pending write stays cancelled", async () => {
    saveBookmark(18, 10);
    localStorageMock.removeItem = () => {
      throw new Error("private mode");
    };

    expect(() => clearBookmark()).not.toThrow();

    resetLocalStorageMock();
    await waitForDebounce();
    expect(store.get(KEY)).toBeUndefined();
  });
});

describe("Bounds are enforced on save and load", () => {
  test("surah 0 is rejected on save and on load", () => {
    saveBookmark(0, 1);
    flushBookmark();
    expect(store.get(KEY)).toBeUndefined();

    store.set(KEY, JSON.stringify({ v: 1, surah: 0, ayah: 1, at: Date.now() }));
    expect(loadBookmark()).toBeNull();
  });

  test("surah 115 is rejected on save and on load", () => {
    saveBookmark(115, 1);
    flushBookmark();
    expect(store.get(KEY)).toBeUndefined();

    store.set(KEY, JSON.stringify({ v: 1, surah: 115, ayah: 1, at: Date.now() }));
    expect(loadBookmark()).toBeNull();
  });

  test("ayah 0 is rejected on save and on load", () => {
    saveBookmark(18, 0);
    flushBookmark();
    expect(store.get(KEY)).toBeUndefined();

    store.set(KEY, JSON.stringify({ v: 1, surah: 18, ayah: 0, at: Date.now() }));
    expect(loadBookmark()).toBeNull();
  });

  test("ayah past the end of the surah is rejected on save and on load", () => {
    saveBookmark(18, 111);
    flushBookmark();
    expect(store.get(KEY)).toBeUndefined();

    store.set(KEY, JSON.stringify({ v: 1, surah: 18, ayah: 111, at: Date.now() }));
    expect(loadBookmark()).toBeNull();
  });

  test("valid edge 114:6 loads", () => {
    saveBookmark(114, 6);
    flushBookmark();

    expect(loadBookmark()).toEqual({
      surah: 114,
      ayah: 6,
      at: expect.any(Number),
    });
  });

  test("valid edge 18:110 loads", () => {
    saveBookmark(18, 110);
    flushBookmark();

    expect(loadBookmark()).toEqual({
      surah: 18,
      ayah: 110,
      at: expect.any(Number),
    });
  });
});
