# PROGRESS

Append-only checkpoint log. Newest at the top. Never rewrite history — add a new checkpoint.

---

## 2026-07-13 (later) — The corpus is sharded; Nur can be read. 20/40 → 30/40

**Anchor:** `main` @ `b17b5ee` (local only — no remote)

### What changed

**The app no longer lies about what the Qur'an contains.** It used to tell users that 18:10 —
a real ayah in Al-Kahf — did not exist, because only 55 of 6,236 verses were bundled.

The critique said "just load all 4MB". Measured, that is the wrong fix for the constraint the
same critique names (patchy 4G). **You do not need a verse's text to know the verse is real.**

| Artifact | Size | Job |
|---|---|---|
| `web/src/surah-index.ts` | ~4 KB gzipped, **inlined in the bundle** | The truth oracle. Zero network. |
| `web/public/surah/{n}.json` | median 8 KB gzipped, worst 80 KB (Al-Baqarah) | Fetched on demand |
| `web/public/corpus.json` | 178 KB | Chat hot path, tafsir-bearing |

Consequence worth stating: **with `corpus.json` returning 404, all 110 ayahs of Al-Kahf still
render.** A network failure can no longer take the Qur'an away from you.

- **P0-a** — `18:10` resolves. `18:999` → "Al-Kahf cuma punya 110 ayat". `115:1` → "ada 114 surah".
  Refs accept names too: "al kahfi", "yasin", "surat 18 ayat 10".
- **P0-b** — Reading surface: 114-surah index → continuous ayah view.
- **P0-c** — try/catch + `res.ok` everywhere, visible error, working retry.
- **P1-a** — 55 captions translated. English tafsir sorted last and labelled.
- **P1-b** — Copy/share. Payload always carries BOTH renderings, interpretive one labelled.

### Found along the way (each one would have shipped)

1. **Tanzil prepends the basmalah to ayah 1 of 112 surahs.** `2:1` is really just *"Alif Lam Mim"*.
   Shipped unstripped, 112 surahs render a textually wrong first ayah — against a translation that
   never had it. This was a **pre-existing mismatch**, not a new bug. Stripped on the consonantal
   skeleton (95 and 97 carry a spurious shadda on the bā).
2. **`bun run typecheck` never covered `web/`.** `include: ["src","test"]`, no DOM lib. The entire
   frontend was unchecked while the gate reported clean. Repaired; it immediately found a real error.
3. **The reading surface dropped Al-Baqarah 2:281–286** — including *Amanar-Rasulu* and the longest
   verse in the Qur'an — because the chunk chain rode on `requestIdleCallback` alone, which a
   throttled tab starves. Scripture does not degrade gracefully.
4. **The Indonesian captions were never live.** The source was translated, the test went green, and
   the browser rendered English for an hour — `corpus.json` was built before the translation. The
   test guarded the *source*; the reader sees the *artifact*. Two tests now assert on the shipped file.

### Rejected: the mechanical divergence flag

Conjectured that Jaccard overlap < 20% between the interpretive primary and literal companion could
stand in for human review. **Refuted by measurement.** Median overlap is 29%, so <20% flags 1,224
verses — and the metric **cannot tell 2:156 (the Tafsiriyah's greatest win) from 94:5 (its worst
failure)**; both score ~7–11%. Low overlap measures interpretive *expansion*, not disagreement.

The safeguard was already structural: `literal_companion` puts both renderings in front of every
reader, on every verse. Divergence is now a **human review queue** (`data/review/divergence.json`,
1,224 ranked worst-first), never a reader-facing banner. Full C/R/L entry in `ISA.md` § Changelog.

### Erik ruled this session

- **Ship Tafsiriyah-primary.** Sharding scales the interpretive primary from 55 vetted verses to all
  6,236; the observed defect rate implies ~200 unreviewed 94:5-class renderings. Flipping to
  Kemenag-primary would gut the thesis (2:156 would lead with untranslated Arabic again). Thesis stands.
- **Attribution risk accepted.** "Ustadz Muhammad Thalib" is still inherited, not verified.

### Next, in order — the first one is serious

1. **[P0] Nur does not notice suicidal ideation.** Typed live: *"aku gak sanggup bayar utang, pengen
   mati aja."* Nur matched on `utang` and served a verse about debt repayment. It did not see
   *pengen mati aja* at all. There is **no crisis path anywhere in the codebase**. Rifqi — 19, in
   debt, at 2am — is the product's founding persona. **Needs Erik's ruling on the resource**
   (Kemenkes SEJIWA / 119 ext. 8) before I wire it.
2. **[P1] The core concept is never explained.** *Terjemah makna* vs *terjemah harfiah* — the whole
   product — has zero documentation in the UI.
3. **[P1] `score > 0` ships confident junk.** *"gimana cara sholat tahajud"* returned 2:152
   (Gratitude), matched on the single word `cara`. Needs a minimum-score threshold; the honest-silence
   copy already exists and is simply never reached.
4. **[P1] The thread is destroyed on reload.** Verified: 2 messages → 0.

### Still open from before

- Scholar-board sign-off on sources + authority tiers.
- Read the 16 divergent verses (now ranked in `data/review/divergence.json`) and rule on them.
- Verify the Tafsiriyah text against a **published edition**.
- **Audio/recitation is entirely absent.** The Qur'an *is* recitation.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `data/` (~230 MB) is gitignored and regenerable via `bun run ingest`.
- Gates: **119 tests · typecheck clean (root + web) · 24/24 corpus gates.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — **never weaken these.**

---

## 2026-07-13 — Corpus ingested, spec written, Nur app built & critiqued

**Anchor:** `main` @ `e2f896c` (local only — this repo has no remote)

### What exists now

**1. The design spec** — `docs/design/quran-graphrag.html` (standalone, opens in a browser)
Four parts: hybrid GraphRAG architecture → knowledge-graph schema → triple-extraction pipeline → serving & concurrency. Locked decisions: single-store, hundreds-concurrent, **plural + attributed** doctrine.

**2. The corpus** — deterministic, gated, zero-LLM (`bun run ingest`)
- **Canonical:** 114 surahs · 6,236 ayahs (Tanzil Uthmani) · 6,236 Kemenag literal translations.
- **Interpretive:** 4 attributed voices · 18,707 tafsir passages · 6,236 interpretive translations.

| Source | Role | Tier | Coverage |
|---|---|---|---|
| Tarjamah Tafsiriyah (Ustadz Muhammad Thalib) | **primary** | 3 | 6236/6236 (interpretive translation) |
| Kemenag | **companion** | — | 6236/6236 (literal, canonical) |
| Ibn Kathir | reference | 1 | 6236/6236 (**English** — see open items) |
| As-Sa'di | reference | 2 | 6235/6236 (silent on 72:11) |
| Al-Mukhtasar | reference | 2 | 6236/6236 |

- **24 integrity gates** pass. Sources are sha256-pinned (`src/ingest/sources.lock.json`); checksum drift **hard-fails** the build.
- `corpus_version` is derived from artifact hashes → rebuilds are byte-identical, and cache invalidation is by construction.
- Key invariants enforced in code: `literal_iff_canonical` (an interpretive translation can never be tagged canonical), `primary_voice` (exactly one), `literal_companion` (**the build FAILS if the interpretive primary ships without Kemenag alongside it**).

**3. Nur** — the reading + chat app (`web/`, Vite + TS, no framework runtime)
- PRODUCT.md + DESIGN.md written. Own brand. "Light emerging from dark" — no gold token in the system.
- Chat-first, real Indonesian slang, wired to the real corpus (223KB hot-path bundle).
- Retrieval is transparent keyword+theme scoring. **No generative model in the path** — Nur never answers in a scholar's voice.
- 63/63 tests pass, typecheck clean, 21/21 WCAG AA contrast tests (both themes).

### Key finding — the product thesis is real but NOT universal

`docs/review/primary-voice-review.html` (`bun run review:build`) — 55 verses people actually arrive with, Tafsiriyah vs Kemenag side by side.

- **2:156 — Tafsiriyah WINS.** Kemenag leaves *"Inna lillaahi wa innaa ilaihi raaji'uun"* untranslated; Tafsiriyah renders it in Indonesian. The thesis, proven.
- **94:5–6 — Tafsiriyah LOSES.** "With hardship comes ease" (a promise) becomes "in this worldly life there is suffering and pleasure" (a weather report). Both verses get the *identical* rendering, destroying the Qur'anic repetition. 0% word overlap.
- This ships as a **product feature**: the app flags 94:5–6 and tells the reader to read both.

### Critique — 20/40 (`.impeccable/critique/`)

Design is strong (clears the AI-slop check at both altitudes). **The product is the gap.**

- **[P0]** Says a real verse doesn't exist. Ask `18:10` → *"Tidak ada ayat yang cocok."* Only 55 verses are bundled. This is a lie by omission and the trust-killer for a scripture app.
- **[P0]** **You cannot read the Qur'an.** No browse surface. Can't open Al-Kahf on a Friday.
- **[P0]** Silent death if `corpus.json` fails — no try/catch, no error state. On patchy 4G this *will* happen.
- **[P1]** English leaking into an Indonesian product (verse captions + Ibn Kathir's English tafsir).
- **[P1]** Nothing is shareable, and the audience is Gen Z.

### Next, in order

1. **`$impeccable harden` the app** — fix the three P0s: load all 6,236 verses + both translations (~4MB; only tafsir stays server-side), distinguish "not in corpus" from "no match", add try/catch + error/retry state.
2. **Build the reading surface** (`$impeccable shape`) — surah index → continuous ayah view. The verse card already exists; this is structure, not styling.
3. **`$impeccable clarify`** — translate the `why` captions to Indonesian; source an Indonesian Ibn Kathir or drop it and lead with As-Sa'di + Al-Mukhtasar.

### Open items waiting on Erik

- **Scholar-board sign-off on the source list + authority tiers.** Blocks the extraction pipeline. Recorded in `src/ingest/sources.ts` rather than quietly decided.
- **Read the 16 divergent verses** in the review sheet (flagged red, most-divergent first) and rule on them. ~1 hour. Then I wire a per-verse override table.
- **Do not ship 94:5 with the Tafsiriyah rendering alone** — whatever else the review concludes.
- Verify the Tafsiriyah API text against a **published edition**. It's served from a personal EasyPanel box with no translator field; our attribution is inherited, not verified from the publisher.
- Indonesian **Ibn Kathir / Jalalayn** need a source. `in-tafsir-jalalayn` upstream is an empty stub (recorded in `sources.ts`).
- **Audio/recitation is entirely absent.** The Qur'an *is* recitation. Unresolved for the "Islamic" brief.

### Standing constraints

- **No remote.** Commits stay local; there is nothing to push.
- **Disk is tight.** Was at 99% / 130MB free this session; freed 5.5GB by deleting the finished QuranKu publish clone. `data/` (~120MB) is gitignored and regenerable via `bun run ingest`.
- **bun/bunx only, never npm/npx. TypeScript only.**
- Publishing/merging is a public action under GitHub identity `erikgunawans`.

---
