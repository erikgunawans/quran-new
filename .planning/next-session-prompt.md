# Next-session prompt — New-Quranku

> Paste the block below into a fresh session started in `~/quran-new`.
> Written 2026-08-10 ~13:10 GMT+7. Anything dated after this supersedes it.

---

Resume New-Quranku. Repo `~/quran-new`, anchor `origin/main` `c46c91c`, clean tree, 0 ahead/0 behind.
`origin` is github.com/erikgunawans/quran-new — the LIVE repo. `nur` is retired; never push there.

## Where things stand

- **Prod is CURRENT.** Worker version `981f6439`, serving `index-D6d_Y6uR.js` / `index-CsxJlLtp.css`.
  Nothing is undeployed. This is new — for most of 2026-08-10 prod lagged main by five commits.
- 1030 tests pass, `bun run build` exit 0, ISA 313/315.
- **Bab titles are COMPLETE**: 4,864 of 4,864 translatable, live and verified. The 3 unfilled keys
  (`muslim/53/0`, `bukhari/96/0`, `bukhari/97/49`) have 0-char Arabic source — nothing to translate.
  Do not chase them.
- **Hadith text generation is RUNNING** as PID 33579 (started 10:54, survives session boundaries).
  ~915/14,736 at 7.3s/record → roughly 28 hours left. Resumable; it skips what exists.
  **`pgrep -fl "translate-hadith\.ts"` BEFORE touching it** — see the trap below.

## First actions

1. `pgrep -fl "translate-hadith\.ts"` — confirm PID 33579 (or a successor) is alive. If genuinely
   dead, resume with `bun run src/app/translate-hadith.ts`. **Never start a second instance.**
2. Ask Erik whether the AI hadith *text* layer may ship at all (see Open decisions). Everything
   downstream of that answer is blocked on it.
3. ISC-98 (real-iOS visualViewport composer) and ISC-189 ([DEFERRED-VERIFY] 60fps mid-range Android
   for `#/peta`) both need a physical device. Blocked; do not attempt to close them in a browser.

## Hard constraints — these were each learned the expensive way

- **NEVER run wrangler from the repo root.** It self-scaffolds a `wrangler.jsonc` that shadows
  `worker/wrangler.toml` and breaks every deploy. Deploy is `cd worker && bunx wrangler deploy`.
- **Prod deploys are Erik's call, every time.** Ask; do not infer from a previous approval.
- **The two translation generators have OPPOSITE partial-batch rules ON PURPOSE.**
  `translate-babs.ts` DISCARDS partial batches (position carries identity — a short reply silently
  misaligns every later title). `translate-hadith.ts` KEEPS them (a `###N###` delimiter carries
  identity). Do not "fix" one to match the other. The `~ batch returned 0 of 3 … keeping what
  arrived` lines in the hadith log are that rule working correctly, not a fault.
  When batches are being discarded, the safe lever is a smaller `--batch`, never the rule.
- **Generated output is a gitignored SIDECAR** under `web/public/hadith-id/`. Never edit the corpus
  shards under `web/public/hadith/`. The layer must stay `rm`-able until the ustadz signs off.
- **`web/dist` is SHARED** by the principled and synthesis builds. After any
  `VITE_ANSWER_MODE=synthesis` build, immediately rebuild plain and verify by content hash.
  Note: grepping the bundle for `api/answer` does NOT distinguish them — that string is in both.
  The real check is that a plain rebuild reproduces the hash, and that the lone `synthesis`
  occurrence is the dead comparison Vite collapses to `principled`.
- **`bun test` NEVER compiles CSS.** Check `bun run build`'s EXIT CODE, never a grep.
- **`pgrep -fl`, never `ps aux | grep … && echo`.** The grep form reported a live generator as dead
  twice on 2026-08-10 and caused a duplicate process to be launched against the same shard files.
- **Verify served bytes before believing any probe.** Fetch the asset and diff its SHA against disk.
  A first fetch right after deploy can return `index.html` via the SPA fallback (right size ≈15.5 kB)
  before the asset propagates — warm the origin and refetch rather than concluding a bad build.
- **Verification is OFF Erik's Chrome** by his request (confirmed 2026-08-10): dev server on
  localhost:5173 for him in Cursor's Simple Browser, isolated Chrome DevTools MCP for measurement.
  This overrides CLAUDE.md's Interceptor rule. Re-confirm it still holds.
- **`DESIGN.md`'s token block is GENERATED** (`bun run app:design`); amend the prose above it.
- **Never push tafseer-okf to a public repo** — 0 of 18,882 records are distributable.
- **Criteria must name repositories, never mutable aliases** like a remote name.

## Open decisions — Erik's, not the agent's

1. **May the 14,736 AI hadith translations be displayed at all, even badged?** Bab titles are
   chapter headings; hadith text is the Prophet's words as transmitted. Currently labelled
   unreviewed, awaiting Ustadz Ahmad Isrofiel Mardlatillah. Evidence for the call: the layer is
   broadly faithful, but bab 2 of Bukhari's Kitab al-Iman (`دُعَاؤُكُمْ إِيمَانُكُمْ`, a flat
   equative — "your supplication IS your faith") came back as "Doa kalian adalah **bagian dari**
   keimanan kalian", inserting a hedge the Arabic does not contain. Small, plausible Indonesian,
   invisible to any parity test — and the same tendency applied to hadith text is a different order
   of risk than applied to chapter headings.
2. **Set the synthesis key**: `cd ~/quran-new/worker && bunx wrangler secret put OPENROUTER_API_KEY
   --env synthesis`. Interactive hidden prompt ONLY — the harness `!` uploads an empty value.
   Until then `new-quranku-ai.axiara.ai` `/api/answer` returns null.
3. **Tap Dengar on `#/surah/1` and pick "Lanjut otomatis".** Auto-advance wiring is verified, but
   real playback needs a genuine user gesture no scripted click can provide.
4. **Try the mic** (composer, `#mic`) with a real microphone. The lifecycle is proven end-to-end in
   a real browser against production bytes, but actual speech-to-text through a real device has
   never been exercised.
5. Two long-standing sends, unchanged: the sunnah.com API/dump request, and the LPMQ surat
   permohonan to Kepala LPMQ.

## Recent work worth not re-deriving

- `c46c91c` **mic fix** — Chrome's recogniser ends itself after a silence even with
  `continuous = true`; `onerror`/`onend` were wired straight to teardown, so the mic switched itself
  off and the button could not hold it. Now `wantLive` (the user's intent) is split from the
  recogniser's state, an unrequested `onend` respawns, and restart is refused on `not-allowed` /
  `service-not-allowed` / `audio-capture`. 7 tests in `web/src/dictate.test.ts`; the two that matter
  fail against the old implementation.
- `08673f3` **section titles** — they were never a colour problem. `background-clip: text` paints
  the ramp across the BOX, so a short word in a wide block samples only the leftmost slice.
  `width: fit-content` fixed it. Verified: "Hadis" went from 17% to 100% of the ramp.
- The hadith/fikih Indonesian layer: 154 kitab titles were **authored, not generated** (settled
  nomenclature); bab titles and hadith text are machine output under an explicit unreviewed label.
