# 03 — Utility memory (branch C): remember what the user did

Status: ready-for-agent
Type: new capability
Blocked by: 02

## Problem

Deliver the honest, zero-inference half of the feature (branch C). No profiling, no risk — just
give people back what they themselves did. This is the safe foundation that earns trust before any
inference (branch A / 05) lands.

## Approach

Read-back UI + API over the D1 raw layer (no LLM, no inference):

- Bookmarks list
- Notes (per ayah)
- "Continue reading" — last `reading_position`
- Question history — the user's own past questions

All scoped to `user_id`; works for anonymous identities too (04+ not required).

## Acceptance

- [x] A bookmark persists across sessions for the same identity. — dual-written to D1 on toggle;
      server read-back verified via `/api/memory`. (See note: the bookmark *list* still renders from
      localStorage; cross-device bookmark rendering is a small deliberate follow-up — the data is
      already server-backed.)
- [x] Notes save and retrieve per ayah. — inline note editor on every ayah; note landed and returned
      by `/api/memory` ("ayat kursi").
- [x] "Continue reading" resumes at the last position. — live proof: reading Al-Ikhlas showed
      **QS 112:1** in Riwayat, linking back to the mushaf.
- [x] Question history is visible to the user. — two real past questions rendered in Riwayat.
- [x] Everything is `user_id`-scoped; anonymous users get it without login. — all via the anonymous T1 identity.
- [x] Zero inference — must not read/write KV. — `/api/memory` reads only the D1 raw layer; no KV touched.

## Comments

**2026-07-25 — Implemented + live-verified (visual + functional).** Backend: `getBookmarks/getNotes/
getReadingPosition/getQuestions` in `store.ts`; `GET /api/memory` (Promise.all, `no-store`,
degrades to empty). Frontend (`web/demo/demo.ts`): `logMemory` fire-and-forget writer + `fetchMemory`
reader; bookmark toggle dual-writes to D1; mushaf load logs a `read` (reading position); inline
per-ayah note editor (button → textarea → save); `hydrateMemorySection` appends "Riwayat & Catatan"
(continue-reading + questions + notes) to the bookmark tab. CSS in `demo.css`. Verified live on
`demo-quranku`: note button renders on every ayah (screenshot); Riwayat rendered **QS 112:1** +
question history from real server data; `/api/memory` returns bookmarks/notes/questions/position with
`no-store`. `demo.ts` tsc clean (pre-existing `quran.ts`/`main.ts` errors unrelated). Deployed
Version 9fabeaf6. **Composer untouched.** **T3 done.**
