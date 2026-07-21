/**
 * The product's core concept, finally explained.
 *
 * Nur hinges entirely on the difference between *terjemah makna* and *terjemah harfiah*. Every
 * verse card shows both, side by side, saying different things — and until now the app never once
 * told anyone why. Two critiques scored Help & Documentation 1/4, and it was the only heuristic
 * that never moved. A first-timer sees two translations disagreeing about the word of God and is
 * left to conclude that someone is lying, or that they are too ignorant to follow.
 *
 * Two decisions shape what follows.
 *
 * 1. IT LIVES AT THE POINT OF CONFUSION. Not an About page nobody opens. The labels themselves —
 *    "Terjemahan makna", "Terjemahan harfiah" — become the affordance: they are the thing you are
 *    confused by, so they are the thing you press.
 *
 * 2. IT SHOWS RATHER THAN LECTURES. The explanation is not a definition of translation theory;
 *    it is 2:156, the verse recited at every Muslim death, with both renderings side by side.
 *    Kemenag leaves the Arabic untranslated — a grieving person reads "Inna lillaahi wa innaa
 *    ilaihi raaji'uun" and understands nothing. The Tafsiriyah says "Kami semua adalah milik
 *    Allah." One example does what three paragraphs cannot.
 *
 * And it tells the truth against itself: the meaning-based rendering is NOT always better, and the
 * panel says so, naming 94:5 — where our own primary voice fails. An explainer that only sells the
 * product is advertising. This one has to be trustworthy, because trust is the entire thesis.
 */

const DIALOG_ID = "explain";

/**
 * 2:156 — the verse this product exists for.
 *
 * Quoted verbatim from the corpus rather than fetched, so the explainer opens instantly and works
 * with no network, exactly like the surah index. These two strings are the argument.
 */
const HARFIAH =
  '(yaitu) orang-orang yang apabila ditimpa musibah, mereka mengucapkan: "Inna lillaahi wa innaa ilaihi raaji\'uun".';
const MAKNA =
  'Ketika kaum mukmin ditimpa musibah, mereka berkata: "Kami semua adalah milik Allah. Kami semua pasti kembali kepada-Nya."';

function markup(): string {
  return `
    <dialog id="${DIALOG_ID}" class="explain" aria-labelledby="explain-title">
      <article>
        <header class="explain-head">
          <h2 id="explain-title">Kenapa ada dua terjemahan?</h2>
          <button class="explain-x" data-explain="close" aria-label="Tutup penjelasan">✕</button>
        </header>

        <p class="explain-lead">
          Al-Qur'an turun dalam bahasa Arab. Menerjemahkannya <b>selalu</b> berarti memilih — dan
          ada dua cara memilih. New-Quranku menampilkan keduanya, supaya kamu bisa melihat sendiri.
        </p>

        <div class="explain-kinds">
          <div class="explain-kind">
            <span class="chip lead">Terjemahan makna</span>
            <p>Menerjemahkan <b>maksud</b> ayat, bukan cuma kata-katanya. Lebih mudah dipahami — tapi
            di dalamnya sudah ada pilihan seorang manusia. Ini sudah masuk wilayah tafsir.</p>
          </div>
          <div class="explain-kind">
            <span class="chip">Terjemahan harfiah</span>
            <p>Menerjemahkan <b>kata per kata</b>, sedekat mungkin dengan aslinya. Paling setia pada
            teks — tapi kadang tidak sampai ke pembacanya.</p>
          </div>
        </div>

        <h3 class="explain-h3">Lihat bedanya di ayat yang paling sering dibaca saat kehilangan</h3>
        <p class="explain-ref">QS Al-Baqarah 2:156</p>

        <div class="explain-compare">
          <div class="explain-side">
            <span class="chip">Terjemahan harfiah</span>
            <p class="explain-txt">${HARFIAH}</p>
            <p class="explain-note">Kalau kamu tidak bisa bahasa Arab, kalimat terakhirnya
            <b>tidak memberitahu apa-apa</b>. Padahal justru kalimat itu yang dibaca orang saat
            ditinggal orang yang dicintainya.</p>
          </div>

          <div class="explain-side">
            <span class="chip lead">Terjemahan makna</span>
            <p class="explain-txt">${MAKNA}</p>
            <p class="explain-note">Sekarang kamu tahu apa yang sebenarnya diucapkan — dan kenapa
            orang mengucapkannya.</p>
          </div>
        </div>

        <p class="explain-why">
          Itu sebabnya New-Quranku menaruh <b>terjemah makna di depan</b>: supaya ayatnya sampai. Dan tetap
          menampilkan <b>terjemah harfiah di bawahnya</b>: supaya tidak ada yang disembunyikan dari
          kamu.
        </p>

        <div class="explain-honest">
          <p><b>Tapi terjemah makna tidak selalu lebih baik.</b></p>
          <p>Kadang justru sebaliknya. Di <b>QS 94:5</b>, terjemah harfiah membacanya sebagai janji —
          <i>sesudah kesulitan ada kemudahan</i> — sementara terjemah makna melunakkannya jadi
          gambaran umum kehidupan. Di ayat itu, terjemah harfiah yang lebih tepat.</p>
          <p>New-Quranku memberitahumu kalau itu terjadi. Kami tidak menyembunyikan kelemahan sumber kami
          sendiri — dan itulah kenapa keduanya selalu ditampilkan. <b>Kamu yang menilai.</b></p>
        </div>

        <button class="act explain-done" data-explain="close">Aku mengerti</button>
      </article>
    </dialog>`;
}

let dialog: HTMLDialogElement | null = null;

function ensure(): HTMLDialogElement {
  if (dialog?.isConnected) return dialog;
  document.body.insertAdjacentHTML("beforeend", markup());
  dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement;
  return dialog;
}

/**
 * Open the explainer.
 *
 * `showModal()` gives focus trapping, Escape-to-close, and an inert background for free — the
 * things a hand-rolled overlay always forgets. Once opened, we remember: the reader who has
 * already understood should not be asked to understand again.
 */
export function openExplainer(): void {
  const d = ensure();
  if (!d.open) d.showModal();
  try {
    localStorage.setItem("newquranku:explained", "1");
  } catch {
    /* private mode — the panel still works, it just asks again next time */
  }
  document.getElementById("nur-explain-hint")?.classList.add("seen");
}

export function closeExplainer(): void {
  dialog?.close();
}

/** Has this reader already been told? Drives the nudge on the empty state, nothing else. */
export const hasExplained = (): boolean => {
  try {
    return localStorage.getItem("newquranku:explained") === "1";
  } catch {
    return false;
  }
};
