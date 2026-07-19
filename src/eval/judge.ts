/**
 * LLM-as-judge for the framing ("bridge") voice.
 *
 * The bridge is one or two Indonesian sentences that sit ABOVE the verses: name the feeling, sit with
 * the person, hand them to the scripture — never fix, advise, preach, or say what a verse means. The
 * judge scores exactly that target, on a 1–5 rubric, and returns strict JSON so the runner can
 * aggregate. It is a SIGNAL, not the arbiter — the native speaker's eye still decides — but it makes
 * "is this more human?" a number you can watch move as you tune the prompt.
 */

export type ModelCall = (
  system: string,
  user: string,
  opts: { temperature: number; maxTokens: number },
) => Promise<string>;

export interface Judgment {
  /** warm, gentle, present — vs cold/clinical. */
  readonly warmth: number;
  /** sits WITH the person; does not rush to fix, advise, cheer, or preach. */
  readonly presence: number;
  /** reads like a real person wrote it, not a template or a bot. */
  readonly humanness: number;
  /** meets THIS person's actual words/feeling, not a generic bucket line. */
  readonly fit: number;
  /** any problems spotted, e.g. "preachy", "authored-meaning", "generic", "too-long", "advice". */
  readonly flags: readonly string[];
  readonly rationale: string;
}

const JUDGE_SYSTEM = `You evaluate a single Indonesian "bridge" sentence written by a Qur'an companion app.

CONTEXT. A person typed how they feel (often heavy, often 2am). The app shows real Qur'an verses BELOW the bridge; the bridge's only job is rung-1 companionship: name the feeling, sit with them, hand them to the verses. It must NOT interpret scripture, quote a verse, cite a reference, give a ruling, advise, diagnose, or cheer them up. Warmth and presence are the goal; "point, never author" is the boundary.

Score the bridge on four axes, each 1–5 (5 best):
- warmth: gentle, warm, human — vs cold, clinical, or flat.
- presence: sits WITH the feeling — vs rushing to fix/advise/cheer/preach.
- humanness: sounds like a real person at 2am — vs a template, a slogan, or a bot. Casual Indonesian (nggak, kamu, ya, kok) is GOOD here, not a flaw.
- fit: meets THIS person's specific words — vs a generic line that fits any bucket.

Also list flags (zero or more) from: "preachy", "authored-meaning" (says what a verse means or gives a ruling), "quoted-scripture", "advice", "cheer-dismissive", "generic", "too-long" (more than two sentences), "formal-bureaucratic", "not-indonesian".

Return ONLY minified JSON, no prose, no code fence:
{"warmth":N,"presence":N,"humanness":N,"fit":N,"flags":["..."],"rationale":"one short sentence"}`;

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(1, Math.min(5, Math.round(v)));
}

/** Tolerant JSON extraction: models sometimes wrap the object in prose or a ```json fence. */
function parseJudgment(raw: string): Judgment {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return { warmth: 0, presence: 0, humanness: 0, fit: 0, flags: ["judge-unparseable"], rationale: raw.slice(0, 160) };
  }
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      warmth: clamp(o["warmth"]),
      presence: clamp(o["presence"]),
      humanness: clamp(o["humanness"]),
      fit: clamp(o["fit"]),
      flags: Array.isArray(o["flags"]) ? o["flags"].filter((f): f is string => typeof f === "string") : [],
      rationale: typeof o["rationale"] === "string" ? o["rationale"] : "",
    };
  } catch {
    return { warmth: 0, presence: 0, humanness: 0, fit: 0, flags: ["judge-unparseable"], rationale: raw.slice(0, 160) };
  }
}

export async function judgeBridge(call: ModelCall, phrase: string, theme: string, bridge: string): Promise<Judgment> {
  const user =
    `Person wrote (Indonesian):\n"""${phrase}"""\n\n` +
    `Feeling detected: ${theme}\n\n` +
    `The app's bridge sentence:\n"""${bridge}"""\n\n` +
    `Score it now. JSON only.`;
  const raw = await call(JUDGE_SYSTEM, user, { temperature: 0.2, maxTokens: 300 });
  return parseJudgment(raw);
}
