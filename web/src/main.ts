import "./styles.css";
import "./read.css";
import { compose, retrieve, type Corpus, type Hit, type Voice } from "./retrieve.ts";
import { CRISIS_RESOURCE, detectCrisis } from "./crisis.ts";
import { toggleAudio } from "./audio.ts";
import { loadAyah, parseRef, ShardError, surahMeta } from "./quran.ts";
import { renderIndex, renderSurah } from "./read.ts";
import { copyVerse, shareVerse } from "./share.ts";
import { applyLens, bindLazyTafsir, getLens, sortStacks, tafsirEl, type TafsirLens } from "./tafsir.ts";
import { renderTheme, renderThemeIndex } from "./themes.ts";
import { esc, fromShard, resetPlayButton, setPlayButton, verseEl, type VerseCard } from "./verse.ts";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const thread = $<HTMLDivElement>("#thread");
const form = $<HTMLFormElement>("#composer");
const input = $<HTMLTextAreaElement>("#q");
const send = $<HTMLButtonElement>("#send");
const app = $<HTMLElement>("#app");
const live = $<HTMLElement>("#live");

let corpus: Corpus | null = null;
let voices = new Map<string, Voice>();
/** Every verse currently on screen, so copy/share can find it by ref. */
const onScreen = new Map<string, VerseCard>();

const say = (msg: string) => {
  live.textContent = msg;
};

// ── the crisis path ──────────────────────────────────────────────────────────
//
// Shown ALONGSIDE whatever Nur would otherwise say (Erik's ruling, 2026-07-14), never in place
// of it — so this is prepended to the answer, not a replacement branch. role="alert" is
// deliberate: this must reach a screen-reader user immediately, not wait on the polite #live
// region the rest of `say()` uses.
function crisisEl(): string {
  return `<div class="crisis" role="alert">
    <p class="crisis-title">${esc(CRISIS_RESOURCE.title)}</p>
    <p>${esc(CRISIS_RESOURCE.body)}</p>
    <p class="crisis-hotline"><b>${esc(CRISIS_RESOURCE.hotline)}</b> — <b>${esc(CRISIS_RESOURCE.phone)}</b></p>
    <p class="crisis-note">${esc(CRISIS_RESOURCE.note)}</p>
  </div>`;
}

function mount(card: VerseCard, turnCards?: VerseCard[]): string {
  onScreen.set(card.ref, card);
  turnCards?.push(card);
  return verseEl(card);
}

// ── thread persistence ──────────────────────────────────────────────────────
//
// Verified live: 2 messages in the thread → reload → 0. Every exchange is stored as its own
// turn — the question plus the ALREADY-RENDERED answer HTML and the verse cards it mounted — so
// restoring on load replays exactly what happened without refetching anything or depending on
// the corpus (or the network) being available again.
interface ThreadTurn {
  q: string;
  html: string;
  cards: VerseCard[];
}
const THREAD_KEY = "nur:thread";
/** A session that never ends would grow localStorage without bound. 40 exchanges is plenty of
 * scrollback and stays well under any realistic storage quota. */
const MAX_THREAD_TURNS = 40;
let threadHistory: ThreadTurn[] = [];

function saveThread() {
  try {
    localStorage.setItem(THREAD_KEY, JSON.stringify(threadHistory.slice(-MAX_THREAD_TURNS)));
  } catch {
    // Quota exceeded or storage disabled (private browsing). Persistence is a nicety here —
    // the thread still works for the rest of this session, it just won't survive a reload.
  }
}

/** Returns true if a saved thread was found and restored. */
function restoreThread(): boolean {
  let saved: ThreadTurn[];
  try {
    const raw = localStorage.getItem(THREAD_KEY);
    if (!raw) return false;
    saved = JSON.parse(raw) as ThreadTurn[];
  } catch {
    return false;
  }
  if (!Array.isArray(saved) || !saved.length) return false;

  $("#hello")?.remove();
  for (const turn of saved) {
    const me = document.createElement("div");
    me.className = "msg me";
    me.textContent = turn.q;
    thread.append(me);

    const answer = document.createElement("div");
    answer.className = "msg nur";
    answer.innerHTML = turn.html;
    thread.append(answer);

    for (const card of turn.cards) onScreen.set(card.ref, card);
  }
  threadHistory = saved;
  showChat();
  return true;
}

function skeleton(): HTMLElement {
  const el = document.createElement("div");
  el.className = "msg nur";
  el.innerHTML = `<div class="skeleton" aria-hidden="true">
    <div class="sk-line short"></div><div class="sk-line ar"></div>
    <div class="sk-line"></div><div class="sk-line short"></div></div>`;
  return el;
}

const scrollDown = () =>
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));

// ── ask ──────────────────────────────────────────────────────────────────────
//
// The old code had ONE failure sentence — "aku belum menemukan ayat yang cocok" — and used it
// for everything. So when a user asked for 18:10, a real ayah in Al-Kahf, Nur told them it did
// not exist. That is not honest silence; it is a lie by omission, and it is the failure that
// ends trust in a scripture app permanently.
//
// There are FOUR distinct truths here, and they now have four distinct answers:
//   1. A real ayah we hold          → render it.
//   2. A real surah, no ayah given  → open it for reading.
//   3. Not a real reference         → say exactly why, with the true bound (110 ayahs, 114 surahs).
//   4. A question with no match     → honest silence — and only here.
async function ask(question: string) {
  const q = question.trim();
  if (!q) return;

  $("#hello")?.remove();
  showChat();

  const me = document.createElement("div");
  me.className = "msg me";
  me.textContent = q;
  thread.append(me);

  const loading = skeleton();
  thread.append(loading);
  scrollDown();

  const answer = document.createElement("div");
  answer.className = "msg nur";
  /** Cards mounted THIS turn, so the persisted history can repopulate `onScreen` on restore. */
  const turnCards: VerseCard[] = [];
  // Checked on the RAW question, before any ref/retrieval branching below — a crisis phrase
  // matters regardless of whether the rest of the message also happens to look like a verse ref.
  const crisis = detectCrisis(q);

  // Reference resolution is LOCAL — the surah index is inlined, not fetched. Nur can tell the
  // truth about what the Qur'an contains even with no network at all.
  const ref = parseRef(q);

  try {
    if (ref.kind === "no-such-surah") {
      answer.innerHTML = `<p class="said">Surah ${ref.surah} tidak ada. Al-Qur'an punya <b>114 surah</b> — coba cek lagi nomornya.</p>`;
    } else if (ref.kind === "no-such-ayah") {
      answer.innerHTML = `<p class="said">Surah ${esc(ref.surah.tl)} cuma punya <b>${ref.surah.ayahs} ayat</b>, jadi ayat ${ref.ayah} tidak ada. Mau buka surahnya?</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${ref.surah.n}">Baca ${esc(ref.surah.tl)} →</a></div>`;
    } else if (ref.kind === "surah") {
      answer.innerHTML = `<p class="said">Ini surah ${esc(ref.surah.tl)} — ${ref.surah.ayahs} ayat.</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${ref.surah.n}">Baca ${esc(ref.surah.tl)} →</a></div>`;
    } else if (ref.kind === "ayah") {
      // The verse is real. We have it. There is no world in which we deny it.
      const v = await loadAyah(ref.surah.n, ref.ayah);
      const card = fromShard(v, ref.surah.n, ref.surah.tl);
      card.continueTo = true; // the peak gets a landing
      answer.innerHTML =
        `<p class="said">Ini ${esc(ref.surah.tl)} ${ref.surah.n}:${ref.ayah}.</p>` + mount(card, turnCards);
      say(`${ref.surah.tl} ${ref.surah.n}:${ref.ayah} ditampilkan.`);
    } else {
      // Not a reference — a question. Now, and only now, retrieval may come up empty.
      if (!corpus) throw new Error("corpus");
      const hits: Hit[] = retrieve(corpus, q);

      if (!hits.length) {
        answer.innerHTML = `
          <p class="said">Aku belum menemukan ayat yang cocok dengan itu di korpus yang sudah diverifikasi.</p>
          <div class="silence">
            Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak.
            Coba ceritakan dengan kata lain — atau sebutkan surah dan ayatnya langsung, misalnya <b>18:10</b>.
          </div>`;
        say("Belum ada ayat yang cocok. Nur tidak mengarang jawaban.");
      } else {
        answer.innerHTML =
          `<p class="said">${compose(hits, q)}</p>` +
          hits
            .map((h) => {
              const card: VerseCard = {
                ref: h.verse.ref,
                surah: h.verse.surah,
                ayah: h.verse.ayah,
                surah_name: h.verse.surah_name,
                arabic: h.verse.arabic,
                primary: h.verse.primary,
                companion: h.verse.companion,
                why: h.verse.why,
                extra: tafsirEl(h.verse.tafsir, voices),
                continueTo: true,
              };
              return mount(card, turnCards);
            })
            .join("");
        say(
          `${hits.length} ayat ditemukan. ${hits
            .map((h) => `${h.verse.ref}, terjemah makna oleh ${h.verse.primary?.translator ?? "?"}`)
            .join(". ")}`,
        );
      }
    }
  } catch (err) {
    const msg =
      err instanceof ShardError
        ? err.message
        : "Ada yang salah saat mengambil ayatnya. Mungkin koneksimu sedang tidak stabil.";
    answer.innerHTML = `<div class="oops"><p>${esc(msg)}</p>
      <button class="act retry" data-retry="${esc(q)}">Coba lagi</button></div>`;
    say(msg);
  }

  // Prepended here, after the try/catch, so it applies uniformly to every branch above (a real
  // ayah, a bad ref, a retrieval hit, honest silence, even a fetch error) without duplicating
  // the check into each one. Whatever Nur would otherwise say still follows — it is never
  // replaced.
  if (crisis) {
    answer.innerHTML = crisisEl() + answer.innerHTML;
  }

  threadHistory.push({ q, html: answer.innerHTML, cards: turnCards });
  saveThread();

  loading.remove();
  thread.append(answer);
  scrollDown();
}

// ── routing ──────────────────────────────────────────────────────────────────
//
// Hash routing, so back/forward work and a verse has a URL you can return to. Chat is never
// destroyed — it is hidden and restored, because losing the thread when you tap "read" would
// punish exactly the person we built this for.
const chatView = $<HTMLElement>("#chat");
const readView = $<HTMLElement>("#read");

function showChat() {
  chatView.hidden = false;
  readView.hidden = true;
}

/** Tell the reader — and the screen reader — which door they are standing in. */
function markNav(mode: "tanya" | "baca" | "tema") {
  const links = { tanya: $<HTMLAnchorElement>("#nav-tanya"), baca: $<HTMLAnchorElement>("#nav-baca"), tema: $<HTMLAnchorElement>("#nav-tema") };
  for (const [key, el] of Object.entries(links)) {
    if (key === mode) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

async function route() {
  const hash = location.hash;
  const m = hash.match(/^#\/surah\/(\d{1,3})(?:#(\d{1,3}))?$/);
  const t = hash.match(/^#\/tema\/([a-z0-9-]+)$/);

  if (m) {
    markNav("baca");
    chatView.hidden = true;
    readView.hidden = false;
    await renderSurah(readView, Number(m[1]), m[2] ? Number(m[2]) : undefined);
    return;
  }

  if (hash === "#/baca") {
    markNav("baca");
    chatView.hidden = true;
    readView.hidden = false;
    renderIndex(readView);
    return;
  }

  if (t) {
    markNav("tema");
    chatView.hidden = true;
    readView.hidden = false;
    await renderTheme(readView, t[1]!);
    return;
  }

  if (hash === "#/tema") {
    markNav("tema");
    chatView.hidden = true;
    readView.hidden = false;
    renderThemeIndex(readView);
    return;
  }

  markNav("tanya");
  showChat();
}

window.addEventListener("hashchange", () => void route());

// ── composer ─────────────────────────────────────────────────────────────────
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  void ask(q);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 112) + "px";
  send.disabled = !input.value.trim();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ── actions: seeds, copy, share, retry ───────────────────────────────────────
document.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;

  const seed = el.closest<HTMLButtonElement>(".seed");
  if (seed) {
    void ask(seed.textContent!.trim());
    return;
  }

  const retry = el.closest<HTMLButtonElement>("[data-retry]");
  if (retry) {
    const q = retry.dataset["retry"]!;
    retry.closest(".msg")?.remove();
    void ask(q);
    return;
  }

  const boot = el.closest<HTMLButtonElement>("#boot-retry");
  if (boot) {
    void bootCorpus();
    return;
  }

  const lensBtn = el.closest<HTMLButtonElement>("[data-lens]");
  if (lensBtn) {
    applyLens(lensBtn.dataset["lens"] as TafsirLens);
    return;
  }

  const act = el.closest<HTMLButtonElement>("[data-act]");
  if (!act) return;
  const kind = act.dataset["act"];

  if (kind === "play") {
    const surah = Number(act.dataset["surah"]);
    const ayah = Number(act.dataset["ayah"]);
    const ref = act.dataset["ref"] ?? "";
    void (async () => {
      const { playing, previous, failed } = await toggleAudio(surah, ayah, ref);
      if (previous) resetPlayButton(previous);
      setPlayButton(act, playing);
      say(failed ? "Gagal memutar audio. Coba lagi." : playing ? `Memutar ayat ${ref}.` : "Jeda.");
    })();
    return;
  }

  const card = onScreen.get(act.dataset["ref"] ?? "");
  if (!card || (kind !== "copy" && kind !== "share")) return;

  void (async () => {
    const ok = kind === "copy" ? ((await copyVerse(card)) ? "copied" : "failed") : await shareVerse(card);
    const label = act.querySelector("span:last-child") ?? act;
    const original = act.dataset["label"] ?? act.textContent!.trim();
    act.dataset["label"] = original;

    act.classList.toggle("ok", ok !== "failed");
    label.textContent = ok === "failed" ? " Gagal menyalin" : ok === "shared" ? " Dibagikan" : " Tersalin";
    say(ok === "failed" ? "Gagal menyalin ayat." : "Ayat tersalin, lengkap dengan sumbernya.");

    setTimeout(() => {
      act.classList.remove("ok");
      label.textContent = " " + original.replace(/^[⧉↗]\s*/, "");
    }, 1800);
  })();
});

// ── scripture size — scales alone, never the UI ──────────────────────────────
const SIZES = { s: "1.7rem", m: "2.1rem", l: "2.7rem" } as const;
$("#size").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  const key = btn.dataset["size"] as keyof typeof SIZES;
  document.documentElement.style.setProperty("--ar-size", SIZES[key]);
  localStorage.setItem("nur:ar", key);
  for (const b of $("#size").querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b === btn));
  }
});

// ── the "why two translations" popover ───────────────────────────────────────
//
// The two-translation concept is the entire reason Nur exists, but nothing in the UI ever
// explained it — the labels ("Terjemah makna" / "Terjemah harfiah") assumed the reader already
// knew why there were two. The #hello explainer covers the first visit; this covers every visit
// after the greeting is gone.
const infoBtn = $<HTMLButtonElement>("#info");
const infoPanel = $<HTMLElement>("#info-panel");
infoBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = infoPanel.hidden;
  infoPanel.hidden = !open;
  infoBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (infoPanel.hidden) return;
  if (e.target === infoBtn || infoBtn.contains(e.target as Node)) return;
  if (infoPanel.contains(e.target as Node)) return;
  infoPanel.hidden = true;
  infoBtn.setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !infoPanel.hidden) {
    infoPanel.hidden = true;
    infoBtn.setAttribute("aria-expanded", "false");
    infoBtn.focus();
  }
});

// ── theme — both modes are first-class ───────────────────────────────────────
$("#theme").addEventListener("click", () => {
  const cur =
    document.documentElement.dataset["theme"] ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset["theme"] = next;
  localStorage.setItem("nur:theme", next);
});

// ── boot ─────────────────────────────────────────────────────────────────────
//
// The old boot did `await fetch("/corpus.json")` with no try/catch and no res.ok check. On a
// failed request the promise rejected, `corpus` stayed null, the send button stayed disabled
// forever, and every seed click did nothing. The user saw a beautiful, completely dead app with
// no message — on exactly the patchy 4G this product targets.
//
// Note what is NOT gated on this fetch any more: reference lookup and the entire reading surface.
// The surah index is inlined in the bundle, so even if corpus.json never arrives, you can still
// ask for 18:10 and still read Al-Kahf. Only the chat retrieval degrades.
async function bootCorpus(): Promise<void> {
  const banner = $("#boot-error");
  banner.hidden = true;
  send.disabled = true;

  try {
    const res = await fetch("/corpus.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    corpus = (await res.json()) as Corpus;
    voices = new Map(corpus.sources.map((s) => [s.id, s]));
    send.disabled = !input.value.trim();
    banner.hidden = true;
  } catch {
    corpus = null;
    banner.hidden = false;
    banner.innerHTML = `
      <p><b>Gagal memuat korpus.</b> Koneksimu sepertinya sedang tidak stabil.</p>
      <p class="sub">Kamu masih bisa membaca Al-Qur'an dan membuka ayat lewat nomornya — yang belum bisa cuma pencarian lewat percakapan.</p>
      <button class="act" id="boot-retry">Coba lagi</button>`;
    // Chat cannot run without the corpus, but reading can. Do not pretend otherwise.
    send.disabled = true;
    say("Gagal memuat korpus. Membaca Al-Qur'an tetap bisa.");
  }
}

(() => {
  bindLazyTafsir();

  const savedTheme = localStorage.getItem("nur:theme");
  if (savedTheme) document.documentElement.dataset["theme"] = savedTheme;

  const savedSize = localStorage.getItem("nur:ar") as keyof typeof SIZES | null;
  if (savedSize) {
    document.documentElement.style.setProperty("--ar-size", SIZES[savedSize]);
    for (const b of $("#size").querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b.dataset["size"] === savedSize));
    }
  }

  restoreThread();
  // A restored card's tafsir stack was baked with whatever lens was active when it was FIRST
  // saved. If the reader's saved lens preference has since changed, re-sort on load so every
  // stack on screen (restored or not) reflects the reader's current choice — WITHOUT writing to
  // storage ourselves; boot only ever reads a preference, same as the theme/size restore above.
  sortStacks(getLens());
  void route();
  void bootCorpus();
})();

// Keep the reading surface reachable even before the corpus lands.
export { surahMeta, app };
