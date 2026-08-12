# Next session — New-Quranku (`~/quran-new`)

Read `PROGRESS.md` first (top two checkpoints, both 2026-08-12 night). Anchor: `origin/main` at
`fb17a6c`. Clean tree except untracked `WARP.md` — leave it.

**Gates GREEN:** typecheck 0 · `bun test` 1183/0 · build 0. ISA 423/433.

---

## 0. START HERE — the app goes silent on any question whose answer is a hadith

**Erik hit this live and it is the failure his users will hit most.** Reproduced cold, 2/2:

```
curl -s -X POST https://new-quranku.axiara.ai/api/answer -H "Content-Type: application/json" \
  -d '{"question":"apakah benar bahwa sakit itu akan menghapus dosa kita?"}'
→ {"answer":null}
```

**It is NOT a stale bundle** (an earlier diagnosis said so and was wrong — Erik's screenshot showed a
full authored answer with verse cards one turn earlier, which only a synthesis bundle can render).
**It is NOT the continuity gap** — it refuses with no history at all.

**Cause:** the honest answer to that question is a hadith, not an ayah. The model writes
*"Nabi ﷺ bersabda…"*, and `hadithShape` (`web/src/answer-guard.ts:156`) rejects any prophetic
attribution with no resolvable marker. On this path **nothing can ever resolve one**:
`web/src/answer.ts:110` calls `safeAnswer(prose, isRealAyah)` with only two arguments, so
`isGroundedHadith` takes its default `() => false`. Every marker fails by construction, both retries
reject, and the reader gets the cold silence Erik has now refused twice.

**The fix, in order:**

1. **Wire hadith grounding through.** `groundedHadithFrom` and `markersInProse` already exist in
   `answer-guard.ts` and are unused on this path. Retrieve hadith for the turn, build the predicate
   from the union of what was retrieved (PRD decision 13 — accumulate across calls, never per call),
   and pass it as `safeAnswer`'s third argument. Until this lands, the hadith wall is not a wall, it
   is a blanket refusal.
2. **A guard rejection must never render as "nothing found".** Today `synthesizeAnswer` returns
   `null` for *both* "no grounding" and "the guard rejected it", and `main.ts` renders the identical
   silence. Distinguish them: when the model had something and the wall stopped it, say so and point
   — *"ini jawabannya ada di hadis, bukan di ayat"* with a door into Hadis. **A pointer beats
   silence** (already a recorded lesson on this repo — see the grounded-alias short-circuit).
3. **Check the rights gate before displaying anything.** Hadith TEXT display is still ungated by the
   ustadz (`SHOW_MACHINE_HADITH_TEXT=false`, and whether hadith text may EVER display is open). A
   pointer to Hadis is safe today; rendering hadith text inside an answer is not. Do not conflate.

**Also unresolved and related:** the same silence fires for any question the corpus cannot serve. The
principled fallback copy (*"Aku belum menemukan ayat yang cocok…"*) is written for a retrieval miss
and is actively misleading when the truth is "the wall stopped a good answer".

## 1. Deploy — DONE 2026-08-12, but re-read this before the next one

**Already deployed** at Erik's instruction: `new-quranku-proxy` version `ab5cddb6`, `EDITION:
"synthesis"`, serving `index-n0j2Eeyk.js`. The fatwa-wall fix, both prompt rules and the Fikih card
shape are all LIVE. Post-deploy measurement of the twelve questions: quoted-scripture 1 → **0**,
`yang artinya` 2 → **1** (one residual leak in `apakah musik haram`), and the forced-grounding nikah
case came back clean on all three shapes. ISC-419/420 verified live.

For the NEXT deploy: `cd worker && bunx wrangler deploy`, always after
`VITE_ANSWER_MODE=synthesis bun run build`.

The synthesis bundle is already built and verified by the inlined literal
``function ss(){try{return `synthesis` ``. **Always rebuild with
`VITE_ANSWER_MODE=synthesis bun run build` before deploying prod** — a plain build produces a
PRINCIPLED bundle and would silently un-author production.

**Then re-measure, because the prompt fix is an unverified claim about behaviour.** The same twelve
questions are in `docs/review/answer-audit-questions-2026-08-12.txt`. POST each to
`https://new-quranku.axiara.ai/api/answer` and count how many still carry (a) a hand-written
translation of an ayah in quotes, (b) `para ulama sepakat` / a named madzhab's position. Both were
fixed at the PROMPT, so until they are measured against live output they are not done. ISC-419 and
ISC-420 stay `[ ]` until then.

## 2. THE BUILD ERIK ASKED FOR — continuous chat

Full spec: **`.scratch/continuous-chat/PRD.md`**. Read it before touching anything.

One-line version: the app has a persistent *transcript* and a non-continuous *conversation*, and
Erik is asking for the second. `AnswerBody` (`worker/src/index.ts:405`) has no history field, so a
follow-up like `kenapa?` has nothing to attach to.

**Settled by Erik, do not re-open:** the app keeps its current shape (tabs stay, nothing folds into
chat); continuity is *local now, adopts on sign-in*; the warm ustadz voice is already right and is
not to be "improved".

**Four open questions for Erik are listed in the PRD — ask them before building, not after.**

## 3. THE THING THAT SHOULD GATE #2 — ISC-418

Production is warm and it is **not** referring to our corpus. Measured: grounding forced to QS 4:25
came back citing 2:221, 5:5, 60:10; with *no* grounding at all it answered in full anyway.

This matters for #2 specifically: **continuity built on top of it makes it worse.** Each ungrounded
answer stands alone today. Give the model its own prior answers as context and it will build on
them, and a model citing its own earlier ungrounded claim reads as consistency — which reads as
authority. Settle ISC-418 with Erik before or alongside the continuity build.

## Standing constraints (carried forward — all still true)

- **Verify the edition by the INLINED LITERAL, never a grep.** `grep -c synthesis` returns 1 in both
  editions' bundles. The distinguisher is Vite's constant fold.
- **Deploys run from `worker/`**, never the repo root.
- `bun run build` exits 1 on unparseable CSS but **0 when the parser silently DISCARDS rules** — exit
  code is necessary, not sufficient. Measure the element live after any CSS edit.
- **Before believing any geometry measurement, check the loaded stylesheet hash against disk.** The
  preview server caches `index.html` and will hand you a confident wrong number. Restart it, don't
  just reload. (Cost a full measurement pass last session.)
- **A grep needs a CONTROL.** Against a SPA origin compare body hashes or Content-Type, never status
  codes.
- Verify composer controls by COUNTING TURNS appended to `#thread`, not `box.value`.
- Before borrowing a class, `rg` it in `main.ts`'s delegated click handler — `.seed` calls
  `ask(button.textContent)`.
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Use `pgrep -fl`, never `ps aux | grep`.
- **Interceptor:** screenshots are unavailable while Chrome's window is minimized
  (`macos windows` returns `[]`). State it once, never loop. DOM/geometry probes via
  `eval --main` work fine and are the evidence to use.
- Do NOT restart the hadith generator (stopped at 1,746/14,736 on purpose).
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases.

## Open items waiting on Erik

- **Deploy** (above). Nothing from 2026-08-12 night is live.
- **ISC-418** — is a model answering fiqh from its own parametric knowledge the product, or a defect?
- **ISC-419 / ISC-420** — fixed at the prompt; a hard egress wall was deliberately NOT built because
  it would reject `apakah musik haram` and `bolehkah perempuan jadi pemimpin`, the app's two best
  answers, and fall back to the caption list Erik refused.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED and must not be sent as written.** It
  says *"Aplikasi tidak mengarang jawaban"* — false since the edition flipped — and is addressed to
  Ustadz Ahmad. A ⛔ header now records that plus the falsified premise. It needs rewriting around
  the question that actually matters now (may the app compose fiqh at all), not the pin list.
- **Ustadz sign-off on AI-authored answers (ISC-417)** — prod authors without it, by Erik's decision.
  A heads-up is not a cleared gate.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- An equal-weight three-scholar disclosure was recommended and NOT built.
- quran.tarjamahtafsiriyah.com's Supabase project is DELETED — sign-in and the daily-readers counter
  are broken in production. **This bears on the "adopts on sign-in" half of the continuity build.**
- Written confirmation of Ustadz Ahmad's VERBAL doa approval (do not upgrade
  `docs/review/doa-provenance.md` to written).
- CC BY-ND 3.0 label on `tanzil-id-kemenag` is stronger than the evidence.
- LPMQ surat permohonan; equran.id permission. Whether hadith text may EVER display.
- everyayah licence is an ACCEPTED, DOCUMENTED risk — do not reopen as undecided.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md`
  FIRST; `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap
  `tool/translate-aqeeda-id.ts` (self-invoking).
