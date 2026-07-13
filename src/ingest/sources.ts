import type { AuthorityTier, DisplayRole } from "../domain/interpretive.ts";

/**
 * Pinned source registry.
 *
 * Every input is fetched from a fixed URL and verified against a sha256 recorded in
 * `sources.lock.json`. If upstream changes a single byte, ingest FAILS rather than
 * silently importing altered scripture or altered exegesis. Re-pinning is deliberate
 * (`bun run ingest:lock`) and the lockfile diff is the evidence a human signs off on.
 *
 * API-backed sources (Tafsiriyah, the tafsir editions) are materialized into a single
 * local dump before hashing — that is what makes a live third-party endpoint pinnable
 * at all, and it is why nothing here sits on the read path in production.
 */

export type SourceKind = "metadata" | "quran-text" | "translation" | "tafsir";

export interface Source {
  readonly id: string;
  readonly kind: SourceKind;
  /** Single-file sources. Mutually exclusive with `surahUrl`. */
  readonly url?: string;
  /** Per-surah sources: called for surah 1..114 and concatenated into one dump. */
  readonly surahUrl?: (surah: number) => string;
  readonly file: string;
  readonly license: string;
  readonly attribution: string;

  // Translation sources
  readonly lang?: string;
  readonly translator?: string;
  readonly translation_type?: "literal" | "interpretive";

  // Interpretive sources (tafsir + interpretive translations)
  readonly source_slug?: string;
  readonly author?: string;
  readonly era?: string;
  readonly authority_tier?: AuthorityTier;
  readonly display_role?: DisplayRole;
  /** Shown in the UI. States what the source IS, plainly. */
  readonly note?: string;
}

const TAFSIR_CDN = (slug: string) => (surah: number) =>
  `https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/${slug}/${surah}.json`;

export const SOURCES: readonly Source[] = [
  // ── CANONICAL ───────────────────────────────────────────────────────────────
  {
    id: "tanzil-metadata",
    kind: "metadata",
    url: "https://tanzil.net/res/text/metadata/quran-data.xml",
    file: "quran-data.xml",
    license: "CC BY 3.0",
    attribution: "Tanzil.net — Qur'an metadata",
  },
  {
    id: "tanzil-uthmani",
    kind: "quran-text",
    url: "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&quranType=uthmani&outType=txt-2&agree=true",
    file: "quran-uthmani.txt",
    license: "CC BY-ND 3.0 (unmodified redistribution only)",
    attribution: "Tanzil.net — Uthmani Qur'an text",
  },
  {
    id: "tanzil-id-kemenag",
    kind: "translation",
    url: "https://tanzil.net/trans/id.indonesian",
    file: "id.kemenag.txt",
    license: "CC BY-ND 3.0 (unmodified redistribution only)",
    attribution: "Tanzil.net — Indonesian translation (Kementerian Agama RI)",
    lang: "id",
    translator: "Kementerian Agama Republik Indonesia",
    translation_type: "literal",
    // Companion, not primary: it is the official literal rendering and stays permanently
    // available for comparison. Never removed, never buried — it is what makes leading with
    // an interpretive translation defensible rather than evasive.
    display_role: "companion",
  },

  // ── INTERPRETIVE — translation ──────────────────────────────────────────────
  {
    id: "tafsiriyah-thalib",
    kind: "translation",
    surahUrl: (s) => `https://media-quran-api.lpoalr.easypanel.host/api/surahs/${s}`,
    file: "id.tafsiriyah.json",
    license: "Unspecified — verify before redistribution",
    attribution:
      "Al-Qur'an Tarjamah Tafsiriyah — Ustadz Muhammad Thalib (Majelis Mujahidin Indonesia)",
    lang: "id",
    translator: "Ustadz Muhammad Thalib",
    translation_type: "interpretive",
    source_slug: "tafsiriyah-thalib",
    author: "Ustadz Muhammad Thalib",
    era: "Contemporary (2012)",

    // THE PRODUCT'S VOICE. This is the reason the platform exists: a rendering people can
    // actually understand and be moved by, where the official literal translation leaves
    // many readers cold. It leads the reading experience.
    display_role: "primary",

    // ...and it is still tier 3, because that axis answers a DIFFERENT question: how much
    // weight it carries when the system grounds a doctrinal claim. Contemporary, and its
    // place in scholarly consensus is still being argued. Leading the reading surface and
    // being the final word on doctrine are not the same job. Both facts are true at once.
    authority_tier: 3,

    note:
      "Terjemah makna (tarjamah tafsiriyah) oleh Ustadz Muhammad Thalib — a meaning-based " +
      "rendering, not a word-for-word translation. Its clarity comes precisely from that: it " +
      "renders what the verse means as the author understands it, rather than the bare words. " +
      "Published in 2012 as a response to the official Kemenag translation, and debated in " +
      "Indonesia on that basis. Presented as what it is, always named, always with the Kemenag " +
      "literal translation available alongside. Never presented as the bare word of the Qur'an.",
  },

  // ── INTERPRETIVE — classical & modern tafsir ────────────────────────────────
  {
    id: "tafsir-ibn-kathir-en",
    kind: "tafsir",
    surahUrl: TAFSIR_CDN("en-tafisr-ibn-kathir"),
    file: "tafsir.ibn-kathir.en.json",
    license: "Public domain / open dataset (spa5k/tafsir_api)",
    attribution: "Tafsir Ibn Kathir (abridged, English)",
    source_slug: "ibn-kathir",
    display_role: "reference" as const,
    author: "Ismail ibn Kathir",
    lang: "en",
    era: "Classical (14th c.)",
    authority_tier: 1,
  },
  {
    id: "tafsir-as-saadi-id",
    kind: "tafsir",
    surahUrl: TAFSIR_CDN("id-tafsir-as-saadi"),
    file: "tafsir.as-saadi.id.json",
    license: "Open dataset (spa5k/tafsir_api)",
    attribution: "Tafsir As-Sa'di — Indonesian",
    source_slug: "as-saadi",
    display_role: "reference" as const,
    author: "Abd ar-Rahman as-Sa'di",
    lang: "id",
    era: "Modern (20th c.)",
    authority_tier: 2,
  },
  {
    id: "tafsir-mukhtasar-id",
    kind: "tafsir",
    surahUrl: TAFSIR_CDN("indonesian-mokhtasar"),
    file: "tafsir.mukhtasar.id.json",
    license: "Open dataset (spa5k/tafsir_api)",
    attribution: "Al-Mukhtasar fi at-Tafsir — Indonesian",
    source_slug: "mukhtasar",
    display_role: "reference" as const,
    author: "Markaz Tafsir, Riyadh (committee)",
    lang: "id",
    era: "Contemporary",
    authority_tier: 2,
  },
] as const;

export function sourceById(id: string): Source {
  const found = SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown source: ${id}`);
  return found;
}

export const translationSources = () => SOURCES.filter((s) => s.kind === "translation");
export const tafsirSources = () => SOURCES.filter((s) => s.kind === "tafsir");

/**
 * NOT AVAILABLE — recorded so nobody re-discovers it the hard way.
 *
 * `in-tafsir-jalalayn` (Indonesian Tafsir Jalalayn) exists in the spa5k/tafsir_api edition
 * list but is an EMPTY STUB: every surah bundle returns `[]`. Indonesian Jalalayn must be
 * sourced elsewhere if the board wants it. Arabic (`ar-tafsir-al-jalalayn`) does have content.
 */
