/**
 * MASUK — the sign-in surface, and the missing half of a contract the Worker already wrote.
 *
 * ── WHY THIS FILE DID NOT EXIST, AND WHAT WAS WAITING FOR IT ────────────────────────────────────
 *
 * The whole magic-link back end has been live since ISC-568: `/api/auth/request`, `/verify`,
 * `/logout`, `/role`. What was missing was any way for a person to reach it. `index.html` carried a
 * `<div>` reading "Masuk" and said so in its own comment — *"Masuk is still a stub"* — with no
 * handler, no route and no page.
 *
 * ⚠ THE ROUTE SHAPE IS NOT A CHOICE MADE HERE. `handleAuthRequest` builds the emailed link as
 * `${url.origin}/#/masuk/${token}` and comments *"The SPA reads `#/masuk/<token>` on load and POSTs
 * it to /api/auth/verify"*. That link has been going into (unsent) emails pointing at a route that
 * did not exist. This file implements the route the Worker was already promising; changing the
 * shape here would break links already minted, so it is copied from the Worker, not invented.
 *
 * ── THERE IS NO SIGN-UP, AND ITS ABSENCE IS THE DESIGN ──────────────────────────────────────────
 *
 * Not an omission and not a later phase. With magic-link there is nothing to register: an address
 * that has never been seen is created on first verify, and one that has is resumed — `linkAccount`
 * does both. A separate "Daftar" page could only ask for the same single field and would imply a
 * password or a profile that this app deliberately does not have. ADR 1: passwordless specifically
 * so a reader's private religious questions are never tied to a third-party identity, and **email
 * is the only PII**. So the copy says *masuk atau daftar* on one form rather than offering two.
 *
 * ── HONESTY ABOUT DELIVERY IS A REQUIREMENT, NOT A NICETY ───────────────────────────────────────
 *
 * `handleAuthRequest` answers `{ ok, sent }` and its docstring says the SPA "reports honestly
 * whether email is configured". Three outcomes, three DIFFERENT messages, because collapsing them
 * into "check your inbox" tells a person to wait for mail that will never arrive:
 *
 *   `ok:true,  sent:true`  — the link is on its way.
 *   `ok:true,  sent:false` — accepted, but `RESEND_API_KEY` is unset so NOTHING WAS SENT. The user
 *                            is told to contact the operator, not to check their inbox.
 *   `ok:false`             — `IDENTITY_HMAC_SECRET` is unset, so login cannot work at all. This is
 *                            what production answers TODAY (measured 2026-08-24).
 *
 * ── WHAT SIGNING IN DOES AND DOES NOT BUY ───────────────────────────────────────────────────────
 *
 * ADR 1: registration buys SYNC, not permission. Reading never depends on an account, and this page
 * says so, so nobody signs in expecting to unlock content. Privilege is separate and unreachable
 * from in here: `roleFor` reads the `ADMIN_EMAILS`/`REVIEWER_EMAILS` allowlists, which only an
 * operator can change. Nothing on this page can grant anything.
 *
 * ⚠ AND LOGOUT DOES NOT REVOKE. `handleAuthLogout` clears the cookie; the signed value stays valid
 * for the rest of its 30 days. The button says `Keluar` and the copy does not promise more than
 * that — a "sign out everywhere" affordance would be a false claim, since the only revocation lever
 * in the design is bumping `SESSION_DOMAIN`, which drops every session at once.
 */

import { esc } from "./esc.ts";

export const AUTH_REQUEST_URL = "/api/auth/request";
export const AUTH_VERIFY_URL = "/api/auth/verify";
export const AUTH_LOGOUT_URL = "/api/auth/logout";
export const AUTH_ROLE_URL = "/api/auth/role";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * What `#/masuk…` is asking for.
 *
 * A separate pure function so the token-bearing form is tested without a DOM. The token is the one
 * piece of this file that arrives from OUTSIDE — out of an email, through a URL bar — and it is the
 * piece a later reader is most likely to get wrong.
 */
export type MasukRoute = { kind: "form" } | { kind: "verify"; token: string };

/**
 * Parse `#/masuk` and `#/masuk/<token>`.
 *
 * ⚠ THE TOKEN IS NOT DECODED, NOT TRIMMED AND NOT VALIDATED HERE. It is `<b64url(email)>.<exp>.<mac>`
 * and only the Worker holds the secret that can judge it, so anything this function did beyond
 * splitting the path would be a SECOND opinion about validity — one that could accept a token the
 * Worker rejects, or, worse, reject one it would have accepted. It is passed through verbatim and
 * the verdict comes from `/api/auth/verify`.
 *
 * A trailing slash with nothing after it is the FORM, not an empty token: `#/masuk/` is what a user
 * gets from a mangled paste, and posting "" to verify would spend a request to be told what we
 * already know.
 */
export function parseMasukRoute(hash: string): MasukRoute | null {
  if (hash === "#/masuk" || hash === "#/masuk/") return { kind: "form" };
  const prefix = "#/masuk/";
  if (!hash.startsWith(prefix)) return null;
  const token = hash.slice(prefix.length);
  return token === "" ? { kind: "form" } : { kind: "verify", token };
}

/**
 * Refuse an obviously malformed address before spending a request on it.
 *
 * ⚠ DELIBERATELY THE SAME SHAPE AS THE WORKER'S `isValidEmail`, AND DELIBERATELY NOT THE AUTHORITY.
 * The server re-checks; this only spares a round trip and gives an instant message. A client-side
 * check that were STRICTER than the server's would silently refuse addresses the system accepts,
 * which is why this stays as loose as the server's rather than being "improved" with a real RFC
 * pattern.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function looksLikeEmail(raw: string): boolean {
  const email = raw.trim();
  return EMAIL_RE.test(email) && email.length <= 254;
}

/** What the form should say after `/api/auth/request` answered. */
export interface RequestOutcome {
  readonly notice: string;
  readonly tone: "info" | "error";
}

/**
 * Turn `{ ok, sent }` into what a person is told — pure, so every branch is pinned.
 *
 * The `ok:true, sent:false` branch is the one worth stating out loud: the request SUCCEEDED and no
 * email exists. Telling somebody to check their inbox there is a lie the code would tell on the
 * operator's behalf, and it is the current state of every deploy that has not had
 * `RESEND_API_KEY` set.
 */
export function requestOutcome(payload: unknown): RequestOutcome {
  const p = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  if (p.error === "invalid_email") {
    return { notice: "Alamat email itu tidak dikenali. Periksa lagi ejaannya.", tone: "error" };
  }
  if (p.ok !== true) {
    return {
      notice:
        "Masuk belum bisa dipakai di server ini — kuncinya belum dipasang. " +
        "Ini urusan pengelola aplikasi, bukan kesalahan Anda.",
      tone: "error",
    };
  }
  if (p.sent !== true) {
    return {
      notice:
        "Alamat diterima, tetapi pengiriman email belum diaktifkan di server ini, " +
        "jadi tautannya TIDAK terkirim. Hubungi pengelola aplikasi.",
      tone: "error",
    };
  }
  return {
    notice: "Tautan masuk sudah dikirim. Buka email Anda — tautannya berlaku 15 menit.",
    tone: "info",
  };
}

/** What the landing page should say after `/api/auth/verify` answered. */
export function verifyOutcome(payload: unknown): RequestOutcome {
  const p = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  if (p.ok === true && typeof p.email === "string") {
    return { notice: `Berhasil masuk sebagai ${p.email}.`, tone: "info" };
  }
  if (p.error === "invalid_token") {
    return {
      notice: "Tautan ini sudah kedaluwarsa atau tidak berlaku. Minta tautan baru di bawah ini.",
      tone: "error",
    };
  }
  // `{ok:false}` with no error is what the Worker answers when the secret or the database is
  // missing. Named separately from an expired token because the user can do nothing about it, and
  // "minta tautan baru" would send them round a loop that cannot terminate.
  return {
    notice: "Masuk belum bisa dipakai di server ini. Ini urusan pengelola aplikasi.",
    tone: "error",
  };
}

/** Who the shell should say is signed in, if anyone. */
export interface SessionView {
  readonly email: string | null;
  readonly role: string;
}

export function parseRole(payload: unknown): SessionView {
  const p = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const email = typeof p.email === "string" && p.email !== "" ? p.email : null;
  const role = typeof p.role === "string" ? p.role : "member";
  return { email, role };
}

async function readJson(res: Response): Promise<unknown> {
  const type = res.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * The signed-OUT form.
 *
 * `type="email"` and `autocomplete="email"` so a phone offers the right keyboard and the browser
 * offers the address it already knows — this is the only field, so the cost of getting it wrong is
 * the whole interaction.
 */
function formHtml(notice: string, tone: "info" | "error", submitting: boolean): string {
  const toneClass = tone === "error" ? "kajian-unreviewed" : "kajian-has-audio";
  return `
    <div class="read-index masuk-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Masuk</h1>
          <p class="tematik-sub">Masukkan email Anda dan kami kirimkan tautan masuk. Tidak ada kata sandi.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="note">${esc(MASUK_NOTE)}</p>
      <form class="masuk-form" data-masuk-form>
        <label class="kajian-channel" for="masuk-email">Alamat email</label>
        <div class="masuk-row">
          <input id="masuk-email" name="email" type="email" inputmode="email"
                 autocomplete="email" placeholder="nama@contoh.com" required />
          <button type="submit"${submitting ? " disabled" : ""}>Kirim tautan masuk</button>
        </div>
      </form>
      ${notice === "" ? "" : `<p class="${toneClass}" role="status">${esc(notice)}</p>`}
    </div>`;
}

/**
 * ⚠ THIS PARAGRAPH IS THE ONE THING ON THE PAGE THAT MUST NOT BE TRIMMED FOR TIDINESS.
 *
 * ADR 1 is titled "registration buys sync, not permission". A sign-in page is exactly where a
 * reader forms the opposite belief — that there is gated content behind it — and a person who
 * believes that and cannot receive the email concludes the app is withholding scripture from them.
 * It also states the PII position plainly, because asking for an email without saying what happens
 * to it is the part people are right to be wary of.
 */
export const MASUK_NOTE =
  "Masuk hanya untuk menyimpan catatan dan penanda Anda di beberapa perangkat. " +
  "Seluruh isi Al-Qur'an, terjemahan, dan rangkuman tetap terbuka tanpa masuk. " +
  "Kami hanya menyimpan alamat email Anda.";

function signedInHtml(view: SessionView): string {
  // The ROLE is shown only when it is not `member`, and only as a plain word. An Administrator or a
  // Reviewer benefits from confirming which surface they are about to reach; a Member has nothing
  // to learn from being told they are one, and a badge saying "member" invites the reading that
  // there is a tier to climb — the belief ADR 1 exists to prevent.
  const roleLine =
    view.role === "admin" || view.role === "reviewer"
      ? `<p class="kajian-meta">Peran: ${esc(view.role)}</p>`
      : "";
  return `
    <div class="read-index masuk-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Akun</h1>
          <p class="tematik-sub">Anda sudah masuk.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="kajian-channel">${esc(view.email ?? "")}</p>
      ${roleLine}
      <form class="masuk-form" data-masuk-logout>
        <button type="submit">Keluar</button>
      </form>
      <p class="kajian-meta">${esc(LOGOUT_NOTE)}</p>
    </div>`;
}

/**
 * Said because the code cannot make it untrue.
 *
 * `handleAuthLogout` sets `Max-Age=0` and the signed token stays cryptographically valid for the
 * rest of its 30 days — ADR 2's own definition of the feature. Promising "signed out everywhere"
 * here would be the kind of nominal compliance this codebase refuses elsewhere.
 */
export const LOGOUT_NOTE =
  "Keluar menghapus sesi di perangkat ini. Catatan dan penanda Anda tetap tersimpan.";

/**
 * Render the sign-in surface for the current hash.
 *
 * Asks `/api/auth/role` FIRST, always — including on the `#/masuk/<token>` landing. A person who is
 * already signed in and opens an old link should see their account, not be walked through a login
 * they do not need.
 */
export async function renderMasuk(
  mount: HTMLElement,
  hash: string,
  fetchImpl: FetchLike = fetch,
  onSessionChange: () => void = () => {},
): Promise<void> {
  const route = parseMasukRoute(hash) ?? { kind: "form" as const };

  let notice = "";
  let tone: "info" | "error" = "info";

  if (route.kind === "verify") {
    // Rendered BEFORE awaiting, so the page is never blank while a network call is in flight — this
    // is the first thing a person sees after clicking a link in their email.
    mount.innerHTML = formHtml("Memeriksa tautan masuk...", "info", true);
    try {
      const res = await fetchImpl(AUTH_VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: route.token }),
      });
      const outcome = verifyOutcome(await readJson(res));
      notice = outcome.notice;
      tone = outcome.tone;
    } catch {
      notice = "Tidak bisa menghubungi server. Coba lagi.";
      tone = "error";
    }
    // The token is removed from the address bar whatever the verdict. It is a live credential until
    // it expires, and leaving it in the URL keeps it in browser history and in anything the user
    // copies out of the address bar. `replaceState` rather than assigning `location.hash`, so this
    // does not push a second entry that the back button walks into and re-verifies.
    if (typeof history !== "undefined" && typeof history.replaceState === "function") {
      history.replaceState(null, "", "#/masuk");
    }
  }

  const session = await currentSession(fetchImpl);
  /**
   * ⚠ CALLED ON EVERY RENDER, NOT ONLY ON THE WAY IN.
   *
   * The sidebar chip is refreshed by the ROUTER, and logging out does not route — it re-renders in
   * place. Without this the chip kept showing the address of a session that had just been ended:
   * caught in a real browser, where the account screen correctly became the form while the sidebar
   * went on naming the account. A callback rather than a direct DOM write, so this module stays
   * ignorant of the shell and remains testable without one.
   */
  onSessionChange();

  if (session.email !== null) {
    mount.innerHTML = signedInHtml(session);
    wireLogout(mount, fetchImpl, onSessionChange);
    return;
  }

  mount.innerHTML = formHtml(notice, tone, false);
  wireForm(mount, fetchImpl);
}

export async function currentSession(fetchImpl: FetchLike = fetch): Promise<SessionView> {
  try {
    const res = await fetchImpl(AUTH_ROLE_URL, { headers: { accept: "application/json" } });
    return parseRole(await readJson(res));
  } catch {
    return { email: null, role: "member" };
  }
}

function wireForm(mount: HTMLElement, fetchImpl: FetchLike): void {
  const form = mount.querySelector("form[data-masuk-form]");
  if (!(form instanceof HTMLFormElement)) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.namedItem("email");
    if (!(input instanceof HTMLInputElement)) return;
    const email = input.value.trim();
    if (!looksLikeEmail(email)) {
      mount.innerHTML = formHtml("Alamat email itu tidak lengkap. Periksa lagi.", "error", false);
      wireForm(mount, fetchImpl);
      return;
    }
    void submitEmail(mount, fetchImpl, email);
  });
}

async function submitEmail(mount: HTMLElement, fetchImpl: FetchLike, email: string): Promise<void> {
  mount.innerHTML = formHtml("Mengirim...", "info", true);
  let outcome: RequestOutcome;
  try {
    const res = await fetchImpl(AUTH_REQUEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    outcome = requestOutcome(await readJson(res));
  } catch {
    outcome = { notice: "Tidak bisa menghubungi server. Coba lagi.", tone: "error" };
  }
  mount.innerHTML = formHtml(outcome.notice, outcome.tone, false);
  wireForm(mount, fetchImpl);
}

function wireLogout(mount: HTMLElement, fetchImpl: FetchLike, onSessionChange: () => void): void {
  const form = mount.querySelector("form[data-masuk-logout]");
  if (!(form instanceof HTMLFormElement)) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      try {
        await fetchImpl(AUTH_LOGOUT_URL, { method: "POST" });
      } catch {
        // Ignored on purpose. The cookie is cleared by the RESPONSE, so a failed request means the
        // session stands — and re-rendering the form below would claim otherwise. Falling through
        // to a fresh role check is what decides which screen is honest.
      }
      await renderMasuk(mount, "#/masuk", fetchImpl, onSessionChange);
    })();
  });
}
