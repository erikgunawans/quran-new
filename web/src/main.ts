import "./styles.css";
import "./read.css";
import { announce } from "./announce.ts";
import { crisisReply, detectCrisis } from "./crisis.ts";
import { compose, retrieve, type Corpus, type Hit, type Voice } from "./retrieve.ts";
import { CORPUS_VERSION, displayName, evictStaleCaches, loadAyah, parseRef, ShardError, surahMeta } from "./quran.ts";
import { renderIndex, renderSurah } from "./read.ts";
import { copyVerse, shareVerse } from "./share.ts";
import { esc, fromShard, verseEl, type VerseCard } from "./verse.ts";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const thread = $<HTMLDivElement>("#thread");
const form = $<HTMLFormElement>("#composer");
const input = $<HTMLTextAreaElement>("#q");
const send = $<HTMLButtonElement>("#send");
const app = $<HTMLElement>("#app");

let corpus: Corpus | null = null;
let voices = new Map<string, Voice>();

/**
 * Verses currently in the chat thread, so copy/share can find one by ref.
 *
 * Bounded. This used to grow forever — one entry per verse ever rendered, never cleared, in a
 * thread that also grows forever, on the mid-range Android in the brief. Only the most recent
 * exchanges are reachable by tapping anyway, so holding the rest was pure leak.
 */
const MAX_CARDS = 60;
const onScreen = new Map<string, VerseCard>();

const remember = (card: VerseCard) => {
  onScreen.delete(card.ref); // re-inserting moves it to the end — Map preserves insertion order
  onScreen.set(card.ref, card);
  while (onScreen.size > MAX_CARDS) {
    const oldest = onScreen.keys().next().value;
    if (oldest === undefined) break;
    onScreen.delete(oldest);
  }
};

/** One owner for the live region — see announce.ts. */
const say = announce;

// ── rendering ────────────────────────────────────────────────────────────────
function tafsirEl(v: { tafsir: { source_id: string; text: string; lang: string }[] }): string {
  if (!v.tafsir.length) {
    return `<div class="silence">Belum ada tafsir terverifikasi untuk ayat ini di korpus kami. Kami memilih diam daripada mengarang.</div>`;
  }

  const stack = v.tafsir
    .map((t) => {
      const src = voices.get(t.source_id);
      // An English tafsir shown to an Indonesian reader is the exact wound this product exists
      // to heal. It may still appear — dropping a scholar is worse than showing him — but it is
      // labelled, so nobody is left thinking the fault is theirs for not understanding it.
      const foreign = t.lang !== "id";
      return `
        <div class="scholar${foreign ? " foreign" : ""}">
          <div class="who">
            <span class="by"><b>${esc(src?.author ?? t.source_id)}</b></span>
            <span class="tier">${esc(src?.era ?? "")} · tier ${src?.authority_tier ?? "?"}</span>
            ${foreign ? `<span class="lang-warn">teks bahasa Inggris — belum ada terjemahannya</span>` : ""}
          </div>
          <p class="txt"${foreign ? ' lang="en"' : ""}>${esc(t.text)}</p>
        </div>`;
    })
    .join("");

  return `<details class="sources">
            <summary>Lihat ${v.tafsir.length} ulama membahas ayat ini</summary>
            ${stack}
          </details>`;
}

function mount(card: VerseCard): string {
  remember(card);
  return verseEl(card);
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

  // ── before anything else ──────────────────────────────────────────────────
  //
  // Crisis check runs FIRST — before reference parsing, before retrieval, before Nur gets to be
  // clever. "aku gak sanggup bayar utang, pengen mati aja" used to match on `utang` and come back
  // with a verse about loan terms. The app answered the topic and missed the person.
  //
  // Nothing gets to answer ahead of this.
  const crisis = detectCrisis(q);
  if (crisis) {
    loading.remove();
    answer.innerHTML = crisisReply();
    thread.append(answer);
    scrollDown();
    say("Nur menampilkan bantuan darurat. Telepon 119 lalu tekan 8 untuk bicara dengan seseorang.");
    return;
  }

  // Reference resolution is LOCAL — the surah index is inlined, not fetched. Nur can tell the
  // truth about what the Qur'an contains even with no network at all.
  const ref = parseRef(q);

  try {
    if (ref.kind === "no-such-surah") {
      answer.innerHTML = `<p class="said">Surah ${ref.surah} tidak ada. Al-Qur'an punya <b>114 surah</b> — coba cek lagi nomornya.</p>`;
    } else if (ref.kind === "no-such-ayah") {
      answer.innerHTML = `<p class="said">Surah ${esc(displayName(ref.surah.n))} cuma punya <b>${ref.surah.ayahs} ayat</b>, jadi ayat ${ref.ayah} tidak ada. Mau buka surahnya?</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${ref.surah.n}">Baca ${esc(displayName(ref.surah.n))} →</a></div>`;
    } else if (ref.kind === "surah") {
      answer.innerHTML = `<p class="said">Ini surah ${esc(displayName(ref.surah.n))} — ${ref.surah.ayahs} ayat.</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${ref.surah.n}">Baca ${esc(displayName(ref.surah.n))} →</a></div>`;
    } else if (ref.kind === "ayah") {
      // The verse is real. We have it. There is no world in which we deny it.
      const v = await loadAyah(ref.surah.n, ref.ayah);
      const card = fromShard(v, ref.surah.n, displayName(ref.surah.n));
      card.continueTo = true; // the peak gets a landing
      card.animate = true;
      answer.innerHTML = `<p class="said">Ini ${esc(displayName(ref.surah.n))} ${ref.surah.n}:${ref.ayah}.</p>` + mount(card);
      say(`${displayName(ref.surah.n)} ${ref.surah.n}:${ref.ayah} ditampilkan.`);
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
                extra: tafsirEl(h.verse),
                continueTo: true,
                animate: true,
              };
              return mount(card);
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
function markNav(reading: boolean) {
  const tanya = $<HTMLAnchorElement>("#nav-tanya");
  const baca = $<HTMLAnchorElement>("#nav-baca");
  for (const [el, on] of [
    [tanya, !reading],
    [baca, reading],
  ] as const) {
    if (on) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

async function route() {
  const hash = location.hash;
  const m = hash.match(/^#\/surah\/(\d{1,3})(?:#(\d{1,3}))?$/);

  if (m) {
    markNav(true);
    chatView.hidden = true;
    readView.hidden = false;
    await renderSurah(readView, Number(m[1]), m[2] ? Number(m[2]) : undefined);
    return;
  }

  if (hash === "#/baca") {
    markNav(true);
    chatView.hidden = true;
    readView.hidden = false;
    renderIndex(readView);
    return;
  }

  markNav(false);
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

  const act = el.closest<HTMLButtonElement>("[data-act]");
  if (!act) return;
  const kind = act.dataset["act"];
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
    // Versioned, for the same reason the shards are: without it, a corpus rebuild leaves every
    // CDN and every phone serving the previous scripture until some cache decides to expire.
    const res = await fetch(`/corpus.json?v=${CORPUS_VERSION}`);
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
  const savedTheme = localStorage.getItem("nur:theme");
  if (savedTheme) document.documentElement.dataset["theme"] = savedTheme;

  const savedSize = localStorage.getItem("nur:ar") as keyof typeof SIZES | null;
  if (savedSize) {
    document.documentElement.style.setProperty("--ar-size", SIZES[savedSize]);
    for (const b of $("#size").querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b.dataset["size"] === savedSize));
    }
  }

  // Shards from a previous corpus version are no longer this scripture. Drop them.
  void evictStaleCaches();

  void route();
  void bootCorpus();
})();

// Keep the reading surface reachable even before the corpus lands.
export { surahMeta, app };
