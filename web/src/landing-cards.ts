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
 * Put a question INTO the composer — do not send it (Erik, 2026-08-12: "that random question will
 * appear in the main chat box. When you click again, it will rotate and generate a new one").
 *
 * The distinction is the whole design. Submitting on click makes the button a slot machine that
 * fires an answer at you; filling the box makes it a suggestion you can read, edit, or replace
 * before you commit to it. It also means the question still reaches retrieval through the ordinary
 * typed path, so there is no second entry point that could drift from what typing does.
 *
 * The button REPLACES whatever is in the box, including text the reader typed. That is the
 * behaviour asked for, and it is defensible because the press is explicit and unambiguous — but it
 * is worth naming, because it is the one way this control can destroy something.
 */
function fillComposer(doc: Document, question: string): void {
  const form = doc.getElementById("composer") as HTMLFormElement | null;
  const input = form?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input[type=text]");
  if (!input) return;
  input.value = question;
  // The send button is disabled until the field reports content, and the hero's textarea grows on
  // input — both listen for `input`, which a programmatic `.value =` does not fire on its own.
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

/** Safe on any document that lacks the pills — the demo bundle and tests mount partial pages. */
export function bindLandingCards(doc: Document = document): void {
  const q = doc.getElementById("seed-q");

  if (q) {
    // The rotation is tracked here rather than read back off the composer, so that editing the
    // suggested question by hand does not make the next press able to repeat it.
    let showing: string | undefined;
    q.addEventListener("click", () => {
      showing = nextSeed(showing);
      fillComposer(doc, showing);
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
