/**
 * ANTREAN KAJIAN ADMIN menampilkan STATUS antrean saja, tidak pernah isi pengguna.
 *
 * ADR 4 tetap berlaku di sini: seorang administrator tidak melihat pertanyaan, catatan, bookmark,
 * atau konten pembaca lain. Permukaan ini hanya menunjukkan apakah sebuah URL sudah diterima,
 * sedang diproses, selesai diproses, atau gagal diproses.
 *
 * Halaman ini juga REFUSAL-BY-DEFAULT. Form hanya muncul setelah host ini membuktikan, lewat
 * `/api/auth/role` yang benar-benar JSON dan tervalidasi, bahwa sesi sekarang adalah `admin`.
 * Semua jawaban lain tidak pernah membuka permukaan ini.
 *
 * TAPI "TIDAK MEMBUKA" DAN "MENOLAK" BUKAN HAL YANG SAMA (ISC-652). Dulu keduanya mendarat pada
 * satu kalimat — *"Halaman ini khusus admin"* — sehingga koneksi yang putus, 200 HTML dari fallback
 * SPA, atau payload cacat memberi tahu seorang admin bahwa dia bukan admin, tanpa cara mencoba lagi.
 * Sekarang `checkRole` memisahkan tiga hasil: `admin`, `denied` (pemeriksaan berhasil dan jawabannya
 * bukan admin), dan `unavailable` (pemeriksaannya sendiri tidak selesai). Hanya `denied` yang boleh
 * mengklaim sesuatu tentang izin. `unavailable` memakai salinan yang tidak mengklaim apa pun dan
 * menawarkan tombol coba lagi. Yang berubah adalah apa yang DIKATAKAN, bukan apa yang DITAMPILKAN —
 * keduanya tetap tidak membuka form maupun antrean.
 *
 * Escaping bersifat load-bearing. Baris antrean berisi string yang bisa datang dari URL YouTube,
 * video ID, dan data turunan lain yang akhirnya masuk ke `innerHTML`. Semua interpolasi teks wajib
 * lewat `esc()`, dan setiap `href` harus lolos `safeHttpUrl()` supaya data tersimpan tidak bisa
 * menyelundupkan `javascript:`.
 */

import { esc } from "./esc.ts";
import { safeHttpUrl } from "./kajian-summary.ts";
import type { FetchLike } from "./kajian-feed.ts";

type Role = "member" | "reviewer" | "admin";

interface RolePayload {
  readonly email: string | null;
  readonly role: Role;
}

interface KajianJob {
  readonly id: string;
  readonly videoId: string;
  readonly url: string;
  readonly status: "queued" | "running" | "done" | "failed";
  readonly requestedBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly error: string | null;
}

interface SubmitPayload {
  readonly ok: true;
  readonly job: KajianJob;
  readonly created: boolean;
}

interface JobsPayload {
  readonly ok: true;
  readonly jobs: readonly KajianJob[];
}

type NoticeTone = "info" | "error";

interface AdminKajianState {
  readonly notice: string;
  readonly noticeTone: NoticeTone;
  readonly jobs: readonly KajianJob[];
  readonly jobsNote: string;
  readonly submitting: boolean;
}

const ROLE_URL = "/api/auth/role";
const JOBS_URL = "/api/admin/kajian/jobs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRole(value: unknown): value is Role {
  return value === "member" || value === "reviewer" || value === "admin";
}

function isRolePayload(value: unknown): value is RolePayload {
  if (!isRecord(value)) return false;
  const { email, role } = value;
  return (email === null || typeof email === "string") && isRole(role);
}

function isKajianJobStatus(value: unknown): value is KajianJob["status"] {
  return value === "queued" || value === "running" || value === "done" || value === "failed";
}

function isKajianJob(value: unknown): value is KajianJob {
  if (!isRecord(value)) return false;
  const { id, videoId, url, status, requestedBy, createdAt, updatedAt, error } = value;
  return (
    typeof id === "string" &&
    typeof videoId === "string" &&
    typeof url === "string" &&
    isKajianJobStatus(status) &&
    typeof requestedBy === "string" &&
    typeof createdAt === "number" &&
    Number.isFinite(createdAt) &&
    typeof updatedAt === "number" &&
    Number.isFinite(updatedAt) &&
    (error === null || typeof error === "string")
  );
}

function isJobsPayload(value: unknown): value is JobsPayload {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.jobs)) return false;
  return value.jobs.every(isKajianJob);
}

function isSubmitPayload(value: unknown): value is SubmitPayload {
  if (!isRecord(value)) return false;
  return value.ok === true && typeof value.created === "boolean" && isKajianJob(value.job);
}

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers.get("content-type");
  return contentType !== null && contentType.toLowerCase().includes("application/json");
}

async function readJson(res: Response): Promise<unknown | null> {
  if (!res.ok || !isJsonResponse(res)) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * WHAT THE ROLE CHECK ACTUALLY SAID — three outcomes, not two (ISC-652).
 *
 * The page used to collapse these into one refusal, and that is the defect. `refusalHtml()` says
 * *"Halaman ini khusus admin"*, which is a statement about the READER's permission. When the check
 * merely failed to happen — a dropped connection, an edge blip, the SPA fallback answering 200 with
 * HTML — that sentence tells an administrator they are not one, with no retry and no way back but a
 * manual reload. The route check runs only on route entry, so a tab opened before an allowlist
 * change keeps showing it indefinitely.
 *
 * Erik's own report looked exactly like this for a moment before turning out to be something else
 * ("it is actually there, my bad"). The symptom is reachable and was briefly believed; the next
 * person to hit it would have no way to tell which of the two had happened.
 *
 * `denied` is the ONLY outcome that may claim anything about permission. Everything else is
 * `unavailable` — we could not tell — and that is deliberately NOT treated as permission either:
 * both still refuse to open the surface. The split changes what the reader is TOLD, never what they
 * are SHOWN.
 */
export type RoleCheck = "admin" | "denied" | "unavailable";

/**
 * Ask `/api/auth/role` and classify the answer without rendering anything.
 *
 * Pure of the DOM so the decision can be tested directly. `/api/auth/role` answers 200 with
 * `{email, role}` for EVERY caller including an anonymous one — so a non-200, a non-JSON body, or a
 * payload that fails validation is never "you are not an admin", it is "the question did not get
 * answered". That last case is load-bearing on this origin: a missing asset returns `index.html` at
 * 200, so shape validation and not status is what separates a real verdict from the SPA fallback.
 */
/**
 * EXPORTED so there is exactly ONE role check in the app, not two that can drift.
 *
 * `kajian-admin-link.ts` renders the only entry point to this surface and has to ask the same
 * question this page asks. Copying the classifier there would have produced two bindings that agree
 * on the day they are written and diverge on the first change to either — the shape recorded at
 * `diagnostic-outlives-its-gate`. The consumers differ in what they DO with a verdict, never in how
 * they reach one.
 */
export async function checkRole(fetchImpl: FetchLike): Promise<RoleCheck> {
  let res: Response;
  try {
    res = await fetchImpl(ROLE_URL);
  } catch {
    return "unavailable";
  }
  const payload = await readJson(res);
  if (!isRolePayload(payload)) return "unavailable";
  return payload.role === "admin" ? "admin" : "denied";
}

/**
 * The page when the check could not be made. Distinct from `refusalHtml()` in what it CLAIMS, and
 * identical to it in what it EXPOSES — no queue, no form, nothing an administrator would see.
 *
 * It carries a retry, because the honest version of "I could not check" is useless without one:
 * the check runs on route entry only, and without this button the sole recovery is knowing to
 * reload the page by hand.
 */
function unavailableHtml(): string {
  return `
    <div class="read-index kajian-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Antrean Kajian Admin</h1>
          <p class="tematik-sub">Permukaan ini khusus admin dan hanya menampilkan status antrean pemrosesan.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="kajian-empty" role="alert">Aku belum bisa memastikan status sesimu — pemeriksaannya tidak selesai, bukan berarti kamu ditolak. Coba lagi sebentar.</p>
      <p class="admin-kajian-retry-row"><button type="button" class="admin-kajian-retry">Coba lagi</button></p>
    </div>`;
}

function refusalHtml(): string {
  return `
    <div class="read-index kajian-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Antrean Kajian Admin</h1>
          <p class="tematik-sub">Permukaan ini khusus admin dan hanya menampilkan status antrean pemrosesan.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="kajian-empty" role="alert">Halaman ini khusus admin. Status antrean tidak ditampilkan pada sesi ini.</p>
    </div>`;
}

function formatWhen(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: KajianJob["status"]): string {
  switch (status) {
    case "queued":
      return "Antrean";
    case "running":
      return "Diproses";
    case "done":
      return "Selesai diproses";
    case "failed":
      return "Gagal";
  }
}

function statusDetail(job: KajianJob): string {
  switch (job.status) {
    case "queued":
      return "Menunggu diproses";
    case "running":
      return "Sedang diproses";
    case "done":
      return "Pemrosesan selesai";
    case "failed":
      return job.error !== null && job.error.trim() !== ""
        ? `Gagal diproses: ${job.error}`
        : "Gagal diproses";
  }
}

function jobRow(job: KajianJob): string {
  const href = safeHttpUrl(job.url);
  const errorRow =
    job.error !== null && job.error.trim() !== ""
      ? `<p class="kajian-meta">Galat: ${esc(job.error)}</p>`
      : "";

  return `
    <article class="kajian-card">
      <div class="kajian-card-body">
        <div class="kajian-card-foot">
          <span class="kajian-has-audio">${esc(statusLabel(job.status))}</span>
          <span class="kajian-unreviewed">${esc(statusDetail(job))}</span>
        </div>
        <h2 class="kajian-title">${esc(job.videoId)}</h2>
        <p class="kajian-channel">Diminta oleh ${esc(job.requestedBy)}</p>
        <p class="kajian-meta">Dibuat ${esc(formatWhen(job.createdAt))} · Diperbarui ${esc(formatWhen(job.updatedAt))}</p>
        ${
          href !== null
            ? `<p class="kajian-meta"><a class="kajian-source" href="${esc(href)}" rel="noopener noreferrer" target="_blank">Buka URL sumber</a></p>`
            : `<p class="kajian-meta">URL sumber tidak dapat ditampilkan.</p>`
        }
        ${errorRow}
      </div>
    </article>`;
}

function jobsHtml(jobs: readonly KajianJob[], jobsNote: string): string {
  if (jobs.length === 0) {
    return `<p class="kajian-empty">${esc(jobsNote)}</p>`;
  }
  return `<div class="kajian-grid">${jobs.map(jobRow).join("")}</div>`;
}

/**
 * Turn a `Retry-After` seconds value into something a person can act on.
 *
 * Bounded and checked rather than trusted: a missing, non-numeric or negative header degrades to a
 * sentence that promises nothing, because "coba lagi dalam NaN jam" is worse than saying less.
 */
function retryHint(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return "Coba lagi nanti.";
  if (seconds < 3600) return `Coba lagi sekitar ${Math.ceil(seconds / 60)} menit lagi.`;
  const hours = Math.ceil(seconds / 3600);
  return hours >= 20 ? "Coba lagi besok." : `Coba lagi sekitar ${hours} jam lagi.`;
}

function renderAdminShell(mount: HTMLElement, state: AdminKajianState): HTMLFormElement | null {
  const noticeToneClass = state.noticeTone === "error" ? "kajian-unreviewed" : "kajian-has-audio";
  mount.innerHTML = `
    <div class="read-index kajian-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Antrean Kajian Admin</h1>
          <p class="tematik-sub">Tempel URL video YouTube untuk masuk ke antrean. Halaman ini hanya menampilkan status pemrosesan.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <form class="admin-kajian-form" data-admin-kajian-form>
        <label class="admin-kajian-label" for="admin-kajian-url">URL video</label>
        <div class="admin-kajian-row">
          <input
            id="admin-kajian-url"
            name="url"
            type="url"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            aria-describedby="admin-kajian-hint"
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <button type="submit"${state.submitting ? " disabled" : ""}>${
            state.submitting ? "Mengirim…" : "Masukkan ke antrean"
          }</button>
        </div>
        <!-- NAMES THE ACCEPTED SHAPES, because the refusal could not. A rejected paste used to say
             "gunakan alamat http(s) video yang valid" to an admin who had pasted exactly that — the
             message was true and told him nothing. The shapes belong BEFORE the mistake, not after. -->
        <p class="admin-kajian-hint" id="admin-kajian-hint">
          Bisa tautan biasa, siaran langsung, atau Shorts — misalnya
          <code>youtube.com/watch?v=…</code>, <code>youtube.com/live/…</code>, <code>youtu.be/…</code>.
          Tautan channel atau playlist belum bisa diproses.
        </p>
      </form>
      <p class="${noticeToneClass}" role="status">${esc(state.notice)}</p>
      <section aria-label="Status antrean kajian">
        ${jobsHtml(state.jobs, state.jobsNote)}
      </section>
    </div>`;
  return mount.querySelector("form[data-admin-kajian-form]");
}

async function loadJobs(fetchImpl: FetchLike): Promise<readonly KajianJob[] | null> {
  const res = await fetchImpl(JOBS_URL);
  const payload = await readJson(res);
  if (!isJobsPayload(payload)) return null;
  return payload.jobs;
}

export async function renderAdminKajian(
  mount: HTMLElement,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  mount.innerHTML = refusalHtml();

  try {
    // THE THREE-WAY SPLIT (ISC-652). `denied` keeps the refusal already painted above — it is the
    // correct and safe answer. `unavailable` swaps in copy that claims nothing about permission and
    // offers a retry, because the check running only on route entry means there is otherwise no way
    // back. Neither one opens the surface.
    const check = await checkRole(fetchImpl);
    if (check === "unavailable") {
      showUnavailable(mount, fetchImpl);
      return;
    }
    if (check !== "admin") return;

    const jobs = await loadJobs(fetchImpl);
    let state: AdminKajianState = {
      notice: "Admin terverifikasi. URL yang diterima hanya masuk ke antrean dan menunggu diproses.",
      noticeTone: "info",
      jobs: jobs ?? [],
      jobsNote: jobs === null ? "Status antrean belum tersedia saat ini." : "Belum ada URL di antrean.",
      submitting: false,
    };

    const submit = async (event: SubmitEvent): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;
      const input = form.elements.namedItem("url");
      if (!(input instanceof HTMLInputElement)) return;

      const url = input.value.trim();
      state = { ...state, submitting: true, notice: "Mengirim URL ke antrean...", noticeTone: "info" };
      const pendingForm = renderAdminShell(mount, state);
      if (pendingForm !== null) pendingForm.addEventListener("submit", submit);

      try {
        const res = await fetchImpl(JOBS_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const payload = isJsonResponse(res) ? await res.json() : null;

        if ((res.status === 201 || res.ok) && isSubmitPayload(payload)) {
          const refreshed = await loadJobs(fetchImpl);
          state = {
            notice: payload.created
              ? "URL diterima. Masuk ke antrean dan menunggu diproses."
              : "URL ini sudah ada di antrean dan masih menunggu diproses.",
            noticeTone: "info",
            jobs: refreshed ?? [payload.job, ...state.jobs.filter((job) => job.id !== payload.job.id)],
            jobsNote: refreshed === null ? "Status antrean belum tersedia saat ini." : "Belum ada URL di antrean.",
            submitting: false,
          };
        } else if (res.status === 400) {
          state = {
            ...state,
            notice:
              "URL itu belum bisa aku proses. Yang bisa: tautan video, siaran langsung, atau Shorts — " +
              "bukan tautan channel atau playlist.",
            noticeTone: "error",
            submitting: false,
          };
        } else if (res.status === 429) {
          // THE BRANCH THAT WAS MISSING. A spent daily allowance fell through to the generic "tidak
          // tersedia pada sesi ini", which reads as a broken feature — while the Worker had gone to
          // the trouble of answering 429 with a `Retry-After` precisely so the UI could say WHEN.
          // Nothing is wrong on either side here; the admin just has to come back.
          //
          // THE WAIT IS READ OFF `Retry-After`, NOT FROM A COPY OF `MAX_JOBS_PER_DAY`. The ceiling
          // lives in `worker/src/kajian-jobs.ts` and `web/` cannot import from `worker/` — so a
          // number typed here would be a second source of truth that drifts the day Erik changes the
          // real one, silently, with no test able to see it across the build-graph boundary. The
          // header is what the Worker actually sent, so it cannot disagree with the Worker.
          state = {
            ...state,
            notice: `Jatah antrean sudah habis untuk sekarang. ${retryHint(res.headers.get("retry-after"))}`,
            noticeTone: "error",
            submitting: false,
          };
        } else if (res.status === 503) {
          state = {
            ...state,
            notice: "Layanan antrean belum tersedia saat ini.",
            noticeTone: "error",
            submitting: false,
          };
        } else {
          state = {
            ...state,
            notice: "Permintaan antrean tidak tersedia pada sesi ini.",
            noticeTone: "error",
            submitting: false,
          };
        }
      } catch {
        state = {
          ...state,
          notice: "Permintaan antrean tidak tersedia pada sesi ini.",
          noticeTone: "error",
          submitting: false,
        };
      }

      const nextForm = renderAdminShell(mount, state);
      if (nextForm !== null) nextForm.addEventListener("submit", submit);
    };

    const form = renderAdminShell(mount, state);
    if (form !== null) form.addEventListener("submit", submit);
  } catch {
    // WAS `refusalHtml()`, AND THAT WAS THE SECOND HALF OF ISC-652. Everything reachable from here
    // runs AFTER the session already proved `admin` — so a throw in `loadJobs` or a render was
    // telling a verified administrator "Halaman ini khusus admin". It is a failure, not a verdict.
    // Still opens nothing; only the sentence changes.
    showUnavailable(mount, fetchImpl);
  }
}

/**
 * Paint the could-not-check page and wire its retry back to a fresh `renderAdminKajian`.
 *
 * Re-entering the whole function rather than re-running just the fetch is deliberate: the retry has
 * to be able to reach a WORKING page, and that means re-running everything the first attempt did,
 * including loading the queue.
 */
function showUnavailable(mount: HTMLElement, fetchImpl: FetchLike): void {
  mount.innerHTML = unavailableHtml();
  const retry = mount.querySelector(".admin-kajian-retry");
  if (retry !== null) {
    retry.addEventListener("click", () => void renderAdminKajian(mount, fetchImpl), { once: true });
  }
}
