/**
 * One-time rename of saved keys from the old `nur:` namespace to `newquranku:`.
 *
 * The app was renamed from Nur to New-Quranku. A returning reader's data — their conversation thread,
 * their last-read bookmark, their theme and Arabic-size choices — lives under `nur:*` keys on the
 * phone. If the new build simply looked for `newquranku:*`, every one of them would find their thread
 * and bookmark gone. So on first load under the new name we copy each old key across, once, then drop
 * the old one. Idempotent: after the first run the old keys are gone and this does nothing.
 *
 * Must run BEFORE anything reads storage (thread restore, theme, size, bookmark). See main.ts boot.
 */
const RENAMES: readonly (readonly [string, string])[] = [
  ["nur:thread", "newquranku:thread"],
  ["nur:baca", "newquranku:baca"],
  ["nur:theme", "newquranku:theme"],
  ["nur:ar", "newquranku:ar"],
  ["nur:lens", "newquranku:lens"],
  ["nur:explained", "newquranku:explained"],
];

export function migrateStorage(): void {
  try {
    for (const [oldKey, newKey] of RENAMES) {
      const value = localStorage.getItem(oldKey);
      if (value === null) continue;
      // Old data yields only to the ABSENCE of new data — never clobber something already written
      // under the new key (a second run, or a reader who used the new build before this shipped).
      if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  } catch {
    // Private mode / quota / disabled storage. Migration is best-effort; the app works without it.
  }
}
