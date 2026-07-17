/**
 * The egress wall for generated framing prose.
 *
 * DESIGN POSITION (Erik's ruling, 2026-07-17): the model may POINT at meaning; it may never
 * AUTHOR it. When a generative model writes New-Quranku's pastoral framing (the `compose()` seam
 * in retrieve.ts), it speaks ONLY in the app's own companion voice — present, naming the feeling,
 * refusing to fix. It never renders scripture, never emits a verse reference, and never issues an
 * interpretation or a ruling. Scripture, translations, tafsir and references are structural: the
 * app renders them from the grounded retrieval Hits, byte-exact from the sha256-pinned corpus.
 * The model's prose sits ABOVE those cards and does connective, emotional work — nothing more.
 *
 * WHY A WALL AND NOT A PROMPT. "Please don't hallucinate verses" fails, and this codebase already
 * has the receipts: band.ts shipped the wrong verse TWICE by trusting a remembered phrase over the
 * shipped data, and the source index itself misremembers four ayahs that do not exist (8:96, 8:77,
 * 48:59, 11:161). A model does exactly this, confidently, at scale. So safety cannot live in the
 * instructions we give the model — it lives here, on the output, where the model cannot reach past
 * it even if it tries.
 *
 * TWO HARD WALLS + ONE HEURISTIC LAYER.
 *   - `arabic`     (HARD) — the model's prose may contain no Arabic script at all. Scripture is
 *                  rendered structurally from the corpus, never typed by the model. Unambiguous.
 *   - `verse_ref`  (HARD) — the model's prose may contain no verse reference. Retrieval already
 *                  chose the verses and the app renders them below; a reference in prose is either
 *                  redundant or a fabrication. Deictic pointing ("ayat di bawah") is allowed; a
 *                  number ("QS 94:5") is not. Unambiguous.
 *   - `authoring`  (HEURISTIC) — Indonesian phrasings that assign meaning to a verse or issue a
 *                  ruling ("ayat ini artinya…", "Allah menyuruh kamu…", "menurut Islam…"). This is
 *                  best-effort defense-in-depth, NOT an airtight guarantee — Indonesian is too
 *                  supple to fully regex. Its job is to catch the obvious fatwa-shaped output; the
 *                  real guarantee is that on ANY violation the caller falls back to the
 *                  deterministic, hand-written opener, which is honest by construction.
 *
 * The point of the wall is graceful degradation: `safeCompose()` returns the model's prose only
 * when it is clean, and the trustworthy canned line otherwise. The worst case is not a betrayal —
 * it is that the user reads a slightly less personal sentence.
 */

export type GuardViolationKind = "arabic" | "verse_ref" | "authoring";

export interface GuardViolation {
  readonly kind: GuardViolationKind;
  /** The exact substring that tripped the wall — logged, never shown to the reader. */
  readonly detail: string;
}

export interface GuardResult {
  readonly ok: boolean;
  readonly violations: readonly GuardViolation[];
}

/**
 * Arabic-script ranges: main block, supplement, presentation forms A and B. Any codepoint here in
 * the model's prose means scripture leaked into a place only the app's own voice belongs.
 */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * A verse reference in prose. Covers the digit forms ("94:5", "94.5", "2 : 255") and the spelled
 * forms ("surat 94 ayat 5", "QS 94:5"). Retrieval owns which verses appear; the model must not
 * name one.
 */
const VERSE_REF_DIGIT = /\b\d{1,3}\s*[:.]\s*\d{1,3}\b/;
const VERSE_REF_SPELLED = /\b(?:q\.?s\.?|surah|surat|al-?qur['’]?an)\b[^.!?\n]*?\b\d{1,3}\b/i;

/**
 * Fatwa- and interpretation-shaped Indonesian. Deliberately TIGHT: each pattern requires a
 * meaning-verb bound to a verse deixis, or an explicit ruling/authority frame. This must NOT fire
 * on ordinary companion speech ("berat ya", "kamu nggak harus kuat sekarang") — those carry no
 * claim about what scripture means.
 */
const AUTHORING: readonly RegExp[] = [
  // "ayat ini/itu/di bawah ARTINYA / berarti / mengajarkan / menyuruh ..."
  /\bayat\s+(?:ini|itu|tersebut|di\s?bawah|di\s?atas)\s+(?:artinya|berarti|bermakna|maksudnya|mengajarkan|menyuruh|memerintah(?:kan)?|menganjurkan|menjelaskan\s+bahwa)/i,
  // "artinya kamu/kita harus ..." — assigning application to the reader
  /\bartinya\s+(?:kamu|kita|kalian)\b/i,
  // "Allah menyuruh/memerintah/mewajibkan/melarang kamu/kita ..."
  /\ballah\s+(?:menyuruh|memerintah(?:kan)?|mewajibkan|melarang|meminta(?:mu)?)\s+(?:kamu|kita|kalian|agar|untuk|supaya)/i,
  // "menurut Islam / dalam ajaran Islam / Islam mengajarkan ..."
  /\b(?:menurut|dalam\s+ajaran)\s+islam\b/i,
  /\bislam\s+(?:mengajarkan|mengharuskan|mewajibkan|melarang)\b/i,
  // "hukumnya wajib/haram/sunnah/makruh/mubah" — a ruling
  /\bhukum(?:nya)?\s+(?:wajib|haram|sunnah|makruh|mubah)\b/i,
  // "kamu harus/wajib <religious duty>" — prescribing an act of worship
  /\bkamu\s+(?:harus|wajib|mesti)\s+(?:sabar|bersabar|bersyukur|shalat|sholat|salat|berdoa|berdo['’]?a|ikhlas|bertawakal|tawakal|bertaubat|taubat)\b/i,
];

/**
 * Run the model's framing prose against the wall. Pure and synchronous — no corpus needed, because
 * the rule is absolute: prose carries no scripture and no reference, full stop.
 */
export function guardComposeProse(prose: string): GuardResult {
  const violations: GuardViolation[] = [];

  const arabic = ARABIC.exec(prose);
  if (arabic) violations.push({ kind: "arabic", detail: arabic[0] });

  const refDigit = VERSE_REF_DIGIT.exec(prose);
  if (refDigit) violations.push({ kind: "verse_ref", detail: refDigit[0].trim() });
  else {
    const refSpelled = VERSE_REF_SPELLED.exec(prose);
    if (refSpelled) violations.push({ kind: "verse_ref", detail: refSpelled[0].trim() });
  }

  for (const pattern of AUTHORING) {
    const hit = pattern.exec(prose);
    if (hit) {
      violations.push({ kind: "authoring", detail: hit[0].trim() });
      break; // one authoring flag is enough to reject; no need to enumerate them all
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * The caller's safety net. Returns the model's prose only when it clears the wall; otherwise the
 * deterministic hand-written opener, which is honest by construction. Degradation is silent to the
 * reader by design — the fallback is a real, warm sentence, not an error.
 */
export function safeCompose(modelProse: string, deterministicFallback: string): string {
  return guardComposeProse(modelProse).ok ? modelProse : deterministicFallback;
}
