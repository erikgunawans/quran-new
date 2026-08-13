# Continuous chat — the conversation is the main stage

> Erik, 2026-08-12 (night). Scoped down in his own words during the same conversation:
> *"when I said that the chat is the main stage, we have to treat the chat continuously and then
> just act like right now, but it's more on the continuous part."*
>
> **So: the app keeps its current shape.** Al-Qur'an, Tematik, Hadis, Fikih and Doa all stay exactly
> as they are. Nothing folds into the chat. The whole of this work is the word *continuous*.

## What Erik asked for, in three sentences

1. The conversation is the main attraction of the app.
2. It is **continuous until you delete it.**
3. It answers with **warmth — the touch of an ustadz's kindness and wisdom** — while still referring
   to **the knowledge we have here**.

## The state of each, measured 2026-08-12, not assumed

| Half | State | Evidence |
|---|---|---|
| Warmth / ustadz voice | **DONE** | Twelve live answers pulled from prod. They open *"Nak, aku dengar pertanyaanmu…"* and close by sending the person to their parents and a trusted ustadz. This is not the work. |
| Refers to OUR knowledge | **BROKEN** | `POST /api/answer` with grounding **forced to QS 4:25** answered with 2:221, 5:5, 60:10 and never mentioned it. With **no grounding at all**, it answered in full anyway. It is warm, and it is referring to its *own* knowledge. Tracked as ISC-418. |
| Transcript persists | **DONE** | `thread.ts` → `localStorage`, `MAX_TURNS = 20`, restored on load with `animate` off (*"a restored thread should be there, already, the way you left it"*). Clear control at `main.ts:960`. |
| Conversation is continuous | **MISSING — this is the job** | `AnswerBody` (`worker/src/index.ts:405`) is `{question, verses, entries, provider}`. **No history field exists.** Every turn is a stranger to the last. |
| Adopts on sign-in | **MISSING** | `localStorage` is per-browser by construction. Bookmarks/notes/questions already live in D1 (`/api/events`, `/api/memory`); the thread does not. |

**The one-line framing:** the app has a persistent *transcript* and a non-continuous *conversation*.
Erik is asking for the second.

## Scope

### In

1. **Conversational memory.** `/api/answer` accepts prior turns and the model sees them, so a bare
   follow-up (`kenapa?`, `terus gimana?`, `yang tadi itu ayat berapa?`) resolves against what was
   just said.
2. **Thread in D1**, keyed to the T1 identity that already exists, so it survives a cleared browser
   and crosses devices.
3. **Adopt on sign-in** — Erik chose *"Both — local now, adopts on sign-in."* The anonymous thread is
   claimed by the account on first sign-in rather than discarded or duplicated.
4. **Delete means delete** — the existing clear control must wipe the D1 rows too, not just
   `localStorage`. `/api/forget` already exists; check what it covers.

### Out

- Restructuring navigation. The tabs stay. Erik was explicit.
- Folding reading surfaces into the chat.
- Any change to the ustadz voice. It is already right; do not "improve" it.

## Decisions already made (do not re-litigate)

- **Continuity scope:** local now, adopts on sign-in. Erik's answer, this conversation.
- **App shape:** unchanged. Erik's answer, this conversation.
- **Voice:** warm ustadz. Already shipped and working.

## Decisions taken 2026-08-13 (Erik, in-session)

- **Memory window: the last 6 turns, sent verbatim.** Not 20 (the localStorage cap is a STORAGE
  bound, not a context one — sending it every request is slow and expensive against a path that
  already takes ~8s warm) and not a rolling summary (a model-authored summary re-entering the prompt
  is a new unguarded surface, and this file's whole risk section is about unguarded surfaces).
- **ISC-418 is fixed BEFORE history is wired.** Erik chose the sequencing the trap section
  recommended. Continuity is therefore BLOCKED on grounding, and that is deliberate: an app that
  builds follow-ups on answers drawn from the model's own knowledge produces confident chains, and a
  model citing its own earlier claim reads to a reader as authority.

**What this means for whoever picks this up: do not start with the history field.** Start with
ISC-418 — make `/api/answer` demonstrably use the grounding it is handed, measured, before any turn
can see the turn before it.

## Open questions for Erik — ask before building, not after

1. ~~**How far back does the model remember?**~~ **ANSWERED: last 6 turns.** Original framing kept
   for the reasoning: Twenty turns is the localStorage cap; feeding twenty
   turns to the model every request is slow and expensive. A window of the last N turns, or a
   running summary? This is a cost and latency decision, not just a design one.
2. **Does a continuous thread change what the guard must do?** Today `guardAnswerProse` sees one
   answer in isolation. With history, a ruling can be built across turns — hedged in turn 3, asserted
   bare in turn 5 — and every existing rule is sentence-scoped and blind to that.
3. **Does memory of the person leak into the answer?** If the model sees that someone asked about
   `nikah beda agama` an hour ago, should that colour an unrelated question? Erik's memory design so
   far has been deliberately zero-inference.
4. **What does "delete" delete?** Only the transcript, or also the D1 `question` events already
   logged by `handleAnswer` via `recordEvent`?

## The trap sitting under all of this

**Building continuity on top of ISC-418 makes the grounding problem worse, not neutral.** Right now
each wrong-but-fluent answer stands alone. Give the model its own prior answers as context and it
will build on them — including on the ones that came from its own parametric knowledge rather than
from our corpus. A model that cites its own earlier ungrounded claim reads to the user as
consistency, and consistency reads as authority.

**Recommendation: settle ISC-418 with Erik before, or alongside, this build — not after.**

## Where the code is

| Thing | Path |
|---|---|
| Thread persistence, `MAX_TURNS`, clear | `web/src/thread.ts` |
| Turn rendering, restore-on-load, clear control | `web/src/main.ts:1331`, `:960` |
| Answer request shape | `worker/src/index.ts:405` (`AnswerBody`), `:473` (`handleAnswer`) |
| Prompt + user-message builder | `web/src/answer-contract.ts` |
| Egress wall | `web/src/answer-guard.ts` |
| Existing D1 memory (the pattern to follow) | `worker/src/store.ts`, `/api/events`, `/api/memory`, `/api/forget` |
