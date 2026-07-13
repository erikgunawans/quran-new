# PROGRESS

Append-only checkpoint log. Newest at the top. Never rewrite history — add a new checkpoint.

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
