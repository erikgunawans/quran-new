/**
 * REPAIR — turn a guard refusal into a shorter TRUE answer instead of silence.
 *
 * WHY THIS EXISTS. Erik ruled 2026-08-21: the app must always answer. Before this, a violation
 * anywhere in the prose deleted the WHOLE answer, and the reader got
 * *"Aku belum menemukan jalan dari pertanyaanmu ke ayat-ayatnya"* — over an answer the model had
 * already written, most of which was fine. One bad sentence cost the other nine.
 *
 * The guard's RULES are unchanged and none is relaxed. What changes is the CONSEQUENCE: the violating
 * PARAGRAPH is excised and the rest ships. The app still never invents scripture; it just no longer
 * throws away the answer that didn't.
 *
 * ── THE ONE DESIGN CONSTRAINT THAT MATTERS ──────────────────────────────────────────────────────
 *
 * **Paragraphs are the unit of EXCISION. Whole prose stays the unit of JUDGEMENT.**
 *
 * THIS HEADER SAID "SENTENCES" UNTIL 2026-08-22, and it is being corrected here rather than only in
 * the function below because a `scholarly-gate` pass had ALREADY convicted this file, one day
 * earlier, of a docblock stating the opposite of the code beneath it (`ISA.md` Cycle 12, finding 2)
 * — and the second pass found the identical defect had reappeared at the TOP of the same file. A
 * reader who reads this header and stops must not be told the wrong unit. Why the unit changed:
 * `splitParagraphs`, which carries the prod answer that forced it.
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
 * paragraph is dropped only because dropping it made the WHOLE prose better by the guard's own count.
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
  /** How many PARAGRAPHS were removed. 0 means the input was already clean. */
  readonly dropped: number;
}

/**
 * Above this many UNITS the O(n²) search is refused rather than run.
 *
 * Not a quality judgement — a bound on work. 60 means something pathological (a model looping), and
 * that turn is better served by the normal refusal path than by ~3,600 guard evaluations inside a
 * request that already has a deadline. Chosen well above the observed maximum rather than close to
 * it, because a bound set near the real maximum is how `bundle-absence-needs-a-control` got written.
 *
 * THE UNIT CHANGED ON 2026-08-22 AND THE NUMBER DELIBERATELY DID NOT. It used to bound SENTENCES
 * (a real answer runs 5–15); it now bounds PARAGRAPHS, and four real prod answers measured the same
 * day ran 3–4. So the bound went from ~4× the observed maximum to ~15×, which is looser than it
 * needs to be and is left that way on purpose: lowering it would be tuning a work bound against a
 * FOUR-answer sample, and the cost it guards against — the quadratic search — is now far cheaper at
 * this granularity than it was at the old one. If it is ever tightened, measure the paragraph-count
 * distribution first on a real sample; do not divide the old number by anything.
 */
const MAX_UNITS = 60;

/**
 * Split into PARAGRAPHS that concatenate back to the input exactly.
 *
 * ── WHY THE UNIT OF EXCISION IS THE PARAGRAPH AND NO LONGER THE SENTENCE ────────────────────────
 *
 * MEASURED ON PROD, 2026-08-22, on the deploy of `e6791f0`. Asked *"kenapa kita harus salat lima
 * waktu"*, both attempts were refused `bad_hadith`, repair excised ONE sentence, and the reader was
 * shipped this:
 *
 *   "Rasulullah ﷺ memberikan perumpamaan yang indah tentang shalat lima waktu. **Tentu tidak.**
 *    Itulah perumpamaan shalat lima waktu, yang dengannya Allah menghapus dosa-dosa."
 *
 * The model had written Bukhari 518 as its dialogue — *"…if he bathed in it five times a day, would
 * any dirt remain?"* → *"Tentu tidak."* → *"That is the parable of the five prayers."* The wall
 * objected to the sentence carrying the unbacked attribution, repair removed exactly that sentence,
 * and the REPLY was left standing with nothing to reply to.
 *
 * A SENTENCE IS NOT A SELF-CONTAINED UNIT OF MEANING. Its neighbours can depend on it, and the guard
 * cannot see that: the guard is a rules wall, not a coherence check, so prose that strands a survivor
 * passes every rule it has. `bundle-absence-needs-a-control` in reverse — the wall returning `ok` is
 * evidence about RULES, and was being read as evidence about READABILITY.
 *
 * The failure that made this urgent is not the one observed. A dangling reply is incoherent; deleting
 * a NEGATION or a QUALIFIER is false. "Ini tidak berarti X. X adalah…" loses its first sentence and
 * the answer now asserts X, under the same mechanism, decided by which sentence the wall happened to
 * object to.
 *
 * A PARAGRAPH IS self-contained enough: excising a whole one cannot strand a sentence inside it,
 * because there is no inside left. This is structural, not a heuristic — no connective word list, no
 * dependency parse, nothing to tune, and no fixture to teach the suite what to expect.
 *
 * WHAT IT COSTS, and this is a real cost, not a rounding error: an answer loses a whole paragraph
 * where it used to lose a sentence. Measured on FOUR real prod answers on 2026-08-22 — n=4, said
 * plainly because a larger sample was attempted and the sampler's loop condition was broken, so the
 * bigger number is one this comment does not have. All four ran 3–4 paragraphs of 8–19 sentences, so
 * a paragraph is roughly a quarter to a third of the answer and at least two units remained in every
 * one. FOUR ANSWERS CANNOT RULE OUT A SINGLE-PARAGRAPH ANSWER, which under this unit repairs to
 * nothing and ships silence — that case is unmeasured, not absent. NOT free, and chosen anyway: a
 * thinner coherent answer beats a fluent one with a hole in the middle, on a surface that speaks
 * about the Prophet.
 *
 * WHAT IT DOES NOT FIX, stated because the same class survives across the boundary: a FOLLOWING
 * paragraph can still open on a connective that refers to the one removed ("Selain itu, …"). That is
 * narrower — additive openers survive a missing predecessor far better than a bare reply does — but
 * it is the same defect and it is NOT closed.
 *
 * AND THE CLASS IS WIDER THAN AN OPENER, which this comment claimed until it was scoped. The SAME
 * prod answer that supplied "Selain itu, …" also OPENS its final paragraph on "Jadi, setiap kali
 * Anda merasa berat atau malas untuk shalat, ingatlah sungai rahmat yang mengalir itu." — a definite
 * anaphora whose antecedent is nowhere in the shipped prose. (It does not CLOSE on it; two sentences
 * follow. A first version of this note said "closed on", which is the same positional error the
 * change carrying it was written to correct, one paragraph over.)
 *
 * The capture cannot show WHAT was removed — `gen.attempts` carries timings and outcomes, not prose,
 * and the pre-repair text is on no disk here. That the antecedent left with the excision is an
 * INFERENCE. It is a constrained one: `repairedDropped: 1` means exactly one boundary lost a
 * paragraph, and only the boundary before "Selain itu, …" explains BOTH danglers at once. Under that
 * reading the anaphora sits two paragraphs downstream of the removal, so a repair inspecting only the
 * excised paragraph's immediate successor cannot reach it. Scoped, with the candidate fixes and why
 * each is refused, in `ISA.md` ISC-566. Still OPEN, still unfixed, and deliberately not pinned by a
 * passing test.
 *
 * Same exactness contract as `splitSentences`: the pieces rejoin to the input byte for byte, so
 * repair still removes whole pieces or does nothing, and never reflows what the model wrote.
 */
export function splitParagraphs(prose: string): string[] {
  // Keep each separator with the piece BEFORE it, so rejoining is byte-exact and a surviving
  // paragraph carries its own trailing break rather than inheriting the deleted one's.
  const raw = prose.match(/[^\n]*(?:\n+|$)/g)?.filter((s) => s !== "") ?? [];
  const out: string[] = [];
  for (const piece of raw) {
    // A run of blank lines belongs to the paragraph it closes; a piece that is only whitespace is
    // therefore merged backwards rather than becoming a unit that could be "dropped" on its own.
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    if (prev !== undefined && piece.trim() === "") {
      out[out.length - 1] = prev + piece;
      continue;
    }
    out.push(piece);
  }
  return out;
}

/**
 * NO LONGER THE UNIT OF EXCISION (2026-08-22) — `splitParagraphs` is. Kept, not deleted.
 *
 * `repairAnswerProse` stopped calling this when prod shipped a stranded reply; the reasoning is in
 * `splitParagraphs`. It is retained rather than removed for two reasons and neither is sentiment:
 * the paragraph unit is a YOUNG decision resting on a four-answer sample, and a single-paragraph
 * measurement could reverse it. (A first draft gave a second reason — that the marker-merge rule
 * below is "the only place in this repo" that knows a `[H:…]` receipt written after a full stop
 * belongs to the sentence BEFORE it. That is false, and falsified twelve lines further down by this
 * file's own prose: the guard does it too, at `web/src/answer-guard.ts:549`.)
 * **Its only caller today is its own test.** If
 * the paragraph unit outlives a real sample, delete this and its tests together — do not leave it
 * exported and untested, and do not quietly re-point repair at it without re-reading the prod
 * transcript in `splitParagraphs`.
 *
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
 * Excise violating PARAGRAPHS until the WHOLE prose passes `guard`.
 *
 * Greedy, and NO LONGER GREEDY ON THE COUNT ALONE — this paragraph said it was until 2026-08-22 and
 * a `scholarly-gate` pass caught the docblock describing the opposite of the code beneath it. Each
 * round ranks every single-PARAGRAPH deletion:
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
 * window that CROSSES sentence AND paragraph boundaries (`answer-guard.ts:1016`, and see
 * `appositive-defeats-the-subject-verb-cap`), so removing a paragraph that violated NOTHING can still
 * change which span is reported first. A rank-1 move therefore means "the deletion changed what the
 * guard says", not "the deletion removed an offender". The cost tie-break has favoured a real
 * offender in every case constructed against the real guard so far, and **that is a measured set, not
 * a guarantee** — nothing here proves an innocent paragraph can never be the one dropped.
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

  // PARAGRAPHS, not sentences — see `splitParagraphs` for the prod answer that forced this.
  const parts = splitParagraphs(candidate);
  if (parts.length < 2 || parts.length > MAX_UNITS) return { prose: null, dropped: 0 };

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
    // unit in the same order.
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
    // WHAT ONE EXPANSION COSTS, MEASURED 2026-08-22 rather than reasoned about: at 59 units — one
    // under `MAX_UNITS`, with the two offenders 30 apart so nothing single is observable —
    // **1,773 guard evaluations, 253 ms against the REAL `guardAnswerProse`** (6 ms against a
    // trivial fake, which is why the real one was measured). That sits inside the ~3,600 this
    // module budgets at `MAX_UNITS`.
    //
    // THAT MEASUREMENT WAS TAKEN WHEN A UNIT WAS A SENTENCE, and it is kept because it still bounds
    // the worst case the code admits. The REAL cost fell sharply when the unit became a PARAGRAPH:
    // four prod answers on 2026-08-22 (n=4) ran 3-4 paragraphs, where the whole expansion is ~6
    // evaluations and the greedy search ~16. The pathological figure above is now very far from
    // anything observed - which is the safe direction for a bound, and the wrong direction to quote
    // as a typical cost.
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
