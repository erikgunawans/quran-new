/**
 * SECTION-SCOPED SEARCH — the browser half of "typing inside Hadits or Fikih searches that section".
 *
 * Erik, 2026-08-17: the composer should serve the section the reader is standing in. Everywhere
 * else the box runs the companion pipeline, which leads with ayat and reaches hadith only when
 * retrieval found no verse at all. Inside Hadits that ordering is simply wrong — someone who walked
 * into Hadits and typed "hadits tentang perceraian" is questioning the hadith corpus, not asking to
 * be consoled. This module is what the box does there instead.
 *
 * NOTHING HERE AUTHORS. `/api/dalil` has no model in its path; it returns corpus records verbatim.
 * So this surface cannot produce a fatwa, cannot paraphrase a hadith, and has no prose for the
 * answer guard to police. It is the hadith twin of "Cari Surah": navigation.
 *
 * THE TWO-TIER RESULT IS THE RIGHTS POSITION, NOT A LAYOUT CHOICE. `MAX_DISPLAY = 2` caps how many
 * hadith may be SHOWN and does not move (Erik, 2026-08-17 — the cap is an open rights call, and
 * this feature deliberately does not pre-empt it). But returning two cards and silently discarding
 * the other six would tell the reader those six do not exist. So the rest come back as REFERENCE
 * LINES: collection, number, grade, kitab, link — and no hadith text whatsoever. The reader learns
 * the record is there and can go read it at the source. That is the same honest doorway the Fikih
 * section already is.
 */
import { esc } from "./esc.ts";
import { hadithIdText, loadHadithIds } from "./hadith-id.ts";
import { kitabId } from "./hadith-titles.ts";
import type { HadithCard } from "./hadith-card.ts";

const DALIL_ENDPOINT = "/api/dalil";

/**
 * Retrieval runs embed → Vectorize → text layer → rerank, measured at 1.3–4.0 s live with a 2.8 s
 * median. The generous ceiling is deliberate: the answer path's 12 s abort is on record in this
 * repo as a real defect that killed turns which would have succeeded, and a search that gives up
 * early looks to the reader exactly like a corpus with nothing in it.
 */
const TIMEOUT_MS = 20000;

/** A record the reader may NAVIGATE to but not READ here. Mirrors `DalilReference` in the Worker. */
export interface DalilReference {
  id: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
}

/** The amal area whose kitab holds this question — the Fikih doorway, never a ruling. */
export interface DalilArea {
  id: string;
  title: string;
  sub: string;
  /** The compilers' own kitab for this area. The doorway's only destinations. */
  refs: { collection: string; book: number }[];
}

export interface DalilSearchResult {
  /** Full hadith, capped by the Worker at MAX_DISPLAY. Never longer than 2. */
  cards: HadithCard[];
  /** Everything else retrieval found — reference only, no text. */
  refs: DalilReference[];
  /** Present only when the caller asked for the Fikih step. */
  area: DalilArea | null;
}

const EMPTY: DalilSearchResult = { cards: [], refs: [], area: null };

/**
 * Ask the corpus. `fiqh` adds the FIKIH step — `rankByFiqhArea` re-ranks what retrieval already
 * returned and names the doorway. It cannot admit a record retrieval missed nor refuse one it
 * found, which is the whole safety argument in `fikih-route.ts` and the reason this flag is
 * allowed to be a plain boolean rather than a gate.
 *
 * Returns an empty result rather than throwing on any failure: the section still has its browse
 * grid, and "no results" degrades better than an error state on a surface the reader arrived at
 * for another reason.
 */
export async function searchDalilLive(query: string, fiqh = false): Promise<DalilSearchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(DALIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, fiqh }),
      signal: controller.signal,
    });
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as Partial<DalilSearchResult>;
    return {
      cards: Array.isArray(data.cards) ? data.cards : [],
      refs: Array.isArray(data.refs) ? data.refs : [],
      area: data.area && typeof data.area === "object" ? data.area : null,
    };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fill in the machine Indonesian for cards that have no reviewed translation.
 *
 * Routed through `hadith-id.ts` exactly as the answer path does, so `SHOW_MACHINE_HADITH_TEXT`
 * stays the single place in the app that decides whether this text may render at all. A second
 * caller that resolved the shard itself would be a second gate, and the point of ISC-449's design
 * is that there is only ever one. `reviewed_id` is never written here — permitted is not reviewed.
 */
export async function hydrateMachineIndonesian(cards: HadithCard[]): Promise<HadithCard[]> {
  const out = cards.map((c) => ({ ...c }));
  await Promise.all(
    out.map(async (h) => {
      if (h.reviewed_id || !h.book || !h.collection) return;
      try {
        const id = hadithIdText(await loadHadithIds(h.collection, h.book), h.hadith_number);
        if (id) h.machine_id = id;
      } catch {
        // Unreachable shard → Arabic + English only, the state the card shipped in.
      }
    }),
  );
  return out;
}

/** `Sahih al-Bukhari 5251` — the same attribution line the card shows, for a row that has no card. */
export const referenceLabel = (r: DalilReference): string => `${r.collection} ${r.hadith_number}`;

/**
 * The reference list. Deliberately austere: an attribution, a grade, the kitab it sits in, and a
 * link out to the source. No excerpt, no snippet, no "…" teaser — a teaser is display of the text
 * in a smaller font, and the cap does not bend because the font got smaller.
 */
export function referenceListEl(refs: readonly DalilReference[]): string {
  if (refs.length === 0) return "";
  const rows = refs
    .map(
      (r) =>
        `<li class="dalil-ref">` +
        `<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">` +
        `<span class="dalil-ref-cite">${esc(referenceLabel(r))}</span>` +
        `<span class="dalil-ref-grade">${esc(r.grade)}</span>` +
        `<span class="dalil-ref-bab">${esc(r.bab_en)}</span>` +
        `</a></li>`,
    )
    .join("");
  // The heading says what these are and what they are NOT, because a list of citations under two
  // full hadith reads as "more of the same, collapsed" unless it says otherwise.
  return (
    `<section class="dalil-refs" aria-label="Rujukan lain">` +
    `<h3 class="dalil-refs-title">Rujukan lain</h3>` +
    `<p class="dalil-refs-note">Teksnya tidak ditampilkan di sini. Ketuk untuk membacanya di sumbernya.</p>` +
    `<ul class="dalil-ref-list">${rows}</ul></section>`
  );
}

/**
 * The Fikih doorway — the amal area the question landed in, as a card the reader can walk through.
 *
 * This is what makes "a doorway, not a treatise" VISIBLE. Without it, a Fikih search that returns
 * hadith implies the app answered a fiqh question, which it did not and cannot: there is no fiqh
 * corpus. With it, the reader sees that what happened was "your question belongs to this kitab,
 * here is that kitab, and here is the hadith inside it".
 */
export function fiqhDoorwayEl(area: DalilArea | null): string {
  if (!area) return "";
  // There is no `#/fikih/<area>` route and this must not invent one — an area IS its kitab, and the
  // kitab already has a reader at `#/hadis/<collection>/<book>`. Same destination the Fikih grid's
  // own chips use, so the doorway lands the reader exactly where tapping the card would have.
  const chips = area.refs
    .map((r) => {
      const idn = kitabId(r.collection, r.book);
      return (
        `<a class="dalil-doorway-kitab" href="#/hadis/${esc(r.collection)}/${r.book}">` +
        `${esc(idn ?? `${r.collection} ${r.book}`)}</a>`
      );
    })
    .join("");
  return (
    `<section class="dalil-doorway" aria-label="Bab fikih">` +
    `<span class="dalil-doorway-title">${esc(area.title)}</span>` +
    `<span class="dalil-doorway-sub">${esc(area.sub)}</span>` +
    (chips ? `<div class="dalil-doorway-kitabs">${chips}</div>` : "") +
    `</section>`
  );
}

/** Shown when retrieval came back with nothing — honest silence, never a manufactured near-miss. */
export const dalilEmptyEl = (query: string): string =>
  `<p class="dalil-empty">Tidak ada hadis yang cocok dengan “${esc(query)}” di koleksi yang ada di sini.</p>`;
