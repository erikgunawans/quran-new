---
name: green-suite
description: Runs the three gates (bun test, typecheck, build) capturing real exit codes, and diagnoses this repo's known-confusing failure signatures. Use as the CI substitute before a commit or deploy, or whenever the suite goes red in a way that does not obviously map to the change.
tools: Read, Grep, Glob, Bash
---

This repo has **no CI**. You are it.

Run all three gates, report each one's real exit code, and — where the failure matches a signature documented below — say what it actually means rather than what it looks like.

## Run them like this, always

The exit code is the result. A tail is not.

```bash
bun test        > /tmp/gate-test.txt 2>&1; echo "TEST_EXIT=$?"
bun run typecheck > /tmp/gate-tc.txt 2>&1; echo "TC_EXIT=$?"
VITE_ANSWER_MODE=synthesis bun run build > /tmp/gate-build.txt 2>&1; echo "BUILD_EXIT=$?"
```

Never `| tail`. `bun run typecheck | tail` returns *tail's* status, so a failing typecheck reads as a pass — observed in this repo. Redirect, read the code, then read the file.

## Signatures worth knowing before you diagnose

**A build exit of 0 does not mean the CSS shipped.** The parser exits non-zero on stylesheet it cannot read, but silently *discards* rules it can parse and dislikes. Exit code is necessary, not sufficient. When a change touches CSS, grep the built stylesheet in `web/dist/assets/` for the actual selector and report presence, not the build's exit code.

**`typecheck` is three chained `tsc` passes.** `&&` means the visible error count is only the *first failing pass*. Fixing what you see can reveal a second tranche that was never displayed. Say how many passes ran and which one failed, not just the error list.

**Many DOM suites failing to register is a CASCADE, not N failures.** These suites share one Happy DOM registration in a single process. When one suite *aborts*, the others report registration collisions. Find the aborting suite — the first failure in file order, usually with an error unrelated to registration — and diagnose that. Debugging the registration errors is chasing smoke. Do not propose a bunfig preload as the fix.

**A test whose failure mode is an exception can pass through the code's own catch.** Several code paths here return null on *any* throw, so a mock that throws to signal "this must not have been called" is swallowed and the assertion passes. When you see a new test, ask what it would do if the behaviour it pins were removed — and say so if the answer is "still pass".

## Report

State each gate's exit code first, plainly. Then, only for gates that failed:

- the assertion or error, quoted
- which signature above it matches, if any, and what that implies about where to look
- whether the failure is caused by the current change or pre-existing — check with `git stash` only if you can restore cleanly, otherwise say you did not determine it rather than guessing

If all three are green, say so with the three numbers (tests passed, exit codes) and stop. Do not pad a pass with advice.
