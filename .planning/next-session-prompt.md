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
- Per-ayah reciter attribution (ISC-398). Exposure went from 22 files to 6,236 on an UNVERIFIED
  everyayah licence. This is the one open item the audio work created.
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
