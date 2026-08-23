import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { registerDom, unregisterDom } from "./test-dom.ts";
import type { FetchLike } from "./kajian-feed.ts";

registerDom();

const { renderAdminKajian } = await import("./admin-kajian.ts");

afterAll(async () => {
  await unregisterDom();
});

beforeEach(() => {
  document.body.innerHTML = "";
});

interface JobFixture {
  readonly id: string;
  readonly videoId: string;
  readonly url: string;
  readonly status: "queued" | "running" | "done" | "failed";
  readonly requestedBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly error: string | null;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

function makeJob(overrides: Partial<JobFixture> = {}): JobFixture {
  return {
    id: "job-1",
    videoId: "video-123",
    url: "https://www.youtube.com/watch?v=video-123",
    status: "queued",
    requestedBy: "admin@example.com",
    createdAt: 1_724_370_000_000,
    updatedAt: 1_724_370_000_000,
    error: null,
    ...overrides,
  };
}

function mountNode(): HTMLElement {
  const mount = document.createElement("div");
  document.body.append(mount);
  return mount;
}

/**
 * Drain the whole async chain, not a fixed number of ticks.
 *
 * The success path awaits `fetch` -> `res.json()` -> `loadJobs()` (itself a fetch and a json), so
 * counting `await Promise.resolve()` samples the PENDING render and asserts on the wrong string.
 * A macrotask runs only once the microtask queue is empty, so this is tick-count independent.
 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("renderAdminKajian", () => {
  test("renders the form for an admin session", async () => {
    const mount = mountNode();
    const fetchImpl: FetchLike = async (url) => {
      if (url === "/api/auth/role") {
        return jsonResponse({ email: "admin@example.com", role: "admin" });
      }
      if (url === "/api/admin/kajian/jobs") {
        return jsonResponse({ ok: true, jobs: [makeJob()] });
      }
      throw new Error(`unexpected url ${url}`);
    };

    await renderAdminKajian(mount, fetchImpl);

    expect(mount.querySelector("form[data-admin-kajian-form]")).not.toBeNull();
    expect(mount.textContent).toContain("Masukkan ke antrean");
  });

  for (const scenario of [
    {
      name: "member",
      fetchImpl: (async () => jsonResponse({ email: "member@example.com", role: "member" })) satisfies FetchLike,
    },
    {
      name: "reviewer",
      fetchImpl: (async () => jsonResponse({ email: "reviewer@example.com", role: "reviewer" })) satisfies FetchLike,
    },
    {
      name: "anonymous",
      fetchImpl: (async () => jsonResponse({ email: null, role: "member" })) satisfies FetchLike,
    },
    {
      name: "non-ok response",
      fetchImpl: (async () =>
        jsonResponse({ email: "admin@example.com", role: "admin" }, { status: 500 })) satisfies FetchLike,
    },
    {
      name: "throwing fetch",
      fetchImpl: (async () => {
        throw new Error("boom");
      }) satisfies FetchLike,
    },
  ]) {
    test(`renders refusal and no form for ${scenario.name}`, async () => {
      const mount = mountNode();

      await renderAdminKajian(mount, scenario.fetchImpl);

      expect(mount.textContent).toContain("Halaman ini khusus admin");
      expect(mount.querySelector("form[data-admin-kajian-form]")).toBeNull();
    });
  }

  test("queued copy never says selesai", async () => {
    const mount = mountNode();
    const fetchImpl: FetchLike = async (url) => {
      if (url === "/api/auth/role") {
        return jsonResponse({ email: "admin@example.com", role: "admin" });
      }
      if (url === "/api/admin/kajian/jobs") {
        return jsonResponse({
          ok: true,
          jobs: [makeJob({ status: "queued" })],
        });
      }
      throw new Error(`unexpected url ${url}`);
    };

    await renderAdminKajian(mount, fetchImpl);

    expect(mount.textContent).toContain("Antrean");
    expect(mount.textContent).toContain("Menunggu diproses");
    expect(mount.textContent?.toLowerCase()).not.toContain("selesai");
  });

  test("escapes hostile job strings before they reach innerHTML", async () => {
    const mount = mountNode();
    const fetchImpl: FetchLike = async (url) => {
      if (url === "/api/auth/role") {
        return jsonResponse({ email: "admin@example.com", role: "admin" });
      }
      if (url === "/api/admin/kajian/jobs") {
        return jsonResponse({
          ok: true,
          jobs: [
            makeJob({
              videoId: `<script>alert("x")</script>`,
              requestedBy: `admin@example.com"><img src=x onerror="alert(1)">`,
              error: `<img src=x onerror="alert(1)">`,
              url: "javascript:alert(1)",
              status: "failed",
            }),
          ],
        });
      }
      throw new Error(`unexpected url ${url}`);
    };

    await renderAdminKajian(mount, fetchImpl);

    // ASSERTED AT THE DOM, NOT AS A STRING. A first cut asserted the exact entity form
    // `&quot;` and failed while the escaping was working perfectly: `esc()` does emit `&quot;`, and
    // Happy DOM's serialiser round-trips it back to a bare `\"` in TEXT position, where a quote is
    // inert. Asserting the serialised spelling tests the serialiser; asserting the DOM tests the
    // property — did any of this become an ELEMENT or an ATTRIBUTE. The second question is the one
    // an XSS asks, and it is the one that cannot pass by accident.
    expect(mount.querySelectorAll("script").length).toBe(0);
    expect(mount.querySelectorAll("img").length).toBe(0);
    expect(mount.querySelector("[onerror]")).toBeNull();
    // The angle brackets — the only characters that can open a tag — must be entities everywhere.
    expect(mount.innerHTML).toContain("&lt;script&gt;");
    expect(mount.innerHTML).toContain("&lt;img src=x");
    expect(mount.innerHTML).not.toContain("<script>alert");
    expect(mount.innerHTML).not.toContain(`href="javascript:alert(1)"`);
    // A `javascript:` url is not rendered as a link at all, so there is no href to neutralise.
    expect(mount.textContent).toContain("URL sumber tidak dapat ditampilkan.");
  });

  test("submit reflects queued, duplicate, invalid, and unavailable outcomes", async () => {
    const mount = mountNode();
    const seenBodies: string[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      if (url === "/api/auth/role") {
        return jsonResponse({ email: "admin@example.com", role: "admin" });
      }
      if (url === "/api/admin/kajian/jobs" && init?.method === undefined) {
        return jsonResponse({ ok: true, jobs: [] });
      }
      if (url === "/api/admin/kajian/jobs" && init?.method === "POST") {
        seenBodies.push(String(init.body));
        const count = seenBodies.length;
        if (count === 1) {
          return jsonResponse({ ok: true, job: makeJob({ id: "job-queued" }), created: true }, { status: 201 });
        }
        if (count === 2) {
          return jsonResponse({ ok: true, job: makeJob({ id: "job-queued" }), created: false }, { status: 200 });
        }
        if (count === 3) {
          return jsonResponse({ ok: false, error: "invalid_url" }, { status: 400 });
        }
        return jsonResponse({ ok: false, error: "unavailable" }, { status: 503 });
      }
      throw new Error(`unexpected url ${url}`);
    };

    await renderAdminKajian(mount, fetchImpl);
    const form = mount.querySelector("form[data-admin-kajian-form]");
    expect(form).not.toBeNull();
    if (!(form instanceof HTMLFormElement)) throw new Error("expected form");
    const input = form.elements.namedItem("url");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected url input");

    input.value = "https://www.youtube.com/watch?v=queued";
    form.requestSubmit();
    await flush();
    expect(mount.textContent).toContain("URL diterima. Masuk ke antrean dan menunggu diproses.");

    const form2 = mount.querySelector("form[data-admin-kajian-form]");
    if (!(form2 instanceof HTMLFormElement)) throw new Error("expected form2");
    const input2 = form2.elements.namedItem("url");
    if (!(input2 instanceof HTMLInputElement)) throw new Error("expected url input2");
    input2.value = "https://www.youtube.com/watch?v=queued";
    form2.requestSubmit();
    await flush();
    expect(mount.textContent).toContain("URL ini sudah ada di antrean dan masih menunggu diproses.");

    const form3 = mount.querySelector("form[data-admin-kajian-form]");
    if (!(form3 instanceof HTMLFormElement)) throw new Error("expected form3");
    const input3 = form3.elements.namedItem("url");
    if (!(input3 instanceof HTMLInputElement)) throw new Error("expected url input3");
    // A BARE STRING NEVER REACHES THE SERVER, and a first cut of this test assumed it did.
    // The input is `type="url" required`, so `requestSubmit()` runs constraint validation and
    // refuses — the handler does not fire and the previous notice is still on screen. Asserting the
    // 400 copy here failed against CORRECT behaviour. Both halves are now checked: the client guard
    // holds, and the server's 400 is exercised with a URL that is VALID but not a video we accept,
    // which is the only way that branch is actually reachable from this form.
    const beforeBlocked = seenBodies.length;
    input3.value = "notaurl";
    form3.requestSubmit();
    await flush();
    expect(seenBodies.length).toBe(beforeBlocked);

    input3.value = "https://vimeo.com/123456";
    form3.requestSubmit();
    await flush();
    expect(mount.textContent).toContain("URL ditolak. Gunakan alamat http(s) video yang valid.");

    const form4 = mount.querySelector("form[data-admin-kajian-form]");
    if (!(form4 instanceof HTMLFormElement)) throw new Error("expected form4");
    const input4 = form4.elements.namedItem("url");
    if (!(input4 instanceof HTMLInputElement)) throw new Error("expected url input4");
    input4.value = "https://www.youtube.com/watch?v=late";
    form4.requestSubmit();
    await flush();
    expect(mount.textContent).toContain("Layanan antrean belum tersedia saat ini.");

    expect(seenBodies[0]).toContain(`"url":"https://www.youtube.com/watch?v=queued"`);
  });
});
