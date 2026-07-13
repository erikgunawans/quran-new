import { AYAH_COUNT, SURAH_COUNT, TRUTH_CANONICAL, type CanonicalDataset } from "../domain/canonical.ts";

/**
 * Build-time integrity gates (spec Part 1, "enforced, not hoped").
 *
 * These are invariants of the Qur'an itself, not of our pipeline: 114 surahs, 6,236
 * ayahs, contiguous numbering, every ayah translated exactly once per language. A
 * violation means the corpus is wrong, and a wrong corpus must never reach the graph.
 *
 * Every check runs and ALL violations are reported together — failing on the first one
 * would hide the shape of the problem from whoever has to fix it.
 */
export class IntegrityError extends Error {
  constructor(public readonly violations: readonly string[]) {
    super(
      `Canonical integrity gate FAILED — ${violations.length} violation(s):\n` +
        violations.map((v) => `  ✗ ${v}`).join("\n"),
    );
    this.name = "IntegrityError";
  }
}

export interface GateReport {
  readonly checks: readonly { name: string; detail: string }[];
}

export function validateCanonical(ds: CanonicalDataset): GateReport {
  const v: string[] = [];
  const checks: { name: string; detail: string }[] = [];
  const pass = (name: string, detail: string) => checks.push({ name, detail });

  // ── Gate 1: surah count ──────────────────────────────────────────────
  if (ds.surahs.length !== SURAH_COUNT) {
    v.push(`surah count is ${ds.surahs.length}, must be exactly ${SURAH_COUNT}`);
  } else {
    pass("surah_count", `${SURAH_COUNT}`);
  }

  // ── Gate 2: ayah count ───────────────────────────────────────────────
  if (ds.ayahs.length !== AYAH_COUNT) {
    v.push(`ayah count is ${ds.ayahs.length}, must be exactly ${AYAH_COUNT}`);
  } else {
    pass("ayah_count", `${AYAH_COUNT}`);
  }

  // ── Gate 3: surah numbers are exactly 1..114, no gaps, no dupes ──────
  const surahNumbers = new Set(ds.surahs.map((s) => s.number));
  const missingSurahs: number[] = [];
  for (let n = 1; n <= SURAH_COUNT; n++) if (!surahNumbers.has(n)) missingSurahs.push(n);
  if (surahNumbers.size !== ds.surahs.length) v.push(`duplicate surah numbers present`);
  if (missingSurahs.length > 0) v.push(`missing surah number(s): ${missingSurahs.join(", ")}`);
  if (surahNumbers.size === SURAH_COUNT && missingSurahs.length === 0) {
    pass("surah_numbering", "1..114 contiguous, unique");
  }

  // ── Gate 4: revelation order is a permutation of 1..114 ──────────────
  const orders = new Set(ds.surahs.map((s) => s.order_revealed));
  if (orders.size !== ds.surahs.length) {
    v.push(`revelation order contains duplicates`);
  } else {
    const badOrder = [...orders].filter((o) => o < 1 || o > SURAH_COUNT);
    if (badOrder.length > 0) v.push(`revelation order out of range: ${badOrder.join(", ")}`);
    else pass("revelation_order", "permutation of 1..114");
  }

  // ── Gate 5: per-surah ayah counts match the metadata ─────────────────
  const bySurah = new Map<number, number[]>();
  for (const a of ds.ayahs) {
    const list = bySurah.get(a.surah_number) ?? [];
    list.push(a.ayah_number);
    bySurah.set(a.surah_number, list);
  }
  let countMismatches = 0;
  let numberingBreaks = 0;
  for (const s of ds.surahs) {
    const nums = (bySurah.get(s.number) ?? []).sort((x, y) => x - y);
    if (nums.length !== s.ayah_count) {
      countMismatches++;
      v.push(
        `surah ${s.number} (${s.name_translit}): has ${nums.length} ayahs, metadata declares ${s.ayah_count}`,
      );
      continue;
    }
    // ayah numbering within the surah must be 1..N contiguous
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== i + 1) {
        numberingBreaks++;
        v.push(`surah ${s.number}: ayah numbering breaks at position ${i + 1} (found ${nums[i]})`);
        break;
      }
    }
  }
  if (countMismatches === 0) pass("per_surah_counts", "all 114 match declared ayah_count");
  if (numberingBreaks === 0 && countMismatches === 0) {
    pass("ayah_numbering", "1..N contiguous within every surah");
  }

  // ── Gate 6: ID uniqueness ────────────────────────────────────────────
  const ayahIds = new Set(ds.ayahs.map((a) => a.id));
  if (ayahIds.size !== ds.ayahs.length) {
    v.push(`duplicate ayah ids: ${ds.ayahs.length - ayahIds.size} collision(s)`);
  } else {
    pass("ayah_id_uniqueness", `${ayahIds.size} unique`);
  }

  // ── Gate 7: no empty canonical text ──────────────────────────────────
  const emptyAyahs = ds.ayahs.filter((a) => a.text_uthmani.trim() === "").length;
  if (emptyAyahs > 0) v.push(`${emptyAyahs} ayah(s) have empty text_uthmani`);
  else pass("no_empty_text", "every ayah carries Uthmani text");

  // ── Gate 8: LITERAL translations cover every ayah exactly once ────────
  // Only literal translations are canonical scripture-rendering and must be complete.
  // Interpretive ones are opinion and are validated separately (Gate 10).
  const literal = ds.translations.filter((t) => t.translation_type === "literal");
  const byTranslator = new Map<string, Set<string>>();
  for (const t of literal) {
    if (!ayahIds.has(t.ayah_id)) v.push(`translation ${t.id} references unknown ayah ${t.ayah_id}`);
    const seen = byTranslator.get(t.translator) ?? new Set<string>();
    if (seen.has(t.ayah_id)) v.push(`duplicate translation for ${t.ayah_id} from ${t.translator}`);
    seen.add(t.ayah_id);
    byTranslator.set(t.translator, seen);
  }
  for (const [who, seen] of byTranslator) {
    if (seen.size !== AYAH_COUNT) {
      v.push(`literal translation "${who}" covers ${seen.size} ayahs, must cover all ${AYAH_COUNT}`);
    } else {
      pass(`literal_coverage`, `${AYAH_COUNT}/${AYAH_COUNT} (${who})`);
    }
  }
  const emptyTrans = ds.translations.filter((t) => t.text.trim() === "").length;
  if (emptyTrans > 0) v.push(`${emptyTrans} translation(s) have empty text`);

  // ── Gate 10: literal ⟺ canonical. THE doctrinal invariant. ───────────
  // An interpretive translation folds exegesis into the rendered text. It may never be
  // presented as the plain meaning of the verse, so it may never be truth_class canonical,
  // and it must always carry attribution. There is no override for this.
  let mislabeled = 0;
  let unattributed = 0;
  for (const t of ds.translations) {
    const shouldBeCanonical = t.translation_type === "literal";
    const isCanonical = t.truth_class === TRUTH_CANONICAL;
    if (shouldBeCanonical !== isCanonical) {
      mislabeled++;
      v.push(
        `translation ${t.id}: translation_type="${t.translation_type}" but ` +
          `truth_class="${t.truth_class}" — interpretive translations must NOT be canonical`,
      );
    }
    if (t.translation_type === "interpretive" && (!t.source_id || !t.authority_tier)) {
      unattributed++;
      v.push(`translation ${t.id}: interpretive but missing source_id/authority_tier (provenance hole)`);
    }
  }
  if (mislabeled === 0) pass("literal_iff_canonical", "no interpretive translation is canonical");
  if (unattributed === 0 && ds.translations.some((t) => t.translation_type === "interpretive")) {
    pass("interpretive_attribution", "every interpretive translation is attributed");
  }

  // ── Gate 9: truth_class is canonical, everywhere. No exceptions. ─────
  // Interpretive translations are deliberately NOT canonical — Gate 10 owns them.
  const tainted =
    ds.surahs.filter((s) => s.truth_class !== TRUTH_CANONICAL).length +
    ds.ayahs.filter((a) => a.truth_class !== TRUTH_CANONICAL).length +
    literal.filter((t) => t.truth_class !== TRUTH_CANONICAL).length;
  if (tainted > 0) v.push(`${tainted} canonical node(s) are not tagged truth_class="canonical"`);
  else pass("truth_class", 'scripture + literal translations tagged "canonical"');

  if (v.length > 0) throw new IntegrityError(v);
  return { checks };
}
