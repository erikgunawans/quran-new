import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  ADMIN_LINK_LABEL,
  adminLinkHtml,
  mountAdminKajianLink,
  showsAdminLink,
} from "./kajian-admin-link.ts";

if (!globalThis.document) GlobalRegistrator.register();

/** The head the reader page renders, reproduced from `renderKajian`'s own markup. */
function kajianPage(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="read-index kajian-index">
      <header class="tematik-head">
        <div class="tematik-head-l"><h1>Rangkuman Kajian</h1></div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
    </div>`;
  return el;
}

/**
 * A fetch that answers `/api/auth/role` the way the Worker does — 200 with `{email, role}` for
 * EVERY caller, anonymous ones included. The shape matters more than the status here: on this
 * origin a missing asset returns `index.html` at 200, so a test that faked the verdict with a
 * status code would be testing something the app never sees.
 */
function roleFetch(role: string | null, opts: { ok?: boolean; body?: string } = {}) {
  let calls = 0;
  const impl = async (): Promise<Response> => {
    calls += 1;
    const body = opts.body ?? JSON.stringify({ email: "erik@axiara.ai", role });
    return new Response(body, {
      status: opts.ok === false ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { impl: impl as unknown as typeof fetch, calls: () => calls };
}

describe("showsAdminLink — only a proven admin gets the entry point", () => {
  test("admin draws it", () => {
    expect(showsAdminLink("admin")).toBe(true);
  });

  // `denied` and `unavailable` are asserted SEPARATELY and never as one "not admin" case. They mean
  // different things to the surface this links to (ISC-652), and collapsing them here would teach
  // the next reader of this file the opposite of what that criterion settled.
  test("denied draws nothing", () => {
    expect(showsAdminLink("denied")).toBe(false);
  });

  test("unavailable draws nothing — an unanswered question is not a permission", () => {
    expect(showsAdminLink("unavailable")).toBe(false);
  });
});

describe("adminLinkHtml — the shipped anchor", () => {
  test("points at the admin route and carries the label", () => {
    const html = adminLinkHtml();
    expect(html).toContain('href="#/admin/kajian"');
    expect(html).toContain(ADMIN_LINK_LABEL);
  });
});

describe("mountAdminKajianLink — against a real document", () => {
  test("an admin gets exactly one anchor, inside the page head", async () => {
    const page = kajianPage();
    const f = roleFetch("admin");
    expect(await mountAdminKajianLink(page, f.impl)).toBe(true);
    const links = page.querySelectorAll('a[href="#/admin/kajian"]');
    expect(links.length).toBe(1);
    // Inside the head, not appended loose at the end of the page.
    expect(page.querySelector(".tematik-head-r .kajian-admin-link")).not.toBeNull();
    expect(f.calls()).toBe(1);
  });

  test("the Kembali link survives — the entry point is added, never a replacement", async () => {
    const page = kajianPage();
    await mountAdminKajianLink(page, roleFetch("admin").impl);
    expect(page.querySelector('.tematik-head-r a[href="#/"]')).not.toBeNull();
  });

  test("a non-admin reader gets NO anchor at all", async () => {
    const page = kajianPage();
    expect(await mountAdminKajianLink(page, roleFetch("reader").impl)).toBe(false);
    expect(page.querySelector('a[href="#/admin/kajian"]')).toBeNull();
  });

  test("an anonymous visitor (role null) gets NO anchor", async () => {
    const page = kajianPage();
    expect(await mountAdminKajianLink(page, roleFetch(null).impl)).toBe(false);
    expect(page.querySelector('a[href="#/admin/kajian"]')).toBeNull();
  });

  // The SPA-fallback shape: 200, but the body is the app shell rather than a role payload. This is
  // the case that must not read as a verdict.
  test("an unparseable body draws nothing rather than guessing", async () => {
    const page = kajianPage();
    const f = roleFetch(null, { body: "<!doctype html><html>the app shell</html>" });
    expect(await mountAdminKajianLink(page, f.impl)).toBe(false);
    expect(page.querySelector('a[href="#/admin/kajian"]')).toBeNull();
  });

  test("a throwing fetch draws nothing rather than throwing out of the page render", async () => {
    const page = kajianPage();
    const boom = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await mountAdminKajianLink(page, boom)).toBe(false);
    expect(page.querySelector('a[href="#/admin/kajian"]')).toBeNull();
  });

  test("mounting twice on the same node does not stack two links", async () => {
    const page = kajianPage();
    await mountAdminKajianLink(page, roleFetch("admin").impl);
    await mountAdminKajianLink(page, roleFetch("admin").impl);
    expect(page.querySelectorAll('a[href="#/admin/kajian"]').length).toBe(1);
  });

  test("a page without the expected head reports false instead of silently doing nothing", async () => {
    const bare = document.createElement("div");
    expect(await mountAdminKajianLink(bare, roleFetch("admin").impl)).toBe(false);
  });
});
