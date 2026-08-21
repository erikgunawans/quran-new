/**
 * Provider routing — the body actually sent to OpenRouter.
 *
 * These assert on the SERIALISED REQUEST, not on the config object. A routing block that is built
 * correctly and then never reaches the wire is the exact failure this repo has already paid for
 * twice (`renderer-probe-misses-response-leak`, `three-walls-not-two`): the thing to measure is what
 * leaves the machine.
 */
import { describe, expect, it } from "bun:test";
import { callChatModel, resolveProvider } from "./providers.ts";

/** Capture the one outbound request without touching the network. */
async function bodyOf(cfg: Parameters<typeof callChatModel>[0]): Promise<Record<string, any>> {
  const real = globalThis.fetch;
  let sent: any = null;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    await callChatModel(cfg, "sys", "user", { temperature: 0.4, maxTokens: 100 });
  } finally {
    globalThis.fetch = real;
  }
  return sent;
}

/**
 * THE REAL SHIPPED CONFIG, built by `resolveProvider` — not a fixture copy of it.
 *
 * A first version of this file hardcoded its own `routing` object here. Every test passed, and
 * mutating the actual `OPENROUTER_ROUTING` constant away changed NOTHING — the suite was asserting
 * that a literal written in the test equalled itself. Force-red is what exposed it. If the thing
 * under test is "what the deployed Worker sends", the fixture has to come from the deployed path.
 */
const OPENROUTER = resolveProvider("openrouter", { OPENROUTER_API_KEY: "k" } as never);

describe("OpenRouter provider pinning", () => {
  it("puts the routing block on the wire", async () => {
    const body = await bodyOf(OPENROUTER as any);
    expect(body.provider).toEqual(OPENROUTER.routing);
    expect(OPENROUTER.routing).toBeDefined();
  });

  it("pins quantization to fp8 — the half that is about ANSWER QUALITY, not latency", async () => {
    // 18 providers serve this model id at fp4 / fp8 / unknown. Unpinned, which compression a reader's
    // Qur'an answer came from was a coin toss. Force-red: drop `quantizations` and this goes
    // undefined while every latency-shaped test stays green.
    const body = await bodyOf(OPENROUTER as any);
    expect(body.provider.quantizations).toEqual(["fp8"]);
  });

  it("keeps fallbacks ON, so pinning cannot become a single point of failure", async () => {
    // Pinning to ONE provider would trade a 40% hang rate for a total outage whenever that provider
    // blinks. `order` expresses a preference; `allow_fallbacks` keeps the rest of the fp8 pool live.
    const body = await bodyOf(OPENROUTER as any);
    expect(body.provider.allow_fallbacks).toBe(true);
    expect(body.provider.order.length).toBeGreaterThan(0);
  });

  it("sends NO provider block for a provider that has no routing layer", async () => {
    // SEA-LION is called directly. Its body must be byte-identical to what it sent before this
    // change — a stray `provider` key on a non-OpenRouter endpoint is an unknown field at best.
    const body = await bodyOf({ url: "https://x/y", apiKey: "k", model: "sealion" } as any);
    expect("provider" in body).toBe(false);
  });
});
