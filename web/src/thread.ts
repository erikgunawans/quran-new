/**
 * The conversation, remembered.
 *
 * Casey gets a WhatsApp message mid-read, switches away, comes back — and everything was gone.
 * Verified: 2 messages before reload, 0 after. On the exact mid-range Android this product targets,
 * where switching apps is not an edge case but the normal way a phone is used.
 *
 * THE DESIGN: PERSIST THE DECISION, RE-DERIVE THE PRESENTATION.
 *
 * The obvious fix is to stash the rendered HTML. It is wrong three ways: it freezes stale markup
 * (a previous build's English captions would resurrect from disk), it writes scripture into
 * localStorage for no reason, and it cannot be re-rendered when the code changes. So we store only
 * what Nur *concluded* — a ref, a set of hits, a bounds error — and rebuild the DOM through the
 * same renderer the live path uses. Restored markup is therefore always current markup.
 *
 * THE PART THAT IS NOT ABOUT CONVENIENCE:
 *
 * A crisis exchange is NEVER written to disk. Not truncated, not encrypted, not "probably fine" —
 * never written.
 *
 * Rifqi types "aku gak sanggup bayar utang, pengen mati aja" at 2am. He gets the helpline. He
 * closes the app. In the morning his sister borrows the phone — shared phones are the norm on this
 * device profile, not an edge case — opens Nur, and his own words are sitting there on the screen,
 * restored, in his own handwriting.
 *
 * He disclosed that to Nur. He did not disclose it to whoever picks up the phone next. A memory
 * feature that outs him is not a feature. This is why persistence is opt-out by content, and why
 * the whole thread expires, and why there is a button to burn it.
 */
import type { Hit } from "./retrieve.ts";
import type { HadithCard } from "./hadith-card.ts";

const KEY = "newquranku:thread";

/**
 * How long a conversation stays on the phone.
 *
 * Twelve hours: long enough that leaving the app and coming back after work still works, short
 * enough that last night's grief is not waiting on the screen when someone else opens it tomorrow.
 * "Come back to the verse that held you" is a real need, but the answer to it is a bookmark — an
 * explicit, chosen act — not a chat log that quietly refuses to end.
 */
const TTL_MS = 12 * 60 * 60 * 1000;

/** Keep the thread bounded. Nobody scrolls back past this, and localStorage is not a database. */
const MAX_TURNS = 20;

/**
 * What Nur decided. Never what Nur drew.
 *
 * Note there is no `crisis` variant. That is deliberate and load-bearing: the type system makes it
 * impossible to persist a crisis exchange, because there is no shape to put it in.
 */
type TurnBody =
  | { q: string; kind: "ayah"; surah: number; ayah: number }
  | { q: string; kind: "surah"; surah: number }
  | { q: string; kind: "no-such-surah"; surah: number }
  | { q: string; kind: "no-such-ayah"; surah: number; ayah: number }
  | { q: string; kind: "hits"; refs: string[] }
  // A topic/knowledge question answered from the scholar's Indeks Tematik. Only the slug + question
  // are stored; the sourced entries are re-derived from the KB at render time (like every other turn,
  // the markup is rebuilt from today's code, never resurrected from disk).
  | { q: string; kind: "knowledge"; slug: string }
  // A broad definitional question answered from the reviewed-aqidah lane (aqidah.ts). Only the id +
  // question are stored; the ustadz's verbatim answer + verses are re-derived from the module at
  // render time — never resurrected from disk, like every other turn.
  | { q: string; kind: "aqidah"; id: string }
  // The SYNTHESIS edition's AI-authored answer (new-quranku-ai only). UNLIKE every other turn, the
  // prose is STORED, not re-derived: it is a non-deterministic model output, so regenerating on
  // restore would show different words than the reader first saw. The refs re-render as cards from
  // the corpus. Never produced by the principled build.
  // `hadith` is STORED for the same reason `prose` is, and it is the stronger case of the two. The
  // records come from a PRIVATE R2 corpus the browser cannot reach — there is no endpoint to
  // re-derive them from on restore. Dropping them would replay the prose with its prophetic
  // attribution and no card underneath, which is precisely the unbacked attribution the whole wall
  // exists to prevent. `renderTurn` therefore treats a marker with no card as unrenderable and
  // strips it, so tampered storage degrades to plain prose rather than to a fabricated receipt.
  // `below` is the scholar's card this composed answer SUPERSEDED, kept underneath instead of
  // replacing it (ISC-476, Erik's call 2026-08-17). Measured on prod: the principled turn painted at
  // ~T+12 s and this turn wiped the whole node at ~T+16 s, so a reader who had started on Ustadz
  // Muhammad Thalib's cited entries had them taken away mid-sentence. Only the KEY is stored, never
  // the markup — the entries re-derive from the KB at render time exactly as a standalone
  // `knowledge`/`aqidah` turn does, so a restored thread cannot show a card today's index no longer
  // supports. Absent on every turn composed before the reader saw anything: nothing was shown, so
  // nothing is being kept.
  | {
      q: string;
      kind: "ai";
      prose: string;
      refs: string[];
      hadith?: HadithCard[];
      below?: { kind: "knowledge"; slug: string } | { kind: "aqidah"; id: string };
    }
  // A question this feeling app must not answer with a verse OR the KB — a marital rights/obligation
  // matter (nafkah) that belongs to a human ustadz who does family law. Carries only the question;
  // the deferral copy is re-derived at render time. See needsFamilyLawScholar() in retrieve.ts.
  | { q: string; kind: "refer" }
  // An ENUMERATION-COUNT question ("ada berapa jumlah nabi") whose total the mushaf does not state in
  // a single ayah — the figures are hadith-based. Never keyword-dumps a topic; carries only the
  // question, the honest pointer copy is re-derived at render time. See looksLikeCount() in
  // question-form.ts. Curated ustadz-reviewed count answers (if added) outrank this via the aqidah lane.
  | { q: string; kind: "count-defer" }
  // A question the SYNTHESIS edition answered well and its own egress wall refused, because the honest
  // answer was a hadith and the app cannot yet produce a receipt for one. Sibling of `count-defer` —
  // same admission ("this one is in the hadith, not in an ayah"), reached from the other direction: the
  // count case never had an answer, this one had one and withheld it. Carries only the question; the
  // pointer copy is re-derived at render time. Never carries the refused prose — an unreceipted
  // prophetic attribution must not reach storage, let alone a screen. Never produced by the principled
  // build, which authors nothing to refuse.
  | { q: string; kind: "hadith-defer" }
  // The wall refused an answer for a reason that is NOT hadith (a fiqh verdict, stray Arabic, an
  // invented ayah reference) AND every fallback also came up empty. Distinct from `silence`, which
  // claims the corpus holds nothing matching — a claim that is FALSE here and, for a fiqh question,
  // a false statement about the mushaf itself. Carries only the question: never the rule that tripped,
  // never the refused prose.
  | { q: string; kind: "answer-blocked" }
  | { q: string; kind: "silence" };

/**
 * A turn, plus the one thing that is true ABOUT a turn rather than OF it.
 *
 * `withheld` is an ANNOTATION CHANNEL, and it exists because the late path had none (ISC-533/534).
 * Past `FAST_ANSWER_MS` the reader is already holding a real, cited, principled answer; when the
 * model's own attempt is then refused by the wall, the only thing `applyAi` could previously return
 * was a `Turn`, and a `Turn` REPLACES. So the choice was "downgrade a good answer" or "say nothing",
 * and the code said nothing — on every refusal slower than 9 s, which ISC-487 measures as nearly all
 * of them. The reader saw a complete-looking answer and no hint that a fuller one had been composed
 * and held back.
 *
 * A flag on the turn rather than loose DOM, deliberately: the annotation then survives `replaceTurn`
 * into storage and re-renders on a restored thread, instead of being a node that a later turn's
 * `innerHTML` silently deletes.
 *
 * WHICH WALL, because the two owe the reader different things. `"wall"` is a plain refusal — our own
 * check stopped the prose and there is nothing further to point at. `"hadith"` is the ONE refusal this
 * app considers TRUE: the honest answer lives in a hadith collection and we hold one, so the note
 * carries the Hadis pointer that `hadith-defer` would have carried had it replaced the turn.
 *
 * Set ONLY when the Worker's `gen.reason` was literally `"blocked"` (for `"wall"`) or the wall named
 * `bad_hadith` (for `"hadith"`). A deadline, a throw, an absent report and an unrecognised token all
 * leave it unset — see `AnswerBlockedError.terminal`.
 */
export type Turn = TurnBody & { withheld?: "wall" | "hadith" };

interface Stored {
  v: 1;
  at: number;
  turns: Turn[];
}

const now = () => Date.now();

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== 1 || !Array.isArray(s.turns)) return null;

    // Expired. Erase it rather than leave it lying around for the next person to open the app.
    if (now() - s.at > TTL_MS) {
      clearThread();
      return null;
    }
    return s;
  } catch {
    // Corrupt or unavailable (private mode). A broken thread must never break the app.
    return null;
  }
}

function write(turns: Turn[]): void {
  try {
    const s: Stored = { v: 1, at: now(), turns: turns.slice(-MAX_TURNS) };
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Quota, private mode, disabled storage. Persistence is an enhancement; the app works without it.
  }
}

/** Everything Nur remembers of this conversation. Empty if expired, cleared, or never started. */
export const loadThread = (): Turn[] => read()?.turns ?? [];

/**
 * Remember one exchange.
 *
 * Crisis turns are simply never handed to this function (see main.ts), and the `Turn` type has no
 * variant that could hold one. Two locks on the same door, because this is the one that matters.
 */
export function rememberTurn(turn: Turn): void {
  write([...loadThread(), turn]);
}

/**
 * Swap a remembered turn for the one it became, IN PLACE.
 *
 * For the progressive answer (main.ts): the fast principled turn is remembered as soon as it is
 * shown, so the conversation keeps its order even if the reader asks something else while the
 * composed answer is still coming. When it lands, this replaces the placeholder where it sits.
 *
 * WHY NOT AN INDEX. `write()` applies `slice(-MAX_TURNS)`, so a stored position is only stable until
 * the cap evicts from the front — an index captured before eviction would later point at somebody
 * else's turn and overwrite it. Matching on the serialized value has no such window.
 *
 * WHY THE LAST MATCH. Ask the same question twice and both placeholders serialize identically; the
 * later one is the one still on screen waiting to be upgraded.
 *
 * A MISS IS A NO-OP, DELIBERATELY. The placeholder is gone when the reader cleared the thread, when
 * it aged past the TTL, or when the cap evicted it — in all three the reader has already said or
 * shown that this turn is not wanted, and re-adding it would resurrect a conversation somebody
 * deleted. Silence is the only correct behaviour here.
 */
export function replaceTurn(previous: Turn, next: Turn): void {
  const turns = loadThread();
  const want = JSON.stringify(previous);
  for (let i = turns.length - 1; i >= 0; i--) {
    if (JSON.stringify(turns[i]) === want) {
      const updated = turns.slice();
      updated[i] = next;
      write(updated);
      return;
    }
  }
}

/** Burn it. Called by the user pressing "Hapus percakapan", and by expiry. */
export function clearThread(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do, and nothing worth telling the reader about */
  }
}

export const hasThread = (): boolean => loadThread().length > 0;

/** Build the persistable record of a retrieval answer. */
export const turnFromHits = (q: string, hits: Hit[]): Turn =>
  hits.length ? { q, kind: "hits", refs: hits.map((h) => h.verse.ref) } : { q, kind: "silence" };
