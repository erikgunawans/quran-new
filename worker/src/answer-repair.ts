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
 * prose and fails sentence-scoped, and the run-length check does the reverse.
 *
 * READ EACH RULE'S SCOPE OFF ITS OWN BODY, NEVER OFF A REFERENCE TO IT. An earlier version of this
 * block had the two `own_wording` rules exactly backwards; a later session inherited the swap and
 * built an inverted finding on top of it before `scholarly-gate` caught it (ISC-559). What the two
 * bodies in `answer-guard.ts` actually do:
 *
 *   · `wordingShape` is WHOLE-PROSE. It runs `matchAll` over the whole normalised text with no
 *     sentence split, and the free-standing SCOPE block that governs it — `answer-guard.ts:579-616`,
 *     which sits above `DIVINE_VERB` (a one-line docblock at `:617` stands between them, so the
 *     range is the reliable pointer, not the adjacency) — says so at `:606`: "ADJACENCY IS MEASURED
 *     ON THE WHOLE PROSE, NOT PER SENTENCE, AND THAT IS A FIX." This is the rule whose window spans
 *     the split. (NOT the block above `VERBATIM_DIVINE` at `:903-1004` — that one is about a claim
 *     that the quote IS God's wording, and a first draft of this very correction misfiled the
 *     sentence there, which is the same class of error the correction was retiring.)
 *   · `scriptureEchoShape` is SENTENCE-SCOPED. It returns null on empty `verses`, then splits on
 *     `/(?<=[.!?])\s+/u` and returns the offending SENTENCE.
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
 *
 * ── WHY `rule` AND `detail` ARE NOW REQUIRED (ISC-562, 2026-08-22) ──────────────────────────────
 *
 * `violations: readonly unknown[]` was enough while the search hill-climbed on the COUNT alone, and
 * that is exactly what made it blind. `guardAnswerProse` pushes at most ONE violation per RULE
 * (`web/src/answer-guard.ts:1237-1278`, each an `if (x) violations.push(...)`), and `wordingShape`
 * returns only its FIRST matching span — so prose carrying TWO `Allah berfirman … "<verse wording>"`
 * sentences scores 1, deleting either one alone still scores 1, and the two-step move that clears it
 * is unreachable. Measured on the blocked turn of the OFFLINE capture of 2026-08-21
 * (`src/eval/refusal-capture.ts` — not prod, which answered that question) at QS At-Tahrim 66:6 and
 * QS Al-Baqarah 2:24.
 *
 * The count cannot distinguish "the offending span is gone" from "nothing happened". The IDENTITY of
 * the reported violation can, and the verdict already carried it. `unknown` was hiding a field the
 * search needed, not protecting a caller from one — the live closure at `worker/src/index.ts:824`
 * returns the full `AnswerGuardResult` and always did.
 *
 * REQUIRED, NOT OPTIONAL. An optional `detail` would let a caller silently lose this fix while every
 * test around it stayed green — the same shape as `isGroundedHadith = () => false`, which is on
 * record in this repo as having made a whole class of hadith check inert at one call site.
 */
export interface RepairVerdict {
  readonly ok: boolean;
  readonly violations: readonly { readonly rule: string; readonly detail: string }[];
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
 * WHICH violations a verdict is reporting, as one comparable string.
 *
 * Order-insensitive — sorted — because two verdicts naming the same offences in a different order
 * are the same verdict, and treating that as progress would let the search take a move that removed
 * nothing. `\u0000` separates the two fields and `\u0001` the entries, so a `detail` containing the
 * other separator cannot forge a boundary; neither control character survives in model prose.
 *
 * This says nothing about how many SENTENCES violate — the guard does not report that, which is the
 * defect this whole mechanism works around. It says only whether the guard is now complaining about
 * something different, which is the weakest honest evidence that a deletion did something.
 */
const identify = (verdict: RepairVerdict): string =>
  verdict.violations
    .map((v) => `${v.rule}\u0000${v.detail}`)
    .sort()
    .join("\u0001");

/**
 * Excise violating sentences until the WHOLE prose passes `guard`.
 *
 * Greedy, and NO LONGER GREEDY ON THE COUNT ALONE — this paragraph said it was until 2026-08-22 and
 * a `scholarly-gate` pass caught the docblock describing the opposite of the code beneath it. Each
 * round ranks every single-sentence deletion:
 *
 *   RANK 0  the guard's violation count FELL. Unchanged from the original search, tie-break toward
 *           removing the LEAST text included. A rank-0 move always beats a rank-1 one.
 *   RANK 1  the count HELD but the guard is now reporting a DIFFERENT violation — so the span it was
 *           complaining about is no longer in the text. This is the ISC-562 case: `guardAnswerProse`
 *           pushes at most one violation per RULE, so two sentences tripping one rule both score 1
 *           and neither single deletion looks like progress to a counter.
 *   RANK 2  everything else — the count ROSE, or nothing the guard reports changed at all. Never
 *           taken. Both belong here: a deletion that makes the verdict WORSE is not progress
 *           either, and a first draft of this list described rank 2 as only the second case,
 *           from which a reader could wrongly infer a worsening deletion is rank-1 eligible.
 *
 * **RANK 1 IS EVIDENCE, NOT PROOF, AND THE DIFFERENCE IS REAL.** `wordingShape` reads a 160-character
 * window that CROSSES sentence boundaries (`answer-guard.ts:1016`, and see
 * `appositive-defeats-the-subject-verb-cap`), so removing a sentence that violated NOTHING can still
 * change which span is reported first. A rank-1 move therefore means "the deletion changed what the
 * guard says", not "the deletion removed an offender". The cost tie-break has favoured a real
 * offender in every case constructed against the real guard so far, and **that is a measured set, not
 * a guarantee** — nothing here proves an innocent sentence can never be the one dropped.
 *
 * When NO single deletion is observable at all, one bounded TWO-deletion expansion runs; see the
 * PLATEAU block in the body for what it costs and, more importantly, for what it does NOT fix.
 *
 * ── WHAT THIS FUNCTION STILL CANNOT DO, stated where a reader arrives rather than 90 lines down ──
 *
 * **Three or more offenders that all report the SAME `detail` end in silence.** Rank 1 cannot see
 * them (the report never changes) and one pair expansion cannot clear them. Real, unfixed, and
 * deliberately not pinned by a passing test — see `ISA.md` ISC-562.
 *
 * Returns `prose: null` when no clean state was reachable. The caller decides what that means; this
 * function never invents replacement text and never returns prose it has not seen the guard accept —
 * with one exactness caveat that predates this cycle: the returned string is `join(keep).trim()`
 * while the verdict was earned on `join(keep)`, so the shipped bytes are the guarded bytes minus
 * leading and trailing whitespace.
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
  /** One two-deletion expansion per call — see the PLATEAU block for why one and not more. */
  let pairExpansionAvailable = true;

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

    const currentIdentity = identify(current);
    let best: { index: number; rank: number; violations: number; cost: number } | null = null;
    for (let i = 0; i < parts.length; i++) {
      if (!keep[i]) continue;
      const trial = keep.slice();
      trial[i] = false;
      const text = join(trial);
      if (!text.trim()) continue;
      const v = guard(text);
      const n = v.violations.length;
      // RANK 0 — the count fell. Unchanged from the original search, tie-break included.
      // RANK 1 — the count held but the REPORTED VIOLATION CHANGED. That is progress the count cannot
      //          express, and it is the whole of ISC-562. It is EVIDENCE, NOT PROOF that an offender
      //          was removed: `wordingShape`'s 160-character window crosses sentence boundaries, so
      //          removing a sentence that violated nothing can change which span is reported first.
      //          The cost tie-break has picked a real offender in every case constructed against the
      //          real guard — a measured set, not a guarantee. See the docblock.
      // RANK 2 — everything else: the count ROSE, or nothing the guard reports changed at all. Never
      //          taken. A deletion the guard cannot see is shortening the answer without evidence,
      //          which is just silence arriving slowly; a deletion that makes the verdict worse is
      //          not progress under any reading. The ternary below assigns 2 to BOTH cases.
      const rank = n < current.violations.length ? 0 : n === current.violations.length && identify(v) !== currentIdentity ? 1 : 2;
      if (rank === 2) continue;
      const cost = parts[i]!.length;
      const better =
        best === null ||
        rank < best.rank ||
        (rank === best.rank && (n < best.violations || (n === best.violations && cost < best.cost)));
      if (better) best = { index: i, rank, violations: n, cost };
    }
    // A COUNT-LOWERING MOVE ALWAYS BEATS A LATERAL ONE, because `rank` leads the comparison. The
    // lateral move is a fallback for the round where no single deletion helps the count — it is not
    // a new preference, and on every input the original search could solve, this picks the same
    // sentence in the same order.
    if (best !== null) {
      keep[best.index] = false;
      continue;
    }

    // ── PLATEAU: NO SINGLE DELETION IS OBSERVABLE AT ALL ──────────────────────────────────────
    //
    // WHY THE IDENTITY SIGNAL ABOVE IS NOT ENOUGH, measured against the REAL `guardAnswerProse` on
    // 2026-08-22 rather than against a fake:
    //
    //   two sentences citing DIFFERENT bad refs  → detail "9:129" then "8:77" → repairs, dropped 2
    //   two sentences citing the SAME bad ref    → detail "9:129" throughout  → prose: null
    //
    // `bad_ref` reports `normRef(...)`, `arabic` reports a SINGLE CHARACTER, `hadith_marker` reports
    // the marker text, and every push site truncates with `.slice(0, 80)`. Two offenders can
    // therefore be genuinely distinct sentences that report the SAME detail, and to the rank above
    // they are indistinguishable from a clean sentence. Ranking on identity is a strictly better
    // count — it is not a solution.
    //
    // So when nothing single is observable, look at PAIRS once. A pair is taken only when removing
    // BOTH lowers the count, which is the same evidence rank 0 demands; no lateral pair, no blind
    // deletion. Ties go to the pair that removes the least text, as everywhere else here.
    //
    // BOUNDED TO ONE EXPANSION PER CALL, and that bound is a real limit, not a formality: three or
    // more offenders that all report the SAME detail still end in silence. That case is NOT fixed
    // and is not claimed to be — `measured-set-is-not-a-class` is this repo's record of what
    // happens when a bound that held on the measured sample is written up as a closed class.
    //
    // WHAT ONE EXPANSION COSTS, MEASURED 2026-08-22 rather than reasoned about: at 59 sentences —
    // one under `MAX_SENTENCES`, with the two offenders 30 sentences apart so nothing single is
    // observable — **1,773 guard evaluations, 253 ms against the REAL `guardAnswerProse`** (6 ms
    // against a trivial fake, which is why the real one was measured). That sits inside the ~3,600
    // this module already budgets at `MAX_SENTENCES`. A real answer runs 5–15 sentences, where the
    // expansion is ~105 evaluations.
    //
    // WHY ONE AND NOT TWO — and the first version of this sentence got the reason WRONG, which is
    // worth leaving visible because it is the sentence a future reader will weigh when deciding to
    // lift the bound. It said a second expansion "would make the bound cubic". It would not: two
    // expansions is 2·n², still quadratic. Only an UNBOUNDED per-round expansion is cubic. The real
    // reason for the cap is the TURN budget below, not the asymptotics.
    //
    // THE BUDGET IS PER CALL AND THE TURN NOW MAKES SEVERAL (ISC-561, landing in the same change).
    // `runGeneration` offers repair EVERY refused candidate, so a turn can run `MAX_ATTEMPTS` searches
    // — worst case ≈ 2 × (3,600 singles + 1,770 pairs) ≈ 10.7k guard evaluations inside a request that
    // already has a deadline. A measured 60-sentence / 20-offender case ran 1,032 calls in 141 ms, so
    // this is a bound worth NAMING rather than an observed problem — but the multiplication is real and
    // no earlier comment mentioned it.
    if (!pairExpansionAvailable) return { prose: null, dropped: 0 };
    pairExpansionAvailable = false;

    let bestPair: { a: number; b: number; violations: number; cost: number } | null = null;
    for (let i = 0; i < parts.length; i++) {
      if (!keep[i]) continue;
      for (let j = i + 1; j < parts.length; j++) {
        if (!keep[j]) continue;
        const trial = keep.slice();
        trial[i] = false;
        trial[j] = false;
        const text = join(trial);
        if (!text.trim()) continue;
        const n = guard(text).violations.length;
        if (n >= current.violations.length) continue;
        const cost = parts[i]!.length + parts[j]!.length;
        if (bestPair === null || n < bestPair.violations || (n === bestPair.violations && cost < bestPair.cost)) {
          bestPair = { a: i, b: j, violations: n, cost };
        }
      }
    }
    if (bestPair === null) return { prose: null, dropped: 0 };
    keep[bestPair.a] = false;
    keep[bestPair.b] = false;
  }

  return { prose: null, dropped: 0 };
}
