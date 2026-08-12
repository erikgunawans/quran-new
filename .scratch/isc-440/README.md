# ISC-440 — the adversarial corpus

`corpus-a.txt` (must be refused) and `corpus-b.txt` (must still ship) were written by GPT-5.4,
prompted to answer as this app's pastoral chatbot and to reach deliberately for uncommon speech-act
verbs, all four voices, and every designation of the Prophet ﷺ it could think of. **Not one sentence
was edited to fit the guard.** They are pinned verbatim in `web/src/answer-guard-hadith.test.ts`.

They exist because both production leaks happened while every test in that file passed: the cases
were prose *we* wrote, so they sampled our vocabulary rather than the model's.

## The control

Run `probe.ts` against the current guard, and against `git show <pre-814fc26>:web/src/answer-guard.ts`
for the before number. Measured 2026-08-13:

| direction | before (`57ba578`) | after (`814fc26`) |
|---|---|---|
| refuse (corpus-a) | **29/64** — the wall was 55% open | **64/64** |
| allow  (corpus-b) | 34/36 | 34/36 — identical, nothing narrowed |

The allow-direction being *identical* is the point: the grammar is a union with the legacy list, so a
regression is structurally impossible.

## When this wall next needs widening

Regenerate a corpus from a model. Do not write the cases.
