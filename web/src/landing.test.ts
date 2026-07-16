import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

GlobalRegistrator.register();

const { dockLanding, undockLanding, destroyLanding, isLandingDocked, syncLanding, isChatRoute } =
  await import("./landing.ts");

afterAll(async () => {
  await GlobalRegistrator.unregister();
});

/**
 * The regression this file exists for.
 *
 * The landing was first wired to `ask()` alone — "the reader asked something, tear it down". That
 * made it an EVENT when it is a STATE, and navigation silently broke two ways, because `#hello`
 * lives inside `#chat`. A screenshot of #/baca caught it; these tests keep it caught.
 */

// The shape that matters: #composer-bar is a body-level sibling, #hello is nested inside #chat.
const HTML = `
  <div class="app" id="app">
    <section id="chat">
      <main class="thread" id="thread">
        <section class="hello" id="hello">
          <h1>Ada apa hari ini?</h1>
          <div class="seeds"><button class="seed">aku lagi capek banget</button></div>
        </section>
      </main>
    </section>
    <section id="read" hidden></section>
  </div>
  <div class="composer" id="composer-bar"><form id="composer"></form></div>
`;

const composerIsInHero = () => !!document.querySelector("#composer-bar")?.closest("#hello");
const composerExists = () => !!document.querySelector("#composer-bar");

beforeEach(() => {
  document.documentElement.removeAttribute("data-landing");
  document.body.innerHTML = HTML;
});

describe("dockLanding — the chat box is the main attraction on the empty state", () => {
  test("moves the composer into the hero, above the seeds", () => {
    dockLanding();
    expect(composerIsInHero()).toBe(true);
    // Order matters: greeting → h1 → composer → seeds. It is the hero, not a footer.
    const hero = document.querySelector("#hello")!;
    const kids = [...hero.children].map((c) => c.id || c.className);
    expect(kids.indexOf("composer-bar")).toBeLessThan(kids.indexOf("seeds"));
  });

  test("sets data-landing, which the 1120px landing width keys off", () => {
    dockLanding();
    expect(isLandingDocked()).toBe(true);
  });

  test("is idempotent — a route pass may call it repeatedly", () => {
    dockLanding();
    dockLanding();
    dockLanding();
    expect(document.querySelectorAll("#composer-bar").length).toBe(1);
    expect(composerIsInHero()).toBe(true);
  });

  test("does nothing once the hero is gone", () => {
    destroyLanding();
    dockLanding();
    expect(composerExists()).toBe(true);
    expect(composerIsInHero()).toBe(false);
    expect(isLandingDocked()).toBe(false);
  });
});

describe("undockLanding — leaving the chat door must not strand the reader's input", () => {
  test("the composer survives navigation and returns to body level", () => {
    // The actual bug: #/baca hid #chat with the composer still inside it, so the chat input —
    // reachable from every route before the port — silently vanished from the reading surface.
    dockLanding();
    undockLanding();
    expect(composerExists()).toBe(true);
    expect(composerIsInHero()).toBe(false);
    expect(document.querySelector("#composer-bar")!.parentElement).toBe(document.body);
  });

  test("the composer is NOT inside #chat, so hiding #chat cannot hide it", () => {
    dockLanding();
    undockLanding();
    expect(document.querySelector("#composer-bar")!.closest("#chat")).toBeNull();
  });

  test("clears data-landing, so the reading MEASURE stays 46rem", () => {
    // The second half of the bug: data-landing leaked onto the read route and inflated the
    // reading column from its 46rem measure to the landing's 1120px.
    dockLanding();
    undockLanding();
    expect(isLandingDocked()).toBe(false);
  });

  test("is idempotent and safe before any dock", () => {
    undockLanding();
    undockLanding();
    expect(composerExists()).toBe(true);
    expect(isLandingDocked()).toBe(false);
  });

  test("a full Tanya → Baca → Tanya round trip returns the composer to the hero", () => {
    dockLanding();
    undockLanding(); // → #/baca
    dockLanding(); // → back to #/
    expect(composerIsInHero()).toBe(true);
    expect(isLandingDocked()).toBe(true);
    expect(document.querySelectorAll("#composer-bar").length).toBe(1);
  });
});

describe("destroyLanding — the reader asked something; the empty state is over", () => {
  test("removes the hero but NEVER the composer", () => {
    // The composer must leave the hero before the hero is removed, or the input is destroyed
    // along with it — mid-question, with the reader's words in it.
    dockLanding();
    destroyLanding();
    expect(document.querySelector("#hello")).toBeNull();
    expect(composerExists()).toBe(true);
    expect(document.querySelector("#composer-bar")!.parentElement).toBe(document.body);
  });

  test("the reader's typed words survive the teardown", () => {
    dockLanding();
    const input = document.createElement("textarea");
    input.id = "q";
    input.value = "aku lagi capek banget";
    document.querySelector("#composer")!.append(input);

    destroyLanding();

    expect(document.querySelector<HTMLTextAreaElement>("#q")!.value).toBe("aku lagi capek banget");
  });

  test("clears data-landing", () => {
    dockLanding();
    destroyLanding();
    expect(isLandingDocked()).toBe(false);
  });

  test("is safe to call twice", () => {
    destroyLanding();
    destroyLanding();
    expect(composerExists()).toBe(true);
  });
});

/**
 * The test that would ACTUALLY have caught the original bug.
 *
 * The primitives above were never wrong — the router simply never asked the question on the way
 * out. So the route table itself is under test here, driven by hash, exactly as route() drives it.
 */
describe("syncLanding — driven by the route, in BOTH directions", () => {
  test("#/baca does not strand the composer inside the hidden #chat", () => {
    syncLanding("#/"); // reader lands
    expect(composerIsInHero()).toBe(true);

    syncLanding("#/baca"); // reader taps "Baca" — THE BUG
    expect(composerIsInHero()).toBe(false);
    expect(document.querySelector("#composer-bar")!.closest("#chat")).toBeNull();
    expect(isLandingDocked()).toBe(false); // and the 46rem reading measure is restored
  });

  const readingRoutes = ["#/baca", "#/tema", "#/tema/sabar", "#/surah/18", "#/surah/18#10"];
  for (const hash of readingRoutes) {
    test(`${hash} is a reading door — composer at body level, measure intact`, () => {
      syncLanding("#/");
      syncLanding(hash);
      expect(isChatRoute(hash)).toBe(false);
      expect(composerIsInHero()).toBe(false);
      expect(isLandingDocked()).toBe(false);
      expect(composerExists()).toBe(true);
    });
  }

  const chatRoutes = ["", "#/", "#"];
  for (const hash of chatRoutes) {
    test(`${hash || "(empty)"} is the chat door — composer is the hero`, () => {
      syncLanding("#/baca");
      syncLanding(hash);
      expect(isChatRoute(hash)).toBe(true);
      expect(composerIsInHero()).toBe(true);
      expect(isLandingDocked()).toBe(true);
    });
  }

  test("every hash leaves exactly one composer, always reachable", () => {
    for (const hash of [...readingRoutes, ...chatRoutes, "#/baca", "#/", "#/surah/2"]) {
      syncLanding(hash);
      expect(document.querySelectorAll("#composer-bar").length).toBe(1);
      expect(composerExists()).toBe(true);
    }
  });

  test("after a question, no route re-docks the composer into a destroyed hero", () => {
    syncLanding("#/");
    destroyLanding(); // the reader asked something
    for (const hash of ["#/baca", "#/", "#/surah/18"]) {
      syncLanding(hash);
      expect(composerIsInHero()).toBe(false);
      expect(composerExists()).toBe(true);
    }
  });
});
