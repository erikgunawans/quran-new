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
function noticeText(ed: IntroEdition): { head: string; body: string } {
  const how = ed.translation === "ai" ? "Terjemahan mesin (AI)" : `Terjemahan (${ed.translation})`;
  const reviewer = ed.reviewerNeeded ? ` Menunggu tinjauan ${ed.reviewerNeeded}.` : "";
  return {
    head: `${how} — belum ditinjau.`,
    body: `Ini terjemahan turunan dari teks Arab Dorar — bukan karya Dorar sendiri, bukan edisi resmi.${reviewer} Untuk rujukan, baca versi Arabnya.`,
  };
}

/**
 * The provenance affordance: an ⓘ beside the language tab, revealing what that edition actually is.
 *
 * Erik asked for this on hover (2026-08-08), replacing the persistent banner. Hover ALONE would have
 * been wrong here: the stated target is a mid-range Android, where hover does not exist, and a
 * touch reader would then get machine-translated religious commentary with no signal at all. So the
 * icon opens on hover, on tap, and on keyboard focus, and the full sentence is also the button's
 * accessible description — a screen reader hears it whether or not the tooltip is ever shown.
 *
 * The icon itself is always visible next to the tab, which is the part that has to stay honest: the
 * disclosure can be one interaction away, but the *existence* of something to disclose cannot be.
 */
function infoEl(ed: IntroEdition, lang: string): string {
  if (ed.official) return "";
  const { head, body } = noticeText(ed);
  const tipId = `si-tip-${esc(lang)}`;
  return `
    <span class="si-info" data-open="false">
      <button class="si-infobtn" type="button" aria-describedby="${tipId}"
              aria-expanded="false" aria-label="Tentang terjemahan ini: ${esc(head)} ${esc(body)}">i</button>
      <span class="si-tip" id="${tipId}" role="tooltip">
        <b>${esc(head)}</b>
        <span>${esc(body)}</span>
      </span>
    </span>`;
}

/** Language options, Arabic always first because it is the edition Dorar actually wrote. */
const LANGS: readonly (readonly [string, string])[] = [
  ["ar", "Arab"],
  ["id", "Bahasa Indonesia"],
];

export function introEl(intro: SurahIntro): string {
  const tabs = LANGS.map(([code, label]) => {
    const ed = intro.editions?.[code];
    const has = code === "ar" || Boolean(ed);
    const on = code === "ar";
    // An unavailable language stays VISIBLE but disabled, and says why. Hiding it would read as
    // "this app has no Indonesian"; a dead button that explains itself is the honest middle.
    const btn = `<button type="button" class="si-langbtn${on ? " on" : ""}" data-lang="${esc(code)}"
              aria-pressed="${on}"${has ? "" : ' disabled aria-disabled="true"'}
              title="${has ? esc(label) : "Belum tersedia untuk surah ini"}">${esc(label)}${
                has ? "" : ' <span class="si-na">belum ada</span>'
              }</button>`;
    // The ⓘ rides with the tab, not with the content, so the reader can learn what an edition is
    // BEFORE choosing it rather than after.
    return ed ? `<span class="si-langopt">${btn}${infoEl(ed, code)}</span>` : btn;
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
 * Tap-to-open for any `.si-info` tooltip inside `root`.
 *
 * Hover and focus are pure CSS; this is the touch path, which is the one that matters on the devices
 * this app targets. Extracted from the preface binder so the Tematik credit's ⓘ gets the same
 * behaviour instead of being hover-only — it was, and a touch reader saw nothing.
 */
export function bindInfoTips(root: ParentNode): void {
  root.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".si-infobtn");
    if (!btn) return;
    const wrap = btn.closest<HTMLElement>(".si-info");
    if (!wrap) return;
    const open = wrap.dataset["open"] !== "true";
    wrap.dataset["open"] = String(open);
    btn.setAttribute("aria-expanded", String(open));
    e.preventDefault();
    e.stopPropagation(); // never let the tap fall through to the control behind it
  });
}

/** Close every open tooltip on an outside tap or Escape — one that cannot be dismissed is a modal. */
function bindTipDismiss(): void {
  const closeAll = (): void => {
    for (const w of document.querySelectorAll<HTMLElement>(".si-info[data-open='true']")) {
      w.dataset["open"] = "false";
      w.querySelector(".si-infobtn")?.setAttribute("aria-expanded", "false");
    }
  };
  document.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}
bindTipDismiss();

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

  bindInfoTips(bar);

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
    // The provenance now lives on the tab's ⓘ, so the body is just the edition.
    content.innerHTML = bodyEl(ed.sections, ed.refs, false);
  });
}
