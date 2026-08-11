/**
 * The Pengaturan dialog's behaviour. State lives in `settings.ts`; this file only binds it to DOM.
 *
 * MIRRORING, WITHOUT A SECOND SOURCE OF TRUTH. The header keeps its own theme toggle and Arabic-size
 * group — they are in-context controls you reach while reading, and routing them through a modal
 * would make the common case slower. That leaves two surfaces over one piece of state, which is how
 * they drift apart. The size row here does not re-implement sizing: it CLICKS the header's own
 * button and lets the existing handler do the work, so the two cannot disagree even in principle.
 *
 * Theme cannot use that trick, because the header control is a binary toggle and "ikut sistem" is a
 * third state it has no way to express. So theme is owned by `settings.ts` and the panel writes it
 * directly — which is also why "ikut sistem" is the option that only exists here.
 */
import {
  applyAllSettings,
  deletableKeys,
  deleteConversationData,
  getArabicSize,
  getReduceMotion,
  getTheme,
  getTranslation,
  setArabicSize,
  setReduceMotion,
  setTheme,
  setTranslation,
  type SizeKey,
  type ThemeChoice,
  type TranslationChoice,
} from "./settings.ts";

/** Reflect the chosen value across a segmented group. `aria-pressed` IS the state, not a class. */
function press(group: HTMLElement | null, attr: string, value: string): void {
  if (!group) return;
  for (const b of group.querySelectorAll<HTMLButtonElement>("button")) {
    b.setAttribute("aria-pressed", String(b.dataset[attr] === value));
  }
}

const el = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

/** Paint every row from stored state. Called on open, so the panel can never show a stale choice. */
export function syncSettingsPanel(): void {
  press(el("#set-trans"), "trans", getTranslation());
  press(el("#set-theme"), "themeChoice", getTheme());
  press(el("#set-size"), "size", getArabicSize());
  press(el("#set-motion"), "motion", getReduceMotion() ? "1" : "0");
}

export function initSettings(): void {
  applyAllSettings();

  const dialog = el<HTMLDialogElement>("#settings-panel");
  const open = el<HTMLButtonElement>("#settings-open");
  if (!dialog || !open) return; // demo entry and tests may mount a page without the sidebar

  open.addEventListener("click", () => {
    syncSettingsPanel();
    // showModal, not show: the backdrop and inertness are the point of using <dialog> at all.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });

  el("#set-trans")?.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.trans;
    if (!v) return;
    setTranslation(v as TranslationChoice);
    press(el("#set-trans"), "trans", v);
  });

  el("#set-theme")?.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.themeChoice;
    if (!v) return;
    setTheme(v as ThemeChoice);
    press(el("#set-theme"), "themeChoice", v);
  });

  el("#set-size")?.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.size;
    if (!v) return;
    // Delegate to the header's own control so the two surfaces cannot drift. If it is absent
    // (a page that mounted without the panel top), fall back to writing the value directly.
    const header = el(`#size button[data-size="${v}"]`);
    if (header) (header as HTMLButtonElement).click();
    else setArabicSize(v as SizeKey);
    press(el("#set-size"), "size", v);
  });

  el("#set-motion")?.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.motion;
    if (!v) return;
    setReduceMotion(v === "1");
    press(el("#set-motion"), "motion", v);
  });

  el("#set-delete")?.addEventListener("click", () => {
    const btn = el<HTMLButtonElement>("#set-delete");
    const n = deletableKeys().length;
    if (n === 0) {
      // Say so rather than pretending to delete. A privacy control that reports success on an
      // empty store teaches the reader that the button is decorative.
      if (btn) btn.textContent = "Tidak ada data";
      return;
    }
    // Two presses, no `confirm()`. A native dialog inside an open <dialog> is a modal on a modal,
    // and the arming state is legible where a browser prompt is easy to dismiss without reading.
    if (btn?.dataset.armed !== "1") {
      if (btn) {
        btn.dataset.armed = "1";
        btn.textContent = `Hapus ${n} data — tekan lagi`;
      }
      return;
    }
    const removed = deleteConversationData();
    if (btn) {
      delete btn.dataset.armed;
      btn.textContent = `${removed} data dihapus`;
    }
    // The history list is rendered from what was just removed; leaving it on screen would be the
    // app showing content it no longer has.
    const history = el("#history");
    if (history) history.innerHTML = "";
  });
}
