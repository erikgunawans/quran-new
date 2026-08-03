# v3 — the Agentic Edition (design direction)

> From a `/grilling` interview with Erik (2026-08-02). Every decision below is his, with the trade-off stated. Build v3 with the tokens in `../styles.css`.

## The reframe
Erik asked for a version "powered by an agent that serves users in doing everything inside the app," with a friendlier design that "starts with the chat box." The interview turned up: **the app is already chat-first.** `#/` is the Tanya (chat) route, with a persistent composer; Baca/Tema/Peta are secondary nav. There is no homepage to get past. **So the design half is not a layout problem — it is a cold-start problem.**

## The two real problems (what actually reads as unfriendly)
1. **The blank page.** An empty composer with no visible examples → the user freezes. → Seed the composer with real, tappable example questions in real language (e.g. *"aku lagi capek banget"*, *"apa hukum riba?"*). Empty states teach.
2. **The invitation.** *"Ceritakan apa yang kamu rasakan…"* asks for emotional disclosure before the user has typed a word — a therapy prompt, not a friendly one. → Rewrite the invitation to be warm and low-pressure without demanding feelings.

## What STAYS — do not touch (Erik ruled these are not the problem)
- The **celestial ground**, the **green→gold** signature, and the **attributed scholarly cards** stay exactly as they are.
- The answer cards keep their density: the Arabic, the meaning-based rendering, the literal rendering, and the named tafsir all stay.

## Explicitly rejected (do NOT build)
- **A reskin** — no new palette, no lighter register, no rounded-messaging-app restyle. The visual language is not the problem.
- **Simplifying the answer cards** — density was considered and rejected as the cause.
- **A named agent persona with an avatar** — deliberate rejection.

## The agentic half (a real build, not a design flourish)
A **tool-calling agent** over the engines that already exist (retrieval, curated knowledge, the ustadz-reviewed answer lanes) — an agent that can act inside the app on the user's behalf, not just answer. Design should make the agent's actions legible (what it did, what it's about to do, what it's grounded in) within the existing card language — not a chat-bubble reskin.

## So, for the design agent
Keep the register **light**, the **scripture dominant**, and honor the **gold law** and the **action-only-bright** rule (see `../README.md`). The wins are at the *cold start* (the composer's first impression) and in *making agent actions legible* — not in changing the look.
