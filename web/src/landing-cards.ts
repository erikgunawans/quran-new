/**
 * The two landing cards: a question generator and a "Populer" modal.
 *
 * They replace the four first-person feeling-seeds (Erik, 2026-08-12). Both hand their output to
 * the composer through the SAME path a typed question takes — set the value, submit the form — so
 * neither card gets a private route into retrieval that could drift from what typing does.
 *
 * THE MODAL IS A `<dialog>` WITH `showModal()`, not a div with a z-index. The backdrop, the
 * inertness of the page behind it, Escape-to-close and focus containment are the entire reason to
 * use the element; hand-rolling gets three of those four wrong and the fourth silently.
 *
 * THE POPULER LIST IS EDITORIAL AND SAYS SO. This edition keeps no usage telemetry — there is
 * nothing here that counts opens — so a card headed "popular" is a claim the app cannot support.
 * The copy says "pilihan kami", and the modal repeats it, because implying a measurement we never
 * took is the same class of dishonesty as composing a tafsir we never read.
 */
import { nextSeed } from "./ask-seeds.ts";

/** Surahs people actually come to a Qur'an app for — a curated list, and labelled as one. */
const POPULAR_SURAHS: readonly { n: number; name: string; why: string }[] = [
  { n: 36, name: "Yasin", why: "36 · 83 ayat" },
  { n: 18, name: "Al-Kahf", why: "18 · 110 ayat" },
  { n: 55, name: "Ar-Rahman", why: "55 · 78 ayat" },
  { n: 67, name: "Al-Mulk", why: "67 · 30 ayat" },
  { n: 56, name: "Al-Waqi'ah", why: "56 · 96 ayat" },
  { n: 1, name: "Al-Fatihah", why: "1 · 7 ayat" },
];

/** Routes that already exist. A dead link in a "popular" list is worse than a shorter list. */
const POPULAR_ELSEWHERE: readonly { href: string; label: string; note: string }[] = [
  { href: "#/doa", label: "Kumpulan Doa", note: "34 doa dengan sumbernya" },
  { href: "#/peta", label: "Indeks Tematik", note: "telusuri Al-Qur'an per tema" },
  { href: "#/baca", label: "Baca Al-Qur'an", note: "114 surah, lengkap dengan tafsir" },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function modalHtml(): string {
  const surahs = POPULAR_SURAHS.map(
    (s) =>
      `<a class="pop-item" href="#/surah/${s.n}"><span class="pop-item-n">${esc(s.name)}</span><span class="pop-item-w">${esc(s.why)}</span></a>`,
  ).join("");
  const others = POPULAR_ELSEWHERE.map(
    (o) =>
      `<a class="pop-item" href="${esc(o.href)}"><span class="pop-item-n">${esc(o.label)}</span><span class="pop-item-w">${esc(o.note)}</span></a>`,
  ).join("");
  return `
    <div class="pop-head">
      <h2>Pilihan kami</h2>
      <button type="button" class="pop-close" id="pop-close" aria-label="Tutup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <h3 class="pop-sub">Surah</h3>
    <div class="pop-grid">${surahs}</div>
    <h3 class="pop-sub">Jelajahi</h3>
    <div class="pop-grid">${others}</div>
    <p class="pop-note">Daftar ini kami susun sendiri, bukan hasil penghitungan — aplikasi ini tidak
      merekam apa yang kamu buka.</p>`;
}

/**
 * Send a question the way the reader would: fill the composer and submit it. Deliberately NOT a
 * direct call into `ask()` — a card with its own path into retrieval is a second entry point that
 * can drift from the typed one, and the drift is invisible until someone reports a question that
 * behaves differently depending on how it arrived.
 */
function askThrough(doc: Document, question: string): void {
  const form = doc.getElementById("composer") as HTMLFormElement | null;
  const input = form?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input[type=text]");
  if (!form || !input) return;
  input.value = question;
  input.dispatchEvent(new Event("input", { bubbles: true })); // unlock the send button's own guard
  form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

/** Safe on any document that lacks the cards — the demo bundle and tests mount partial pages. */
export function bindLandingCards(doc: Document = document): void {
  const q = doc.getElementById("seed-q");
  const shuffle = doc.getElementById("seed-shuffle");

  if (q) {
    q.textContent = nextSeed();
    q.addEventListener("click", () => askThrough(doc, q.textContent ?? ""));
    // `?? undefined` because nextSeed's exclude parameter is optional, and passing an empty string
    // would filter nothing while looking like it filtered something.
    shuffle?.addEventListener("click", () => {
      q.textContent = nextSeed(q.textContent ?? undefined);
    });
  }

  const open = doc.getElementById("pop-open");
  if (!open) return;

  let dialog: HTMLDialogElement | null = null;
  open.addEventListener("click", () => {
    if (!dialog) {
      dialog = doc.createElement("dialog");
      dialog.className = "pop-dialog";
      dialog.id = "pop-dialog";
      dialog.innerHTML = modalHtml();
      doc.body.appendChild(dialog);
      dialog.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        // Close on the X, and on any link — following one leaves the modal covering the page you
        // navigated to otherwise. Clicking the backdrop resolves to the dialog element itself.
        if (t.closest("#pop-close") || t.closest("a[href]") || t === dialog) dialog?.close();
      });
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
}
