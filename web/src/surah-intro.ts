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

export interface SurahIntro {
  readonly n: number;
  readonly nameAr: string;
  readonly lang: "ar";
  readonly source: { readonly title: string; readonly url: string; readonly supervisor: string };
  readonly sections: readonly IntroSection[];
  readonly refs: readonly string[];
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
const paras = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

/**
 * Render the preface.
 *
 * Everything is `dir="rtl" lang="ar"` because everything here IS Arabic — Dorar's headings and
 * Dorar's prose, verbatim. The one thing in Indonesian is our own framing label, so a reader knows
 * at a glance whose words these are and what language they are about to read.
 */
export function introEl(intro: SurahIntro): string {
  const sections = intro.sections
    .map(
      (s) => `
      <section class="si-sec" data-kind="${esc(s.kind)}">
        <h3 class="si-h" dir="rtl" lang="ar">${esc(s.title)}</h3>
        <div class="si-body" dir="rtl" lang="ar">${paras(s.body)}</div>
      </section>`,
    )
    .join("");

  const refs = intro.refs.length
    ? `<section class="si-sec si-refs">
         <h3 class="si-h">Rujukan</h3>
         <ol class="si-reflist" dir="rtl" lang="ar">${intro.refs.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>
       </section>`
    : "";

  return `
    <div class="surah-intro">
      <p class="si-lang">Pengantar surah dalam bahasa Arab</p>
      ${sections}
      ${refs}
      <footer class="si-cred">
        <span>Sumber: <a href="${esc(intro.source.url)}" target="_blank" rel="noopener noreferrer">${esc(intro.source.title)}</a></span>
        <span>Pengawasan: ${esc(intro.source.supervisor)}</span>
      </footer>
    </div>`;
}
