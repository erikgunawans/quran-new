Resume New-Quranku in ~/quran-new — read PROGRESS.md first (top checkpoint 2026-08-12 afternoon,
anchor origin/main). Clean tree except untracked WARP.md (leave it).

STATE: gates GREEN — typecheck 0, bun test 1113/0, build 0. ISA 397/399.
Prod = new-quranku-proxy, version `aeb13a9d`, serving index-C8A5wC4f.js. DEPLOYED and VERIFIED.

RECITATION IS LIVE AND DONE. Do not re-litigate it. Audio ingest COMPLETE at 6,236/6,236 (818.3 MB)
in R2 bucket new-quranku-audio; the Worker serves /audio/* R2-first; hasAudio() is derived from
SURAH_INDEX (no literal). Seven live probes round-tripped sha256 against the journal; #/surah/2
renders 286 play buttons; 2:255 loads in real Chrome at 52.0s.
BEFORE touching worker/src/index.ts serveAudio, read memory [[spa-fallback-defeats-status-tests]] —
four bugs there all read as correct code, and one was caused by fixing another.

Do next, in order:

1. Third tafsir tier. Ayah + VERBATIM attributed tafsir from web/public/tafsir/{surah}/{ayah}.json
   (as-saadi | ibn-kathir | mukhtasar, 6,237 files, already deployed) when tiers 1-2 come back thin.
   Measured limit: tier 3 ORIENTS an ayah, it cannot rescue `pacaran`. NOT STARTED this session.

2. Aqeedah Ar→Id in ~/printing-press/library/tafseer-okf — read .planning-aqeeda-id-resume.md FIRST;
   `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap tool/translate-aqeeda-id.ts
   (self-invoking). NOT STARTED this session.

3. QTT CLI (optional): discovery COMPLETE at
   ~/printing-press/.runstate/quran-new-manual/runs/20260812-112720-qttcli01/research/.
   Unresolved blocker unchanged — where the tarjamahtafsiriyah verse text is served from (not
   /data/, not the four route chunks, not Supabase). Its audio is NOT a source: it hotlinks
   the-quran-project.github.io/Quran-Audio, which declares no licence.

4. ISC-323 / 323.2 / 372 are ONE hole: no offline retrieval number may be quoted as evidence about
   live behaviour. `wrangler dev --remote` fails at the Cloudflare ACCOUNT layer, not at config.
   Still blocked; do not spend a third session looping on it.

CONSTRAINTS TO HONOR:
- Prod deploys are Erik's call, run from worker/ (`cd worker && bunx wrangler deploy`), never from
  the repo root; rebuild and diff the hash, because a source revert does NOT revert web/dist.
- bun test never compiles CSS — check the build's EXIT CODE, never grep its output.
- Against a SPA origin compare BODY HASHES or Content-Type, NEVER status codes. A missing asset
  returns index.html at 200. This bit us again this session.
- Exit 0 from `wrangler r2 object put` is not evidence — round-trip the object and compare sha256.
- A failing probe with NO CONTROL is not evidence of a failure. An in-browser media probe stalls in
  a BACKGROUND tab; the untouched static sample stalled identically and proved it.
- Use `pgrep -fl`, never `ps aux | grep`.
- Do NOT restart the hadith generator (stopped at 1,746/14,736 on purpose).
- Do NOT rebuild the tanya-hukum PRD — falsified in BOTH halves. Bare warisan/nikah have
  looksFactual === false and never reach the knowledge lane, so matchPin never runs on them.
  isFeelingWord("nikah") is true by design; do NOT fix the feeling-word filter wholesale — 134
  corpus subjects collide with feelings and MOST MUST STAY collided. Do NOT cut the remaining
  unheld keluarga aliases (poligami, jodoh, mertua, ipar) — each trades a useful pointer for silence.
- Editing web/src/topic-subjects.ts REQUIRES re-running `bun run app:topic-subjects`; changing
  TOPIC_ALIASES in knowledge.ts does NOT.

OPEN ITEMS WAITING ON ERIK:
- (CLOSED 2026-08-12) Reciter attribution shipped; everyayah licence is an ACCEPTED, DOCUMENTED
  risk per Erik. Do NOT reopen as if undecided. If it is ever revisited, note that attribution does
  not confer permission — verifying the licence is separate work that was deliberately not done.
- docs/review/hukum-pin-request-2026-08-12.md is written and BELUM DIKIRIM — Erik sends it himself
  (6 numbered questions on the nikah + waris pin ref-lists). Record any conditional approval AS
  conditional, never as a plain approval. Meanwhile `apa hukum nikah siri` still answers with
  QS 4:25 "Nikahi budak perempuan dengan izin tuannya" — live, and worse than silence.
- quran.tarjamahtafsiriyah.com's Supabase project is DELETED (no DNS) — daily-readers counter and
  Google sign-in are broken in production; decide whether to restore.
- Written confirmation of Ustadz Ahmad's VERBAL doa approval (docs/review/doa-provenance.md — do
  not upgrade it to written).
- The CC BY-ND 3.0 label on tanzil-id-kemenag in src/ingest/sources.ts is stronger than the evidence.
- LPMQ surat permohonan; equran.id permission (admin@equran.id). Whether hadith text may EVER display.
- Set OPENROUTER_API_KEY via the interactive hidden prompt (never via a harness `!` upload).

## LANDING REFRESH — specced and probed, NOT built (Erik, 2026-08-12)

Erik asked for four changes to the landing surface. The question-pool probe is DONE and committed;
the UI is NOT started. Nothing on the landing page was touched — prod is unchanged and coherent.

1. **Expandable footer.** Collapsed = the thin bar already at the bottom of the landing (see the
   teal strip in Erik's screenshot). Click → slides up revealing footer content; click again →
   collapses. Content mirrors the QuranKu footer: logo + one-paragraph description, **Navigasi**
   (Beranda, Mushaf Madinah, Audio Quran, Penanda, Indeks Tematik), **Informasi** (Tentang Aplikasi,
   Donasi), **Hubungi Kami** (Kirim Email, Aplikasi Android), then a centered copyright line.
   Adapt the nav items to the routes THIS app actually has — do not copy dead links.

2. **Delete the four feeling-seeds** at `web/index.html:249-254` (`aku lagi capek banget`, `lagi
   banyak utang, stress`, `baru kehilangan orang tua`, `cemas terus tiap malam`).
   **`web/src/landing.test.ts:28,46-52` asserts the composer docks ABOVE `.seeds`** — that test must
   be updated, not deleted; the ordering rule still applies to whatever replaces them.
   **DESIGN.md must be AMENDED, never contradicted** (see memory landing-layout-traps). The seeds
   were deleted once before in the hero distillation and deliberately restored on 2026-08-09 —
   `index.html:246` records why: "the hard part of this app is not typing, it is admitting what is
   wrong." Replacing confession-openers with curiosity-openers is a real shift in what the front
   door invites. Write the amendment; do not let it happen silently.

3. **Two cards replace them.** (a) a random-question generator, (b) a "Populer" card opening a modal.
   Reuse the `<dialog>` + `showModal()` pattern already in `web/src/settings-ui.ts:58` — the backdrop
   and inertness are the reason to use `<dialog>` at all. Do not hand-roll a modal.

4. **Populer modal content** (Erik chose surahs + themes + doa): popular surahs (Yasin, Al-Kahf,
   Ar-Rahman, Al-Mulk, Al-Waqi'ah, Al-Fatihah) → the reading surface; popular Tematik themes → the
   thematic index; Kumpulan Doa → `#/doa` (34 ustadz-approved pairings, live and under-discovered).
   There is NO popularity telemetry in the principled edition — this list is editorial, and the code
   should say so rather than implying it is measured.

### The probe — READ THIS BEFORE PICKING QUESTIONS

`bun run src/app/probe-ask-seeds.ts` (output committed at `docs/review/ask-seed-probe-2026-08-12.txt`).
Candidates in `src/app/ask-seed-candidates.ts`. Latest: **KNOWLEDGE 12 · FEELING 11 · SILENT 7** of 30.

**The probe was WRONG TWICE before it was right, and both mistakes are the ones this repo keeps making:**
- v1 called only `retrieve()`. But `main.ts:534` routes `looksFactual(q)` to `retrieveKnowledge`
  FIRST — so factual questions were being measured against a lane the app never reaches for them.
- v2 called the knowledge lane but reported **KNOWLEDGE 0 across all 30**. That was a FALSE NEGATIVE:
  `retrieveKnowledge` → `peta-data.ts:80` → `fetch("/peta/index.json")`, and a bun script has no
  server, so every call rejected and returned null. Silence from a lane you could not reach is not
  evidence the lane is empty. Fixed by resolving root-relative URLs against `web/public`.
  Corrected numbers: SILENT went 17 → **7**.

**Rules for the shipped pool** (`web/src/ask-seeds.ts`, does not exist yet):
- SILENT questions must NOT ship. A generator that can roll a silent question is worse than none.
- Family-law rulings are deliberately absent from the candidates and must stay absent — `apa hukum
  nikah siri` still answers with QS 4:25 "Nikahi budak perempuan dengan izin tuannya", live.
- **`gimana bersikap ke teman yang beda agama` → `perintah-dan-larangan` (8 entri) needs an EYE
  before it ships.** "beda agama" is the exact phrasing that fails elsewhere in this app; a routing
  hit is not proof the entries answer the question.
- FEELING verdicts print `?` for refs — the Hit field name was never confirmed. Fix that before
  quoting any specific verse as evidence.
