/**
 * Fikih ROUTING — question → the amal area whose kitab the imams themselves placed it under.
 *
 * WHAT THIS IS FOR. Erik's sequence (2026-08-17) is ayat first, then hadits, then fikih. The first
 * two are corpora; the third is not, and this file is the honest version of the third. There is no
 * legally-clean, Indonesian, topic-structured fiqh corpus to answer FROM (see `fikih.ts` — v1 is "a
 * doorway, not a treatise"), so the Fikih step cannot contribute text. What it can contribute is
 * ORDER: when a question is plainly about wudu, this says "wudu lives in كتاب الوضوء", and hadith
 * retrieval prefers what the compilers put there.
 *
 * IT CAN ONLY RE-RANK. THIS IS THE WHOLE SAFETY ARGUMENT AND IT IS STRUCTURAL, NOT A PROMISE.
 * `fiqhAreaOf` feeds a boost applied to hits retrieval ALREADY returned. It cannot admit a hadith
 * that retrieval did not find, cannot refuse one it did, and cannot manufacture an answer where
 * there was none. So a wrong area match costs ordering and nothing else — which is what makes a
 * keyword list acceptable here when this repo has three times proved keyword lists unacceptable as
 * GATES. If anyone later wires this into an admission decision, that argument is void.
 *
 * WHY NOT FILTER BY `isFeelingWord`. Because it would delete `nikah`. `FEELING_WORDS` is built by
 * tokenising the feeling lexicon's PHRASES, so ordinary subject nouns test true — 134 of them — and
 * excluding them wholesale has already been tried and is a known trap. Since this file cannot gate
 * anything, it does not need the guard the topic router needs.
 *
 * THE MAPPING IS NAVIGATIONAL, NOT JURISTIC. Every keyword below names what the kitab is ABOUT, in
 * the compilers' own arrangement. None of them asserts a ruling, and nothing here decides whether a
 * thing is halal, wajib or batal — that is `fatwaShape`'s business, and it still refuses.
 */
import { FIQH_AREAS, type FiqhArea } from "./fikih.ts";
import { norm } from "./retrieve.ts";

/**
 * Whole-word cues per area. Deliberately plain nouns a reader would actually type, not a lexicon:
 * the router's job is to notice "this question is about zakat", not to understand zakat.
 *
 * Indonesian affixes are spelled out rather than stemmed (`berwudu`, `menikah`, `berpuasa`). A
 * `\b`-bounded stem under-fires on exactly these forms — `menikahi` does not match `nikah` — and
 * that failure mode is on record in this repo. Listing the forms is dumber and correct.
 */
const AREA_CUES: Readonly<Record<string, readonly string[]>> = {
  thaharah: ["wudu", "wudhu", "berwudu", "berwudhu", "tayamum", "tayammum", "mandi", "junub", "haid",
    "hadas", "hadats", "najis", "bersuci", "istinja", "mensucikan", "suci"],
  salat: ["salat", "shalat", "sholat", "sembahyang", "rakaat", "rakaah", "azan", "adzan", "iqamah",
    "kiblat", "qiblat", "sujud", "rukuk", "ruku", "tahajud", "witir", "duha", "dhuha", "jumat",
    "jumatan", "berjamaah", "jamaah", "imam", "makmum", "qasar", "jamak"],
  zakat: ["zakat", "nisab", "nishab", "haul", "fitrah", "mustahik", "sedekah", "shadaqah",
    "infak", "infaq"],
  puasa: ["puasa", "berpuasa", "shaum", "saum", "ramadan", "ramadhan", "sahur", "imsak", "berbuka",
    "iftar", "qadha", "kafarat", "syawal", "asyura", "senin", "kamis"],
  haji: ["haji", "umrah", "umroh", "ihram", "tawaf", "thawaf", "sai", "sai", "arafah", "mina",
    "muzdalifah", "kabah", "kakbah", "baitullah", "miqat", "jamarat"],
  jenazah: ["jenazah", "janazah", "mayit", "mayat", "memandikan", "mengafani", "kafan", "menyalati",
    "memakamkan", "kubur", "makam", "takziah", "berkabung", "wafat", "meninggal"],
  nikah: ["nikah", "menikah", "menikahi", "pernikahan", "kawin", "mengawini", "walimah", "mahar",
    "wali", "saksi", "poligami", "istri", "suami", "rumah tangga", "khitbah", "lamaran", "nafkah"],
  talak: ["talak", "thalaq", "cerai", "perceraian", "menceraikan", "iddah", "idah", "rujuk",
    "khuluk", "khulu", "nusyuz"],
  muamalah: ["jual", "beli", "jualan", "berdagang", "dagang", "riba", "utang", "hutang", "pinjam",
    "meminjam", "gadai", "sewa", "upah", "gaji", "untung", "rugi", "akad", "khiyar", "monopoli",
    "investasi", "saham", "bunga"],
  makanan: ["makan", "makanan", "minum", "minuman", "halal", "haram", "sembelih", "menyembelih",
    "sembelihan", "kurban", "qurban", "akikah", "aqiqah", "khamr", "khamar", "arak", "babi",
    "bangkai", "daging"],
};

/**
 * The area a question belongs to, or null.
 *
 * Scored rather than first-match: `hukum jual beli emas dengan cara kredit` touches muamalah four
 * times and makanan not at all, and a first-match walk over an object's key order would decide that
 * on declaration order instead. Ties resolve to null — an ambiguous question gets no boost, which
 * leaves retrieval exactly as it is today.
 */
export function fiqhAreaOf(question: string): FiqhArea | null {
  const words = new Set(norm(question).split(" ").filter(Boolean));
  const phrase = norm(question);
  let best: { area: FiqhArea; n: number } | null = null;
  let tied = false;

  for (const area of FIQH_AREAS) {
    const cues = AREA_CUES[area.id] ?? [];
    let n = 0;
    for (const cue of cues) {
      // Multi-word cues (`rumah tangga`) cannot be found in the word set.
      if (cue.includes(" ") ? phrase.includes(cue) : words.has(cue)) n += 1;
    }
    if (n === 0) continue;
    if (!best || n > best.n) {
      best = { area, n };
      tied = false;
    } else if (n === best.n) {
      tied = true;
    }
  }
  return best && !tied ? best.area : null;
}

/** The (collection, book) pairs an area's material sits in — what a retrieval boost keys on. */
export const fiqhKitabOf = (area: FiqhArea): ReadonlySet<string> =>
  new Set(area.refs.map((r) => `${r.collection}:${r.book}`));
