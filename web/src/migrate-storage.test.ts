import { beforeEach, describe, expect, test } from "bun:test";
import { migrateStorage } from "./migrate-storage.ts";

/**
 * The rename must not cost a returning reader their saved thread, bookmark, or settings.
 */

const store = new Map<string, string>();
const mock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
(globalThis as { localStorage?: unknown }).localStorage = mock;

beforeEach(() => {
  store.clear();
  mock.getItem = (k: string) => store.get(k) ?? null;
  mock.setItem = (k: string, v: string) => void store.set(k, v);
  mock.removeItem = (k: string) => void store.delete(k);
});

describe("Nur → New-Quranku key migration", () => {
  test("a returning reader's saved data is carried across, and the old keys removed", () => {
    store.set("nur:thread", '{"v":1,"at":1,"turns":[]}');
    store.set("nur:baca", '{"v":1,"surah":18,"ayah":10,"at":1}');
    store.set("nur:theme", "dark");
    store.set("nur:ar", "l");
    store.set("nur:lens", "ibn-kathir");
    store.set("nur:explained", "1");

    migrateStorage();

    expect(store.get("newquranku:thread")).toBe('{"v":1,"at":1,"turns":[]}');
    expect(store.get("newquranku:baca")).toBe('{"v":1,"surah":18,"ayah":10,"at":1}');
    expect(store.get("newquranku:theme")).toBe("dark");
    expect(store.get("newquranku:ar")).toBe("l");
    expect(store.get("newquranku:lens")).toBe("ibn-kathir");
    expect(store.get("newquranku:explained")).toBe("1");

    // The old namespace is gone — nothing lingers under the retired name.
    for (const k of ["nur:thread", "nur:baca", "nur:theme", "nur:ar", "nur:lens", "nur:explained"]) {
      expect(store.get(k)).toBeUndefined();
    }
  });

  test("existing new-key data is never clobbered by old data", () => {
    store.set("nur:theme", "dark");
    store.set("newquranku:theme", "light"); // reader already chose under the new build

    migrateStorage();

    expect(store.get("newquranku:theme")).toBe("light"); // new value wins
    expect(store.get("nur:theme")).toBeUndefined(); // old still cleaned up
  });

  test("nothing to migrate is a no-op, not a crash", () => {
    expect(() => migrateStorage()).not.toThrow();
    expect(store.size).toBe(0);
  });

  test("it is idempotent — a second run does nothing", () => {
    store.set("nur:baca", '{"v":1,"surah":2,"ayah":255,"at":1}');
    migrateStorage();
    const after = store.get("newquranku:baca");
    migrateStorage();
    expect(store.get("newquranku:baca")).toBe(after);
  });

  test("a throwing localStorage never breaks boot", () => {
    mock.getItem = () => {
      throw new Error("private mode");
    };
    expect(() => migrateStorage()).not.toThrow();
  });
});
