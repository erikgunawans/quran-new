import "./styles.css";
import { compose, retrieve, type Corpus, type Hit, type Reading, type Verse, type Voice } from "./retrieve.ts";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const thread = $<HTMLDivElement>("#thread");
const form = $<HTMLFormElement>("#composer");
const input = $<HTMLTextAreaElement>("#q");
const send = $<HTMLButtonElement>("#send");

let corpus: Corpus | null = null;
let voices = new Map<string, Voice>();

/**
 * Verses where the primary voice is known to diverge from the verse's plain sense.
 * Surfaced to the reader — we do not quietly ship a rendering we have doubts about.
 * (94:5-6: the Tafsiriyah flattens a promise into a general observation.)
 */
const FLAGGED: Record<string, string> = {
  "94:5": "Terjemah makna di atas membaca ayat ini sebagai gambaran umum kehidupan. Terjemah harfiah Kemenag membacanya sebagai janji: <em>sesudah kesulitan ada kemudahan</em>. Perbedaannya nyata — baca keduanya.",
  "94:6": "Sama seperti ayat sebelumnya. Al-Qur'an mengulang ayat ini — pengulangan itu sendiri adalah penegasan.",
};

// ── rendering ────────────────────────────────────────────────────────
function readingEl(r: Reading, lead: boolean): string {
  const label = lead ? "Terjemah makna" : "Terjemah harfiah";
  const kind = lead ? "primary" : "companion";
  return `
    <div class="reading ${kind}">
      <div class="who">
        <span class="chip ${lead ? "lead" : ""}">${label}</span>
        <span class="by">oleh <b>${esc(r.translator)}</b></span>
      </div>
      <p class="txt">${esc(r.text)}</p>
    </div>`;
}

function verseEl(v: Verse): string {
  const flag = FLAGGED[v.ref];
  const tafsir = v.tafsir
    .map((t) => {
      const src = voices.get(t.source_id);
      return `
        <div class="scholar">
          <div class="who">
            <span class="by"><b>${esc(src?.author ?? t.source_id)}</b></span>
            <span class="tier">${esc(src?.era ?? "")} · tier ${src?.authority_tier ?? "?"}</span>
          </div>
          <p class="txt">${esc(t.text)}</p>
        </div>`;
    })
    .join("");

  return `
    <article class="verse" data-new>
      <header class="verse-head">
        <span class="ref">${v.ref}</span>
        <span class="surah-name">${esc(v.surah_name)}</span>
        <span class="why">${esc(v.why)}</span>
      </header>

      <p class="ar" dir="rtl" lang="ar">${esc(v.arabic)}</p>

      ${v.primary ? readingEl(v.primary, true) : ""}
      ${v.companion ? readingEl(v.companion, false) : ""}

      ${
        flag
          ? `<div class="caution"><b>⚠</b><span>${flag}</span></div>`
          : ""
      }

      ${
        v.tafsir.length
          ? `<details class="sources">
               <summary>Lihat ${v.tafsir.length} ulama membahas ayat ini</summary>
               ${tafsir}
             </details>`
          : `<div class="silence">Belum ada tafsir terverifikasi untuk ayat ini di korpus kami. Kami memilih diam daripada mengarang.</div>`
      }
    </article>`;
}

function skeleton(): HTMLElement {
  const el = document.createElement("div");
  el.className = "msg nur";
  el.innerHTML = `<div class="skeleton" aria-hidden="true">
    <div class="sk-line short"></div><div class="sk-line ar"></div>
    <div class="sk-line"></div><div class="sk-line short"></div></div>`;
  return el;
}

function scrollDown() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
}

// ── ask ──────────────────────────────────────────────────────────────
async function ask(question: string) {
  if (!corpus || !question.trim()) return;

  $("#hello")?.remove();

  const me = document.createElement("div");
  me.className = "msg me";
  me.textContent = question;
  thread.append(me);

  const loading = skeleton();
  thread.append(loading);
  scrollDown();

  // Retrieval is instant; the pause is honest pacing, not fake thinking.
  await new Promise((r) => setTimeout(r, 420));

  const hits: Hit[] = retrieve(corpus, question);
  loading.remove();

  const answer = document.createElement("div");
  answer.className = "msg nur";

  if (!hits.length) {
    // Honest silence. Spec Part 3: where the corpus is silent, Nur is silent.
    answer.innerHTML = `
      <p class="said">Aku belum menemukan ayat yang benar-benar cocok dengan itu di korpus yang sudah diverifikasi.</p>
      <div class="silence">
        Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak.
        Coba ceritakan dengan kata lain — misalnya apa yang sedang kamu rasakan.
      </div>`;
  } else {
    answer.innerHTML =
      `<p class="said">${compose(hits, question)}</p>` + hits.map((h) => verseEl(h.verse)).join("");
  }

  thread.append(answer);
  scrollDown();

  // Announce to screen readers — including WHO said what.
  const live = $("#live");
  live.textContent = hits.length
    ? `${hits.length} ayat ditemukan. ${hits.map((h) => `${h.verse.ref}, terjemah makna oleh ${h.verse.primary?.translator ?? "?"}`).join(". ")}`
    : "Tidak ada ayat yang cocok. Nur tidak mengarang jawaban.";
}

// ── composer ─────────────────────────────────────────────────────────
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

document.addEventListener("click", (e) => {
  const seed = (e.target as HTMLElement).closest<HTMLButtonElement>(".seed");
  if (seed) void ask(seed.textContent!.trim());
});

// ── scripture size — scales alone, never the UI ──────────────────────
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

// ── theme — both modes are first-class ───────────────────────────────
$("#theme").addEventListener("click", () => {
  const cur =
    document.documentElement.dataset["theme"] ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset["theme"] = next;
  localStorage.setItem("nur:theme", next);
});

// ── boot ─────────────────────────────────────────────────────────────
(async () => {
  const savedTheme = localStorage.getItem("nur:theme");
  if (savedTheme) document.documentElement.dataset["theme"] = savedTheme;
  const savedSize = localStorage.getItem("nur:ar") as keyof typeof SIZES | null;
  if (savedSize) {
    document.documentElement.style.setProperty("--ar-size", SIZES[savedSize]);
    for (const b of $("#size").querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b.dataset["size"] === savedSize));
    }
  }

  const res = await fetch("/corpus.json");
  corpus = (await res.json()) as Corpus;
  voices = new Map(corpus.sources.map((s) => [s.id, s]));
  send.disabled = !input.value.trim();
})();
