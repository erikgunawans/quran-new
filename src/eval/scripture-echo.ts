/**
 * An INDEPENDENT detector for hand-written scripture — the instrument ISC-419 needs and did not have.
 *
 * WHY IT EXISTS. `wall-live-probe`'s line `Leaks past the deployed wall (wordingShape on returned
 * prose): 0` cannot fail. `guardAnswerProse` IS the egress gate (`worker/src/index.ts`) and it calls
 * `wordingShape`, so every answer the Worker returns is clean under that function by construction —
 * the line prints 0 whether the fix shipped, was reverted, or never existed. Re-running it produces
 * a number, not evidence. This repo has now hit that shape twice; the first was `eval:grounding`
 * pinning the hadith predicate to `() => false`.
 *
 * WHAT MAKES THIS ONE INDEPENDENT. It imports NOTHING from `answer-guard.ts` and shares no rule with
 * it. The wall asks a GRAMMAR question — is there an attribution verb or a citation near a quoted
 * span. This asks a CORPUS question — does this prose reproduce the wording of a translation we
 * actually ship. Those two can disagree in both directions, which is the entire point: a rendering
 * with no attribution verb and no quotation marks is invisible to the wall and loud here.
 *
 * WHAT IT MEASURES, per (prose, ayah) pair:
 *
 *   `run`   longest contiguous shared STEM run. The verbatim axis. A hand-written rendering of an
 *           ayah tracks the pinned translation closely, so this goes long: the known 2026-08-17
 *           violation scores 11 against QS 17:32's companion text.
 *   `hit`   how many of the translation's RARE stems (document frequency ≤ `DF_MAX` across all
 *           12,472 shipped translations) the prose reproduces. The paraphrase axis — it survives
 *           re-wording, because `tangkai`/`seratus`/`biji` are what carry QS 2:261 whatever the
 *           grammar around them.
 *   `quoted` whether the matched prose sits inside quotation marks. Recorded as a LEXICAL FACT and
 *           nothing more. Whether an UNQUOTED rendering violates ISC-419's words or only its spirit
 *           is Erik's open ruling and this file does not decide it — it makes the seam countable.
 *
 * WHAT IT CANNOT DO, stated because a detector's blind spots are the only part worth writing down.
 *
 *   1. UNANCHORED PARAPHRASE IS NOT DETECTED. Scored against the whole corpus with no anchor, the
 *      QS 2:261 paraphrase ranks BELOW an unrelated ayah (50:9) that happens to share `tumbuh`.
 *      Separation only appears once candidates are anchored to the refs the turn cited or was given.
 *      So: a re-worded rendering of an ayah the prose never cites and retrieval never returned will
 *      be MISSED. The verbatim axis has no such gap — `run` is scanned corpus-wide.
 *   2. IT DOES NOT RETURN A VERDICT. Every row above threshold is printed for a human to read. A
 *      count from this file is a count of CANDIDATES, never of violations.
 *   3. ITS CONTROL SET IS PARTLY HAND-WRITTEN. `scripture-echo.test.ts` forces it red on the real
 *      2026-08-17 violation and the real QS 2:261 paraphrase — both production strings — but three
 *      of its four negative controls are prose I wrote, and prose we write is a vocabulary of one.
 *      Live clean answers are the control that counts; run it against a dump and read the zeroes.
 *   4. SCRIPTURE ONLY. ISC-419 is about the Qur'an. Prophetic wording is a different criterion with
 *      a different corpus and is out of scope here.
 *
 * USAGE.
 *   bun run src/eval/wall-live-probe.ts --repeat 3 --dump /tmp/rows.json
 *   bun run src/eval/scripture-echo.ts --rows /tmp/rows.json
 *   bun run src/eval/scripture-echo.ts --text "some prose"          # one-off, anchored on its own refs
 */

// ── normalisation ───────────────────────────────────────────────────────────────────
//
// A crude prefix/suffix stripper, NOT a real Indonesian stemmer, and crude on purpose: this is a
// candidate surfacer whose every row is read by a human, so over-stemming costs a row to read and
// under-stemming costs a miss. `menumbuhkan`/`tumbuh` and `ditanam`/`menanam` have to collapse or
// the paraphrase axis sees nothing, and that is the one thing it exists for.
const STOPWORDS = new Set(
  ("yang dan di ke dari itu ini adalah dengan untuk pada tidak akan sebagai atau juga oleh dalam " +
    "agar maka bagi para kamu kami mereka dia nya ia aku saya kita telah sudah lebih hanya karena " +
    "bahwa apa saja sangat sekali antara serta ada tiap setiap")
    .split(/\s+/),
);

export function stem(word: string): string {
  let s = word;
  // meN- ASSIMILATION, restored — and this clause is why the file has a stemming test.
  //
  // Indonesian elides the root's initial consonant under meN-: tanam → menanam, tumbuh →
  // menumbuhkan, sapu → menyapu, pukul → memukul. A naive prefix strip yields `anam` against the
  // corpus's `tanam` and `umbuh` against `tumbuh`, so the two forms never collapse and the rare-stem
  // axis simply does not see them. That defect was live and SILENT: the QS 2:261 paraphrase still
  // fired, on four other stems, so the detector looked like it worked while under-counting the very
  // echo it was built for. A miss in a detector reads as a clean world, which is the one direction
  // an error here must not take.
  //
  // `meng` + vowel is deliberately NOT restored to `k`: vowel-initial roots dominate it
  // (mengambil → ambil, not kambil), so restoring would mis-stem more than it fixes.
  const assimilated = /^men([aeiou])/.test(s)
    ? s.replace(/^men/, "t")
    : /^mem([aeiou])/.test(s)
      ? s.replace(/^mem/, "p")
      : /^meny([aeiou])/.test(s)
        ? s.replace(/^meny/, "s")
        : null;
  s = assimilated ?? s.replace(/^(memper|mempe|meng|meny|mem|men|me|ber|per|ter|di|ke|se|pe)/, "");
  s = s.replace(/(kanlah|annya|kannya|inya|nya|kan|lah|kah|an|i)$/, "");
  return s.length >= 3 ? s : word;
}

const wordsOf = (s: string): string[] =>
  s.toLowerCase().normalize("NFC").replace(/[^a-z0-9' ]+/gu, " ").split(/\s+/u).filter(Boolean);

export const stemsOf = (s: string): string[] =>
  wordsOf(s).filter((w) => !STOPWORDS.has(w)).map(stem).filter((w) => w.length >= 3);

// ── the shipped translations, which are the thing being echoed ──────────────────────
export interface Translation {
  readonly ref: string;
  /** `primary` = Thalib (interpretive), `companion` = Kemenag (literal). Both ship on the card. */
  readonly kind: "primary" | "companion";
  readonly text: string;
  readonly stems: readonly string[];
}

export async function loadTranslations(dir = "web/public/surah"): Promise<Translation[]> {
  const out: Translation[] = [];
  for (let n = 1; n <= 114; n += 1) {
    const shard = (await Bun.file(`${dir}/${n}.json`).json()) as {
      verses: { a: number; p?: { text?: string }; c?: { text?: string } }[];
    };
    for (const v of shard.verses) {
      for (const [kind, o] of [["primary", v.p], ["companion", v.c]] as const) {
        if (!o?.text) continue;
        out.push({ ref: `${n}:${v.a}`, kind, text: o.text, stems: stemsOf(o.text) });
      }
    }
  }
  return out;
}

/**
 * `DF_MAX` — a stem in at most this many of the ~12,472 translations counts as RARE.
 *
 * The value is not tuned and does not need to be: on the anchored pairs the separation is the same
 * at 60, 150 and 300 (violations hit 3–4 rare stems, every control hits ZERO), so the threshold is
 * not what produces the gap. Recorded because a number that looks tuned invites someone to tune it.
 */
export const DF_MAX = 150;

export interface Detector {
  readonly translations: readonly Translation[];
  /** Anchored: score this prose against ONE ayah's translations. The paraphrase-capable path. */
  readonly against: (prose: string, ref: string) => EchoHit[];
  /** Unanchored: scan the whole corpus for a long verbatim run. The path with no anchor gap. */
  readonly sweep: (prose: string, minRun: number) => EchoHit[];
}

export interface EchoHit {
  readonly ref: string;
  readonly kind: string;
  /** Rare stems in the translation, and how many the prose reproduces. */
  readonly rare: number;
  readonly hit: number;
  readonly cover: number;
  /** Longest contiguous shared stem run — the verbatim axis. */
  readonly run: number;
  /** Which rare stems matched, so a row can be judged without re-deriving it. */
  readonly shared: readonly string[];
  readonly text: string;
}

/** Longest common contiguous run between two stem sequences. */
function longestRun(a: readonly string[], b: readonly string[]): number {
  let best = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k += 1;
      if (k > best) best = k;
    }
  }
  return best;
}

export function buildDetector(translations: readonly Translation[]): Detector {
  const df = new Map<string, number>();
  for (const t of translations) for (const s of new Set(t.stems)) df.set(s, (df.get(s) ?? 0) + 1);
  const rareOf = (t: Translation) => [...new Set(t.stems)].filter((s) => (df.get(s) ?? 0) <= DF_MAX);

  const score = (proseStems: readonly string[], proseSet: ReadonlySet<string>, t: Translation): EchoHit => {
    const rare = rareOf(t);
    const shared = rare.filter((s) => proseSet.has(s));
    return {
      ref: t.ref,
      kind: t.kind,
      rare: rare.length,
      hit: shared.length,
      cover: rare.length ? shared.length / rare.length : 0,
      run: longestRun(proseStems, t.stems),
      shared,
      text: t.text,
    };
  };

  return {
    translations,
    against(prose, ref) {
      const ps = stemsOf(prose);
      const set = new Set(ps);
      return translations.filter((t) => t.ref === ref).map((t) => score(ps, set, t));
    },
    sweep(prose, minRun) {
      const ps = stemsOf(prose);
      const set = new Set(ps);
      return translations
        .map((t) => score(ps, set, t))
        .filter((h) => h.run >= minRun)
        .sort((a, b) => b.run - a.run);
    },
  };
}

// ── reading the prose ───────────────────────────────────────────────────────────────

/**
 * `QS 17:32`, `(QS Al-Isra 17:32)`, `QS. 2:261`, `[2:261]` — refs the prose itself names.
 *
 * A bare `\d+:\d+` is NOT enough and a first cut used one: `pukul 09:30` parsed as QS 9:30, which
 * would have anchored a turn on At-Tawbah and reported whatever that ayah happens to share. A false
 * anchor is worse than a missing one here, because it manufactures rows to read.
 */
export function refsInProse(prose: string): string[] {
  const out = new Set<string>();
  for (const m of prose.matchAll(/(\d{1,3})\s*:\s*(\d{1,3})/gu)) {
    const s = Number(m[1]);
    const a = Number(m[2]);
    if (!(s >= 1 && s <= 114 && a >= 1)) continue;
    // A citation marker, or an opening bracket, within the 40 characters before the number — OR a
    // preceding ref and a list separator, because `QS 2:261 dan 4:11` puts the marker out of reach
    // of the second ref and dropping it would silently halve a listing turn's anchors.
    const lead = prose.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    const marked = /(qs|q\.\s?s\.|surah|surat|al-?qur'?an|[[(])[^\d]{0,32}$/iu.test(lead);
    const chained = /\d{1,3}\s*:\s*\d{1,3}\s*(dan|serta|,|;|&)\s*$/iu.test(lead);
    if (!marked && !chained) continue;
    out.add(`${s}:${a}`);
  }
  return [...out];
}

/**
 * Is the prose that matched a translation sitting inside quotation marks?
 *
 * Reported, never acted on. The wall scans quoted spans only, so this column is what makes the
 * unquoted seam countable rather than anecdotal — it is the difference between "one answer did this
 * once" and a rate. The ruling on whether unquoted counts is Erik's and is not made here.
 */
export function quotedSpans(prose: string): string[] {
  const out: string[] = [];
  for (const m of prose.matchAll(/["“”«»']([^"“”«»']{12,})["“”«»']/gu)) out.push((m[1] ?? "").trim());
  return out;
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────
//
// Thresholds are REPORTING thresholds, not verdicts. Anything at or above them is printed for a
// human to read; nothing below them is claimed clean, because the blind spots in the header are
// real and a zero from this file means "nothing surfaced", never "nothing happened".
const ANCHOR_MIN_HITS = 2;
const ANCHOR_MIN_RUN = 4;
const SWEEP_MIN_RUN = 6;

interface DumpRow {
  readonly q: string;
  readonly bucket: string;
  readonly prose: string;
  readonly verseRefs?: readonly string[];
}

if (import.meta.main) {
  const flag = (n: string): string | undefined => {
    const i = process.argv.indexOf(`--${n}`);
    return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
  };

  const rowsPath = flag("rows");
  const text = flag("text");
  if (!rowsPath && !text) {
    console.error("usage: --rows <wall-live-probe --dump file> | --text \"<prose>\"");
    process.exit(2);
  }

  const rows: DumpRow[] = rowsPath
    ? ((await Bun.file(rowsPath).json()) as DumpRow[]).filter((r) => r.bucket === "answered" && r.prose)
    : [{ q: "--text", bucket: "answered", prose: text ?? "", verseRefs: [] }];

  const det = buildDetector(await loadTranslations());
  console.log(
    `${det.translations.length} shipped translations · DF_MAX ${DF_MAX} · ${rows.length} answered turn(s)\n` +
      `anchored: hit ≥ ${ANCHOR_MIN_HITS} or run ≥ ${ANCHOR_MIN_RUN} · corpus sweep: run ≥ ${SWEEP_MIN_RUN}\n`,
  );

  let anchoredHits = 0;
  let sweepHits = 0;
  let unquoted = 0;

  for (const row of rows) {
    const cited = refsInProse(row.prose);
    const anchors = [...new Set([...cited, ...(row.verseRefs ?? [])])];
    const quotes = quotedSpans(row.prose);
    console.log(`── ${row.q}`);
    console.log(
      `   anchors ${anchors.length} (${cited.length} cited in prose, ${(row.verseRefs ?? []).length} posted) · ${quotes.length} quoted span(s)`,
    );

    for (const ref of anchors) {
      for (const h of det.against(row.prose, ref)) {
        if (h.hit < ANCHOR_MIN_HITS && h.run < ANCHOR_MIN_RUN) continue;
        anchoredHits += 1;
        // Is the echoed wording inside a quotation? Asked of the SHARED stems, so it survives the
        // model re-wording the span — a quoted rendering and an unquoted one are the same finding
        // to this detector, and the column is what separates them for the reader.
        const inQuote = quotes.some((q) => {
          const qs = new Set(stemsOf(q));
          return h.shared.filter((s) => qs.has(s)).length >= Math.max(2, Math.ceil(h.shared.length / 2));
        });
        if (!inQuote) unquoted += 1;
        console.log(
          `   ANCHORED QS ${ref.padEnd(8)} ${h.kind.padEnd(9)} hit ${h.hit}/${h.rare} cover ${h.cover.toFixed(2)}` +
            ` run ${String(h.run).padStart(2)} ${inQuote ? "QUOTED  " : "UNQUOTED"} [${h.shared.join(",")}]`,
        );
        console.log(`      shipped: ${h.text.slice(0, 150)}`);
      }
    }

    for (const h of det.sweep(row.prose, SWEEP_MIN_RUN)) {
      sweepHits += 1;
      console.log(`   SWEEP    QS ${h.ref.padEnd(8)} ${h.kind.padEnd(9)} run ${h.run}  ${h.text.slice(0, 110)}`);
    }
    console.log(`   prose: ${row.prose.replace(/\s+/gu, " ").slice(0, 220)}\n`);
  }

  console.log(`── candidates, NOT violations (a human reads every row above) ──`);
  console.log(`   anchored ${anchoredHits} · of those UNQUOTED ${unquoted} (Erik's open ruling) · corpus sweep ${sweepHits}`);
  console.log(
    `   A zero here means NOTHING SURFACED. It does not mean nothing happened:` +
      ` an unanchored paraphrase is outside this instrument by construction (header, limit 1).`,
  );
}
