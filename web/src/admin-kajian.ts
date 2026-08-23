/**
 * ANTREAN KAJIAN ADMIN menampilkan STATUS antrean saja, tidak pernah isi pengguna.
 *
 * ADR 4 tetap berlaku di sini: seorang administrator tidak melihat pertanyaan, catatan, bookmark,
 * atau konten pembaca lain. Permukaan ini hanya menunjukkan apakah sebuah URL sudah diterima,
 * sedang diproses, selesai diproses, atau gagal diproses.
 *
 * Halaman ini juga REFUSAL-BY-DEFAULT. Form hanya muncul setelah host ini membuktikan, lewat
 * `/api/auth/role` yang benar-benar JSON dan tervalidasi, bahwa sesi sekarang adalah `admin`.
 * Semua jawaban lain — termasuk 200 HTML dari fallback SPA, payload cacat, atau fetch yang melempar
 * error — mendarat ke penolakan, karena jalur aman di sini memang "jangan buka permukaan admin".
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
      <form data-admin-kajian-form>
        <label class="kajian-channel" for="admin-kajian-url">URL video</label>
        <div class="kajian-card-foot">
          <input
            id="admin-kajian-url"
            name="url"
            type="url"
            inputmode="url"
            autocomplete="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <button type="submit"${state.submitting ? " disabled" : ""}>Masukkan ke antrean</button>
        </div>
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
    const roleRes = await fetchImpl(ROLE_URL);
    const rolePayload = await readJson(roleRes);
    if (!isRolePayload(rolePayload) || rolePayload.role !== "admin") return;

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
            notice: "URL ditolak. Gunakan alamat http(s) video yang valid.",
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
    // Refusal is the correct answer here; any soft failure must deliberately land on the SAFE side.
    mount.innerHTML = refusalHtml();
  }
}
