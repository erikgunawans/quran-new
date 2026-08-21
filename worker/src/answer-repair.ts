/**
 * REPAIR — turn a guard refusal into a shorter TRUE answer instead of silence.
 *
 * WHY THIS EXISTS. Erik ruled 2026-08-21: the app must always answer. Before this, a violation
 * anywhere in the prose deleted the WHOLE answer, and the reader got
 * *"Aku belum menemukan jalan dari pertanyaanmu ke ayat-ayatnya"* — over an answer the model had
 * already written, most of which was fine. One bad sentence cost the other nine.
 *
 * The guard's RULES are unchanged and none is relaxed. What changes is the CONSEQUENCE: a violating
 * sentence is excised and the rest ships. The app still never invents scripture; it just no longer
 * throws away the paragraph that didn't.
 *
 * ── THE ONE DESIGN CONSTRAINT THAT MATTERS ──────────────────────────────────────────────────────
 *
 * **Sentences are the unit of EXCISION. Whole prose stays the unit of JUDGEMENT.**
 *
 * This is not fastidiousness. It is on record in this repo (`scope-decides-the-discriminator`) that
 * these guards do NOT mean the same thing at the two scopes: rare-word overlap separates whole
 * prose and fails sentence-scoped, and the run-length check does the reverse. `scriptureEchoShape`
 * measures adjacency ACROSS the split on purpose — `answer-guard.ts:606` says so in terms: "ADJACENCY
 * IS MEASURED ON THE WHOLE PROSE, NOT PER SENTENCE, AND THAT IS A FIX."
 *
 * So a repair that asked "is THIS sentence clean?" would be asking a question the guard does not
 * answer, and would ship prose the real wall rejects. Instead every decision here is made by running
 * the caller's own guard over the FULL candidate text, exactly as it will be judged on egress. A
 * sentence is dropped only because dropping it made the WHOLE prose better by the guard's own count.
 *
 * ── ONE BINDING ─────────────────────────────────────────────────────────────────────────────────
 *
 * `guard` is INJECTED, never re-derived. `diagnostic-outlives-its-gate` is this repo's record of a
 * report that copied a gate's logic and then disagreed with it. The repair and the egress wall must
 * be the same function or this whole module is theatre.
 */
/**
 * The MINIMUM a verdict must expose for repair to work.
 *
 * Structural, not `AnswerGuardResult`, because the generation loop injects its own narrower
 * `GuardVerdict`. Repair must accept whatever the CALLER'S wall is, so it can never end up bound to
 * a different guard than the one deciding egress — which is the whole point of the header above.
 */
export interface RepairVerdict {
  readonly ok: boolean;
  readonly violations: readonly unknown[];
}

export interface RepairResult {
  /** Prose that PASSES the injected guard, or null when no excision could reach a clean state. */
  readonly prose: string | null;
  /** How many sentences were removed. 0 means the input was already clean. */
  readonly dropped: number;
}

/**
 * Above this many sentences the O(n²) search is refused rather than run.
 *
 * Not a quality judgement — a bound on work. A real answer runs 5–15 sentences; 60 means something
 * pathological (a model looping), and that turn is better served by the normal refusal path than by
 * ~3,600 guard evaluations inside a request that already has a deadline. Chosen well above the
 * observed maximum rather than close to it, because a bound set near the real maximum is how
 * `bundle-absence-needs-a-control` got written.
 */
const MAX_SENTENCES = 60;

/**
 * Split into pieces that CONCATENATE BACK TO THE INPUT EXACTLY.
 *
 * That exactness is the point: repair must never reflow, retype or normalise the model's prose. It
 * removes whole pieces or it does nothing. `normaliseForSentences` in the guard deliberately mutates
 * text for ANALYSIS (flattening "HR.", moving markers); reusing it here would silently rewrite what
 * we ship.
 *
 * A trailing citation marker is pulled back into the sentence it cites, for the same reason the
 * guard does it: the model writes "…perkara berat. [H:muslim:154]", so a naive split puts the
 * receipt in the NEXT sentence and dropping either one orphans the other.
 */
export function splitSentences(prose: string): string[] {
  const raw = prose.match(/[^.!?\n]*(?:[.!?]+|\n+|$)/g)?.filter((s) => s !== "") ?? [];
  const LEADING_MARKERS = /^(\s*(?:\[H:[a-z][a-z-]*:\d{1,6}\]\s*)+)/i;
  const out: string[] = [];
  for (const piece of raw) {
    // Markers at the START of a piece cite the claim BEFORE them — the model writes
    // "…perkara berat. [H:muslim:154] Lalu…", so the receipt lands at the head of the next split.
    // Move exactly that prefix back; the remainder stays its own sentence. (A first cut only
    // handled a piece that was ENTIRELY markers, which is the rarer shape and left the common one
    // orphaning the receipt.)
    // Narrowed rather than asserted with `!`: this repo's standing rule is to prefer a compile error
    // over a comment claiming a guarantee, and both `out[last]` and `lead[1]` are genuinely
    // optional under `noUncheckedIndexedAccess`.
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    const markers = prev === undefined ? undefined : LEADING_MARKERS.exec(piece)?.[1];
    if (prev !== undefined && markers !== undefined) {
      out[out.length - 1] = prev + markers;
      const rest = piece.slice(markers.length);
      if (rest) out.push(rest);
      continue;
    }
    out.push(piece);
  }
  return out;
}

/**
 * Excise violating sentences until the WHOLE prose passes `guard`.
 *
 * Greedy by the guard's own violation count: each round drops the single sentence whose removal
 * most reduces violations, ties broken toward removing the LEAST text. A round that cannot improve
 * the count stops the search — dropping further sentences would be shortening the answer without
 * evidence that it helps, which is just silence arriving slowly.
 *
 * Returns `prose: null` when no clean state was reachable. The caller decides what that means; this
 * function never invents replacement text and never returns prose it has not seen the guard accept.
 */
export function repairAnswerProse(
  candidate: string,
  guard: (prose: string) => RepairVerdict,
): RepairResult {
  if (guard(candidate).ok) return { prose: candidate, dropped: 0 };

  const parts = splitSentences(candidate);
  if (parts.length < 2 || parts.length > MAX_SENTENCES) return { prose: null, dropped: 0 };

  const keep = parts.map(() => true);
  const join = (mask: readonly boolean[]): string => parts.filter((_, i) => mask[i]).join("");

  for (let round = 0; round < parts.length; round++) {
    const current = guard(join(keep));
    if (current.ok) {
      const prose = join(keep).trim();
      // Empty is not an answer. Anything else is, and shipping a thin true answer over a rich
      // refusal is the whole point of Erik's 2026-08-21 ruling. No word floor: this repo's record
      // (`a-fixture-can-teach-the-suite-to-expect-the-bug`) is that a length threshold acquires a
      // fixture that teaches the suite to expect whatever the threshold happens to admit.
      return prose ? { prose, dropped: keep.filter((k) => !k).length } : { prose: null, dropped: 0 };
    }

    let bestIndex = -1;
    let bestViolations = current.violations.length;
    let bestCost = Infinity;
    for (let i = 0; i < parts.length; i++) {
      if (!keep[i]) continue;
      const trial = keep.slice();
      trial[i] = false;
      const text = join(trial);
      if (!text.trim()) continue;
      const v = guard(text).violations.length;
      const cost = parts[i]!.length;
      if (v < bestViolations || (v === bestViolations && v < current.violations.length && cost < bestCost)) {
        bestIndex = i;
        bestViolations = v;
        bestCost = cost;
      }
    }
    if (bestIndex === -1) return { prose: null, dropped: 0 };
    keep[bestIndex] = false;
  }

  return { prose: null, dropped: 0 };
}
