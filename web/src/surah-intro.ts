/**
 * The surah preface (مقدمة السورة) — fetch, cache, and render Dorar Al-Saniyyah's introduction.
 *
 * Sharded per surah and fetched only when the reader actually opens a surah, because the whole
 * corpus is ~1 MB of prose and a reader on patchy 4G should pay for the one preface they are
 * looking at. Built by `src/app/build-surah-intro.ts` — see that file's header for the rights
 * position and why this ships Arabic only.
 *
 * ATTRIBUTION IS NOT OPTIONAL. `introEl` refuses to render a preface whose shard carries no source
 * block. This content belongs to Dorar; a render path that could drop the credit is a bug, so it
 * is a hard branch rather than a template convenience.
 */
import { esc } from "./esc";

export type IntroKind = "names" | "revelation" | "aims" | "topics" | "virtues" | "other";

export interface IntroSection {
  readonly kind: IntroKind;
  readonly title: string;
  readonly body: string;
}

/** An alternate-language edition of the same preface. See build-surah-intro.ts for why the
 * provenance fields are content rather than metadata. */
export interface IntroEdition {
  readonly lang: string;
  readonly official: boolean;
  readonly translation: string;
  readonly reviewStatus: string;
  readonly reviewerNeeded: string;
  readonly sections: readonly IntroSection[];
  readonly refs: readonly string[];
}

export interface SurahIntro {
  readonly n: number;
  readonly nameAr: string;
  readonly lang: "ar";
  readonly source: { readonly title: string; readonly url: string; readonly supervisor: string };
  readonly sections: readonly IntroSection[];
  readonly refs: readonly string[];
  readonly editions?: Readonly<Record<string, IntroEdition>>;
}

const cache = new Map<number, SurahIntro>();
const inflight = new Map<number, Promise<SurahIntro>>();

export class IntroError extends Error {
  readonly surah: number;
  constructor(message: string, surah: number) {
    super(message);
    this.name = "IntroError";
    this.surah = surah;
  }
}

/** Reset caches — tests only. */
export function _resetIntroCache(): void {
  cache.clear();
  inflight.clear();
}

/**
 * Fetch one surah's preface. In-flight requests are shared so a reader who toggles the intro
 * column twice before the network answers does not start two downloads.
 */
export async function loadIntro(n: number): Promise<SurahIntro> {
  const hit = cache.get(n);
  if (hit) return hit;
  const pending = inflight.get(n);
  if (pending) return pending;

  const task = (async (): Promise<SurahIntro> => {
    let res: Response;
    try {
      res = await fetch(`/surah-intro/${n}.json`);
    } catch {
      throw new IntroError("Gagal memuat pengantar surah. Periksa koneksimu.", n);
    }
    if (!res.ok) throw new IntroError(`Gagal memuat pengantar surah (${res.status}).`, n);

    let intro: SurahIntro;
    try {
      intro = (await res.json()) as SurahIntro;
    } catch {
      throw new IntroError("Data pengantar surah rusak saat diunduh.", n);
    }

    // A preface for the wrong surah, or one stripped of its attribution, must never render.
    if (intro.n !== n) throw new IntroError("Data pengantar surah tidak cocok.", n);
    if (!intro.source?.url || !intro.source?.title) {
      throw new IntroError("Pengantar surah tanpa sumber — tidak ditampilkan.", n);
    }

    cache.set(n, intro);
    return intro;
  })();

  inflight.set(n, task);
  try {
    return await task;
  } finally {
    inflight.delete(n);
  }
}

/**
 * Paragraph the source prose.
 *
 * Dorar writes a section as one long line with inline enumeration (`1- … 2- …`). Rendered as a
 * single block it is a wall; split on the blank lines the source does provide and let CSS handle
 * the rest. The text itself is never altered — only wrapped.
 */
/**
 * The two inline shapes the sources actually use, applied AFTER escaping so nothing in the source
 * can smuggle markup through: `**bold**` → `<strong>`, and a single newline → `<br>`.
 *
 * The Arabic never needed either — Dorar writes a section as one unbroken line with inline `1- 2-`
 * enumeration. The Indonesian edition is real markdown: `**term**` and one list item per line. Left
 * alone it rendered literal asterisks and ran the numbered list into a single paragraph.
 */
const inline = (escaped: string): string =>
  escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

const paras = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(esc(p))}</p>`)
    .join("");

/**
 * Render the preface.
 *
 * Everything is `dir="rtl" lang="ar"` because everything here IS Arabic — Dorar's headings and
 * Dorar's prose, verbatim. The one thing in Indonesian is our own framing label, so a reader knows
 * at a glance whose words these are and what language they are about to read.
 */
/** Render one edition's sections + footnotes. `rtl` is a property of the TEXT, not of the app. */
function bodyEl(sections: readonly IntroSection[], refs: readonly string[], rtl: boolean): string {
  const dir = rtl ? ` dir="rtl" lang="ar"` : ` lang="id"`;
  const secs = sections
    .map(
      (s) => `
      <section class="si-sec" data-kind="${esc(s.kind)}">
        <h3 class="si-h"${dir}>${esc(s.title)}</h3>
        <div class="si-body"${dir}>${paras(s.body)}</div>
      </section>`,
    )
    .join("");

  const reflist = refs.length
    ? `<section class="si-sec si-refs">
         <h3 class="si-h">Rujukan</h3>
         <ol class="si-reflist"${dir}>${refs.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>
       </section>`
    : "";

  return secs + reflist;
}

/**
 * The provenance banner for a non-official edition.
 *
 * This is the one piece of UI in the preface that is NOT negotiable. The Indonesian text is a
 * machine translation of Dorar's Arabic, unreviewed, and its own source file says in as many words:
 * "Jangan disajikan ke pengguna sebelum ditinjau Ustadz Ahmad Isrofiel." Erik chose to offer it as
 * a reader-selectable option anyway; offering it WITHOUT saying what it is would turn a labelled
 * draft into a false attribution to Dorar, which is a different thing from what he asked for.
 */
function editionNoticeEl(ed: IntroEdition): string {
  if (ed.official) return "";
  const how = ed.translation === "ai" ? "Terjemahan mesin (AI)" : `Terjemahan (${esc(ed.translation)})`;
  const reviewer = ed.reviewerNeeded ? ` Menunggu tinjauan ${esc(ed.reviewerNeeded)}.` : "";
  return `
    <aside class="si-warn" role="note">
      <b>${how} — belum ditinjau.</b>
      <span>Ini terjemahan turunan dari teks Arab Dorar — bukan karya Dorar sendiri, bukan edisi resmi.${reviewer} Untuk rujukan, baca versi Arabnya.</span>
    </aside>`;
}

/** Language options, Arabic always first because it is the edition Dorar actually wrote. */
const LANGS: readonly (readonly [string, string])[] = [
  ["ar", "Arab"],
  ["id", "Bahasa Indonesia"],
];

export function introEl(intro: SurahIntro): string {
  const tabs = LANGS.map(([code, label]) => {
    const has = code === "ar" || Boolean(intro.editions?.[code]);
    const on = code === "ar";
    // An unavailable language stays VISIBLE but disabled, and says why. Hiding it would read as
    // "this app has no Indonesian"; a dead button that explains itself is the honest middle.
    return `<button type="button" class="si-langbtn${on ? " on" : ""}" data-lang="${esc(code)}"
              aria-pressed="${on}"${has ? "" : ' disabled aria-disabled="true"'}
              title="${has ? esc(label) : "Belum tersedia untuk surah ini"}">${esc(label)}${
                has ? "" : ' <span class="si-na">belum ada</span>'
              }</button>`;
  }).join("");

  return `
    <div class="surah-intro">
      <div class="si-langbar" role="group" aria-label="Bahasa pengantar surah">${tabs}</div>
      <div class="si-content">${bodyEl(intro.sections, intro.refs, true)}</div>
      <footer class="si-cred">
        <span>Sumber: <a href="${esc(intro.source.url)}" target="_blank" rel="noopener noreferrer">${esc(intro.source.title)}</a></span>
        <span>Pengawasan: ${esc(intro.source.supervisor)}</span>
      </footer>
    </div>`;
}

/**
 * Wire the language toggle.
 *
 * Re-renders only `.si-content`; the attribution footer never moves, because every edition —
 * including the machine translation — is derived from Dorar's work and must keep crediting it.
 */
export function bindIntroLang(root: ParentNode, intro: SurahIntro): void {
  const bar = root.querySelector<HTMLElement>(".si-langbar");
  const content = root.querySelector<HTMLElement>(".si-content");
  if (!bar || !content) return;

  bar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".si-langbtn");
    if (!btn || btn.disabled) return;
    const lang = btn.dataset["lang"];
    if (!lang) return;

    for (const b of bar.querySelectorAll<HTMLButtonElement>(".si-langbtn")) {
      const on = b === btn;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }

    if (lang === "ar") {
      content.innerHTML = bodyEl(intro.sections, intro.refs, true);
      return;
    }
    const ed = intro.editions?.[lang];
    if (!ed) return; // disabled buttons cannot reach here, but never render an edition we lack
    content.innerHTML = editionNoticeEl(ed) + bodyEl(ed.sections, ed.refs, false);
  });
}
