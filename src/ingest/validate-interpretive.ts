import { AYAH_COUNT, type CanonicalDataset } from "../domain/canonical.ts";
import { TRUTH_INTERPRETIVE, type InterpretiveDataset } from "../domain/interpretive.ts";
import { IntegrityError, type GateReport } from "./validate.ts";

/**
 * Interpretive integrity gates.
 *
 * The canonical gates assert the Qur'an's fixed shape. These assert something different and
 * just as important: that every claim ABOUT the Qur'an is attributed, anchored to a real
 * verse, and never masquerading as scripture.
 *
 * Coverage is REPORTED, not enforced — a tafsir may legitimately not comment on every ayah,
 * and forcing 6,236 would mean fabricating commentary. Where a source is silent, the system
 * must be silent too (spec Part 3, "honest degradation").
 */
export function validateInterpretive(
  canon: CanonicalDataset,
  interp: InterpretiveDataset,
): GateReport {
  const v: string[] = [];
  const checks: { name: string; detail: string }[] = [];
  const pass = (name: string, detail: string) => checks.push({ name, detail });

  const ayahIds = new Set(canon.ayahs.map((a) => a.id));
  const sourceIds = new Set(interp.tafsir_sources.map((s) => s.id));

  // ── Every source is fully attributed ─────────────────────────────────
  for (const s of interp.tafsir_sources) {
    if (!s.name || !s.author) v.push(`tafsir source ${s.id}: missing name/author`);
    if (![1, 2, 3].includes(s.authority_tier)) {
      v.push(`tafsir source ${s.id}: authority_tier must be 1|2|3, got ${s.authority_tier}`);
    }
    if (s.truth_class !== TRUTH_INTERPRETIVE) {
      v.push(`tafsir source ${s.id}: truth_class must be "interpretive"`);
    }
  }
  if (v.length === 0 && interp.tafsir_sources.length > 0) {
    pass("tafsir_sources", `${interp.tafsir_sources.length} attributed (name, author, tier)`);
  }

  // ── Every passage: real source, real ayah, non-empty, interpretive ────
  const orphanSource = new Set<string>();
  const orphanAyah = new Set<string>();
  let empty = 0;
  let notInterpretive = 0;
  const ids = new Set<string>();
  let dupes = 0;

  for (const p of interp.tafsir_passages) {
    if (!sourceIds.has(p.source_id)) orphanSource.add(p.source_id);
    if (!ayahIds.has(p.ayah_id)) orphanAyah.add(p.ayah_id);
    if (p.text.trim() === "") empty++;
    if (p.truth_class !== TRUTH_INTERPRETIVE) notInterpretive++;
    if (ids.has(p.id)) dupes++;
    ids.add(p.id);
  }

  if (orphanSource.size > 0) {
    v.push(`passages reference unknown source(s): ${[...orphanSource].join(", ")} — provenance hole`);
  } else {
    pass("passage_provenance", "every passage resolves to a declared source");
  }
  if (orphanAyah.size > 0) {
    v.push(`${orphanAyah.size} passage(s) reference an ayah outside the canonical corpus`);
  } else if (interp.tafsir_passages.length > 0) {
    pass("passage_anchoring", "every passage anchors to a real ayah");
  }
  if (empty > 0) v.push(`${empty} passage(s) have empty text`);
  if (notInterpretive > 0) v.push(`${notInterpretive} passage(s) not tagged truth_class="interpretive"`);
  else if (interp.tafsir_passages.length > 0) pass("truth_class", 'all passages tagged "interpretive"');
  if (dupes > 0) v.push(`${dupes} duplicate passage id(s)`);
  else if (interp.tafsir_passages.length > 0) pass("passage_id_uniqueness", `${ids.size} unique`);

  // ── Coverage: reported per source, never forced ──────────────────────
  // An interpretive voice speaks through EITHER tafsir passages OR an interpretive
  // translation. Counting only passages would report a full-coverage interpretive
  // translation (Tafsiriyah) as "0.0%" — a false number is worse than no number.
  for (const s of interp.tafsir_sources) {
    const viaPassages = new Set(
      interp.tafsir_passages.filter((p) => p.source_id === s.id).map((p) => p.ayah_id),
    );
    const viaTranslation = new Set(
      canon.translations.filter((t) => t.source_id === s.id).map((t) => t.ayah_id),
    );
    const covered = new Set([...viaPassages, ...viaTranslation]).size;
    const via = viaPassages.size > 0 ? "tafsir" : "interpretive translation";
    const pct = ((covered / AYAH_COUNT) * 100).toFixed(1);
    const slug = s.id.replace("source:", "");

    if (covered === 0) {
      v.push(`source ${s.id} is declared but contributes nothing — remove it or fix the parser`);
    } else {
      pass(`coverage[${slug}]`, `${covered}/${AYAH_COUNT} (${pct}%) via ${via}`);
    }
  }

  // ── Plurality: the whole design assumes more than one voice ──────────
  if (interp.tafsir_sources.length < 2) {
    v.push(
      `only ${interp.tafsir_sources.length} interpretive source(s) — plural attribution requires ` +
        `at least 2, or the system has nothing to attribute BETWEEN and will read as authoritative`,
    );
  } else {
    pass("plurality", `${interp.tafsir_sources.length} independent voices`);
  }

  if (v.length > 0) throw new IntegrityError(v);
  return { checks };
}
