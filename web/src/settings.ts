/**
 * Pengaturan — the settings a reader may change, and the hard line around them.
 *
 * THE LINE. Settings change how content is PRESENTED, never which content is PERMITTED. There is
 * no toggle here for hadith text, none for AI-authored answers, none for "show me rulings". Those
 * are governed by `SHOW_MACHINE_HADITH_TEXT`, the `fatwaShape` guard and the ustadz's review, and a
 * user-facing switch would be a way to route around a scholarly decision by clicking. A reader may
 * decide how the page looks and which sourced translation leads. A reader may not promote unreviewed
 * material into view. `settings.test.ts` pins this as an anti-test, because it is the kind of line
 * that erodes one reasonable-sounding feature request at a time.
 *
 * ONE OWNER. The header already has a theme toggle and an Arabic-size group, and they stay — they
 * are in-context controls you reach while reading, and a modal would make the common case slower.
 * But two surfaces writing the same storage is how they drift, so every key is read and written
 * HERE and nowhere else. The header handlers call these functions; the panel calls these functions.
 */

/** Every key this app persists. Named in one place so "hapus data" cannot miss one. */
export const KEYS = {
  theme: "newquranku:theme",
  arabicSize: "newquranku:ar",
  explained: "newquranku:explained",
  translation: "newquranku:trans",
  reduceMotion: "newquranku:reduce-motion",
} as const;

export type ThemeChoice = "light" | "dark" | "system";
export type TranslationChoice = "tafsiriyah" | "harfiyah" | "both";

const store = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Safari in private mode throws on ACCESS, not just on write. A settings module that cannot
    // read storage must still render the panel with defaults rather than take the app down.
    return null;
  }
};

const read = (k: string): string | null => {
  try {
    return store()?.getItem(k) ?? null;
  } catch {
    return null;
  }
};

const write = (k: string, v: string): void => {
  try {
    store()?.setItem(k, v);
  } catch {
    /* storage full or blocked — the in-memory DOM effect below still applies for this session */
  }
};

// ── Theme ────────────────────────────────────────────────────────────────────

/**
 * "Ikut sistem" must REMOVE the attribute, never compute a value into it.
 *
 * This app has been bitten here before: the panel flips on the `data-theme` attribute while the ink
 * tokens flip on `prefers-color-scheme`. Writing `data-theme="light"` because the OS currently
 * reports light does two wrong things — it freezes the choice at the moment the reader picked
 * "system", so the page stops following the OS at sunset; and it can pin the two mechanisms to
 * opposite values, which paints panel text white-on-white while every DOM assertion still passes.
 * Absence of the attribute IS the "follow the system" state, so absence is what we store.
 */
export function applyTheme(choice: ThemeChoice): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function getTheme(): ThemeChoice {
  const v = read(KEYS.theme);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function setTheme(choice: ThemeChoice): void {
  write(KEYS.theme, choice);
  applyTheme(choice);
}

// ── Arabic size ──────────────────────────────────────────────────────────────

export type SizeKey = "s" | "m" | "l";

export function getArabicSize(): SizeKey {
  const v = read(KEYS.arabicSize);
  return v === "s" || v === "m" || v === "l" ? v : "m";
}

export function setArabicSize(k: SizeKey): void {
  write(KEYS.arabicSize, k);
}

// ── Which translation leads ──────────────────────────────────────────────────

/**
 * The most app-specific setting here, and the one with an actual argument behind it.
 *
 * Two Indonesian translations ship, and they are not two renderings of the same thing: Thalib's
 * *tafsiriyah* renders meaning, Kemenag's *harfiyah* renders words. This project exists partly
 * because the literal one "renders words, not meaning" (see ISA.md § Problem) — which makes which
 * one leads a genuine reading preference, not a formatting nicety. The app already ships an
 * explainer for why there are two (`#info`); offering the explanation without offering the choice
 * was the gap.
 *
 * Note what this does NOT do: neither translation is hidden or replaced, and no new text enters the
 * app. It reorders two things already on the page.
 */
export function getTranslation(): TranslationChoice {
  const v = read(KEYS.translation);
  return v === "tafsiriyah" || v === "harfiyah" || v === "both" ? v : "tafsiriyah";
}

export function setTranslation(c: TranslationChoice): void {
  write(KEYS.translation, c);
  globalThis.document?.documentElement.setAttribute("data-trans", c);
}

// ── Motion ───────────────────────────────────────────────────────────────────

/**
 * An explicit opt-in for readers whose OS setting is unset.
 *
 * The stylesheet already honours `prefers-reduced-motion`, which covers people who have told their
 * device. It cannot help someone who has not — and on a shared or borrowed phone, that is most
 * people. Setting the attribute lets the same CSS serve both, so this adds an input, not a rule.
 */
export function getReduceMotion(): boolean {
  return read(KEYS.reduceMotion) === "1";
}

export function setReduceMotion(on: boolean): void {
  write(KEYS.reduceMotion, on ? "1" : "0");
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.toggleAttribute("data-reduce-motion", on);
}

// ── Deleting what the app knows ──────────────────────────────────────────────

/**
 * What "hapus data" is allowed to remove, and why it is enumerated rather than swept.
 *
 * People ask this app about anxiety, debt, sin, marriage and death, on devices they share with
 * their family. A visible, plain-language delete is the floor for an app people confide in, not a
 * feature. But `localStorage.clear()` is the wrong instrument twice over: this origin may hold keys
 * belonging to something else, and a blanket wipe cannot be described honestly to the person
 * pressing it. So the panel names what it deletes, and this list is what it names.
 *
 * The settings themselves are deliberately NOT deleted. Someone clearing a private conversation off
 * a shared phone is not asking to have their text size reset, and surprising them is how a privacy
 * control stops being trusted.
 */
const CONVERSATION_PREFIXES = ["newquranku:thread", "newquranku:turns", "newquranku:bookmark", "newquranku:history"] as const;

/** The keys a delete would remove, resolved against what is actually stored. Preview, then act. */
export function deletableKeys(): string[] {
  const s = store();
  if (!s) return [];
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && CONVERSATION_PREFIXES.some((p) => k.startsWith(p))) out.push(k);
  }
  return out.sort();
}

/** Remove conversation history and bookmarks. Returns how many keys went, for honest UI copy. */
export function deleteConversationData(): number {
  const s = store();
  if (!s) return 0;
  const keys = deletableKeys();
  for (const k of keys) {
    try {
      s.removeItem(k);
    } catch {
      /* ignore — reported count below reflects what we attempted */
    }
  }
  return keys.length;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

/** Apply every stored setting to the document. Idempotent; safe to call before first paint. */
export function applyAllSettings(): void {
  applyTheme(getTheme());
  setTranslationAttributeOnly(getTranslation());
  const root = globalThis.document?.documentElement;
  root?.toggleAttribute("data-reduce-motion", getReduceMotion());
}

/** Reflect the stored choice into the DOM without re-writing storage (boot path). */
function setTranslationAttributeOnly(c: TranslationChoice): void {
  globalThis.document?.documentElement.setAttribute("data-trans", c);
}
