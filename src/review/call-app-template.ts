/**
 * The call app — one self-contained HTML page for running the ustadz review.
 *
 * Emitted by split-feelings-expansion.ts from the SAME parsed batches as the markdown, so the two
 * cannot drift. (They drifted once already today when a correction was hand-applied to generated
 * output; one source, two emitters, is the answer to that.)
 *
 * WHY A PAGE AND NOT A DOCUMENT. This is not for reading, it is for running a phone call. Erik holds
 * it while the ustadz talks. That means: answers must persist the moment they are typed (a dropped
 * call must not cost an hour of a scholar's time), progress must be visible per batch (so a review
 * can stop and resume across days), and the result must be exportable in one click — because the
 * closing step is sending the captured answers back for his confirmation, and a summary he never
 * receives is a review that never legally happened.
 *
 * NOT PUBLISHED. Stays a local file. The document names a real person and carries his religious
 * judgement; distribution is Erik's call, not a side effect of tooling. Same decision as the other
 * ustadz-facing HTML in this repo.
 *
 * IDENTITY. Follows the app's own laws rather than inventing a second visual language: celestial
 * ground, emerald/ink line-work, 8-point khātam motif, girih hairlines. The GOLD LAW is respected —
 * gold appears only as ground (the masthead's green→gold type gradient), never on content. No external
 * assets of any kind, so it works offline, in print, and under any CSP.
 */

export interface AppVerse {
  readonly ref: string;
  readonly surah: string;
  readonly why: string;
  readonly tafsiriyah: string;
  readonly kemenag: string;
  readonly doubt: string | null;
  readonly flagged: boolean;
  readonly live: boolean;
  readonly withdrawn: string | null;
}
export interface AppFeeling {
  readonly name: string;
  readonly verses: readonly AppVerse[];
}
export interface AppBatch {
  readonly n: number;
  readonly feelings: readonly AppFeeling[];
  readonly verses: number;
  readonly flagged: number;
  readonly live: number;
  readonly minutes: number;
  readonly notLive: readonly string[];
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** An 8-point khātam star — the app's own mushaf motif, drawn as line-work, never filled with gold. */
const KHATAM = (cls: string) =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 14.9 6l5-.9-.9 5 4.4 2.9-4.4 2.9.9 5-5-.9L12 24.4 9.1 20l-5 .9.9-5L.6 13l4.4-2.9-.9-5 5 .9z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.1" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;

const CHOICES = [
  { v: "pas", label: "Pas, pakai" },
  { v: "ganti", label: "Pas, kalimatnya ganti" },
  { v: "cabut", label: "Jangan dipakai" },
  { v: "pikir", label: "Ustadz pikir dulu" },
] as const;

function verseCard(v: AppVerse, feeling: string, n: number): string {
  const id = v.ref.replace(":", "-");
  return `
<article class="verse${v.flagged ? " is-flagged" : ""}" id="v-${id}" data-ref="${esc(v.ref)}" data-feeling="${esc(feeling)}">
  <header class="v-head">
    <span class="medallion">${KHATAM("khatam")}<b>${n}</b></span>
    <div class="v-id">
      <h4>QS. ${esc(v.surah)} <span class="ref">${esc(v.ref)}</span></h4>
      <p class="v-tags">
        ${v.flagged ? `<span class="chip chip-warn">⚠️ kami ragu</span>` : ""}
        ${v.live ? `<span class="chip chip-live">sudah tayang</span>` : `<span class="chip chip-off">belum tayang</span>`}
      </p>
    </div>
    <span class="v-state" data-state-for="${esc(v.ref)}"></span>
  </header>

  ${
    v.withdrawn
      ? `<div class="say say-withdraw"><span class="say-tag">Sampaikan dulu</span><p>“${esc(v.withdrawn)}”</p></div>`
      : ""
  }

  <div class="read">
    <span class="read-tag">Bacakan ayatnya</span>
    <p>${esc(v.tafsiriyah)}</p>
  </div>

  <div class="say"><span class="say-tag">Tanyakan</span>
    <p>“Kalau ada orang yang sedang <b>${esc(feeling.toLowerCase())}</b>, ayat ini pas nggak Ustadz untuk menemani dia?
    Bukan soal benar atau tidaknya ayat — tentu benar — tapi pas atau tidaknya ditaruh di perasaan itu.”</p>
  </div>

  ${
    v.doubt
      ? `<div class="say say-doubt"><span class="say-tag">⚠️ Sampaikan keraguan kami — jangan dilewat</span><p>“Yang ini kami sendiri ragu, Ustadz. ${esc(v.doubt)}”</p></div>`
      : ""
  }

  <p class="caption"><span>Kalimat yang muncul di aplikasi</span> “${esc(v.why)}”</p>

  <details class="kemenag"><summary>Terjemahan Kemenag — kalau Ustadz minta pembanding</summary><p>${esc(v.kemenag)}</p></details>

  <div class="answer">
    <label for="a-${id}">Jawaban Ustadz <em>— tulis apa adanya, jangan dibulatkan jadi “setuju”</em></label>
    <textarea id="a-${id}" data-note="${esc(v.ref)}" rows="3" placeholder="Ketik yang Ustadz katakan…"></textarea>
    <div class="choices" role="group" aria-label="Putusan untuk ${esc(v.ref)}">
      ${CHOICES.map((c) => `<button type="button" class="choice" data-choice="${c.v}" data-for="${esc(v.ref)}" aria-pressed="false">${c.label}</button>`).join("")}
    </div>
  </div>
</article>`;
}

function batchPanel(b: AppBatch, total: number): string {
  return `
<section class="panel" id="bagian-${b.n}" hidden>
  <header class="p-head">
    <p class="eyebrow">Bagian ${b.n} dari ${total}</p>
    <h2>${b.feelings.map((f) => esc(f.name)).join(" · ")}</h2>
    <div class="stats">
      <span><b>${b.verses}</b> ayat</span>
      <span><b>${b.live}</b> sudah tayang</span>
      ${b.flagged ? `<span class="warn"><b>${b.flagged}</b> ⚠️ perlu ditimbang</span>` : ""}
      <span>± <b>${b.minutes}</b> menit</span>
    </div>
  </header>

  <div class="alert">
    <h3>Status yang sebenarnya — mohon dibaca dulu</h3>
    <p><b>${b.live} dari ${b.verses} ayat di bagian ini sudah tayang</b> dan sedang dibaca pengguna. Ayat-ayat ini
    kami naikkan atas keputusan kami sendiri, <b>sebelum</b> Ustadz sempat meninjaunya.</p>
    <p>Maka <b>“jangan dipakai” berarti kami cabut dari aplikasi</b>, bukan sekadar tidak jadi memasang.
    Mohon jangan sungkan mencabut — beberapa sudah kami cabut sendiri setelah diperiksa ulang.</p>
    ${b.notLive.length ? `<p class="muted">Belum/tidak tayang di bagian ini: ${b.notLive.map(esc).join(", ")}.</p>` : ""}
  </div>

  <details class="guide" open>
    <summary>Cara memakai halaman ini &amp; pembuka telepon</summary>
    <div class="guide-body">
      <p class="lede">Halaman ini untuk <b>kamu</b>, bukan untuk Ustadz. Beliau tidak membaca dan tidak menulis apa pun —
      cukup menjawab lewat telepon. Kamu yang membacakan, bertanya, dan menuliskan jawabannya.</p>
      <ol>
        <li><b>Bacakan ayatnya dulu, baru bertanya.</b> Jangan minta Ustadz menilai dari nomor ayat saja.</li>
        <li><b>Pertanyaannya bukan “ayat ini benar tidak”</b> — tentu benar. Tapi: pas atau tidak ditaruh pada perasaan itu.</li>
        <li><b>Tanda ⚠️ wajib dibacakan keraguannya.</b> Justru di situ pendapat Ustadz paling dibutuhkan.</li>
        <li><b>Tulis jawabannya apa adanya</b>, termasuk yang ragu-ragu atau setengah setuju.</li>
        <li>Kalau Ustadz ingin berhenti di tengah, <b>berhenti saja.</b> Yang sudah dijawab tetap terpakai.</li>
      </ol>
      <blockquote class="script">
        “Ustadz, saya minta waktunya sebentar. Aplikasi Qur’an yang saya buat menemani orang lewat <b>perasaan</b> —
        kalau seseorang menulis ‘saya lagi sedih’, aplikasinya menampilkan ayat yang kami rasa menemani perasaan itu.
        Yang mau saya minta: <b>apakah ayat yang kami pilih memang pas</b> untuk perasaan itu.<br><br>
        Satu hal saya sampaikan terus terang dulu: <b>ayat-ayat ini sudah tayang duluan</b> dan sudah dibaca orang.
        Itu keputusan kami, sebelum sempat minta pendapat Ustadz. Kalau menurut Ustadz ada yang tidak pas,
        <b>kami cabut</b>. Mohon jangan sungkan.<br><br>
        Nama Ustadz tercantum sebagai peninjau, jadi saya ingin memastikan yang tercantum itu memang benar-benar
        sudah Ustadz lihat.”
      </blockquote>
    </div>
  </details>

  ${b.feelings
    .map(
      (f) => `
  <section class="feeling">
    <div class="f-head">
      <div class="girih">${KHATAM("girih-star")}</div>
      <h3>${esc(f.name)}</h3>
      <p class="f-open">Buka dengan: <em>“Sekarang tentang orang yang sedang <b>${esc(f.name.toLowerCase())}</b>, Ustadz.”</em></p>
    </div>
    ${f.verses.map((v, i) => verseCard(v, f.name, i + 1)).join("")}
    <div class="f-tail">
      <p><b>Sebelum pindah:</b> “Ada ayat lain yang menurut Ustadz lebih pas untuk perasaan ini?”</p>
      <textarea data-note="usulan:${esc(f.name)}" rows="2" placeholder="Usulan ayat dari Ustadz…"></textarea>
    </div>
  </section>`,
    )
    .join("")}

  <section class="closing">
    <h3>Penutup telepon — jangan dilewat</h3>
    <blockquote class="script">
      “Terima kasih banyak, Ustadz. Saya rapikan dulu catatannya, nanti saya kirim ke Ustadz —
      <b>mohon dilihat sebentar apakah sudah sesuai</b> dengan yang Ustadz maksud. Kalau sudah pas, cukup Ustadz
      balas ‘betul’ saja, dan itu yang saya pakai sebagai persetujuan.”
    </blockquote>
    <p class="why-confirm">Nama Ustadz tampil di aplikasi sebagai peninjau. Konfirmasi singkat dari beliau — WhatsApp,
    pesan suara, apa saja — itulah yang menjadikan catatan ini sah, bukan ingatan kita atas obrolan.
    <b>Tanpa konfirmasi itu, jangan ditayangkan sebagai sudah ditinjau.</b></p>
    <div class="confirm-grid">
      <label>Tanggal telepon <input type="date" data-note="meta:tanggal:${b.n}"></label>
      <label class="chk"><input type="checkbox" data-note="meta:dikirim:${b.n}"> Catatan sudah dikirim ke Ustadz</label>
      <label class="chk strong"><input type="checkbox" data-note="meta:konfirmasi:${b.n}"> <b>Sudah dikonfirmasi Ustadz</b></label>
    </div>
    <div class="closing-actions">
      <button type="button" class="btn btn-primary" data-copy="${b.n}">Salin ringkasan bagian ini</button>
      <span class="hint">Tempel ke WhatsApp untuk dikirim ke Ustadz.</span>
    </div>
  </section>
</section>`;
}

export function renderCallApp(batches: readonly AppBatch[], totalVerses: number): string {
  const nav = batches
    .map(
      (b) => `<li><button type="button" class="nav-item" data-go="${b.n}">
      <span class="n">${String(b.n).padStart(2, "0")}</span>
      <span class="nav-body">
        <span class="nav-title">${esc(b.feelings.map((f) => f.name).join(", "))}</span>
        <span class="nav-meta">${b.verses} ayat${b.flagged ? ` · <i class="w">${b.flagged} ⚠️</i>` : ""} · ± ${b.minutes} mnt</span>
      </span>
      <span class="nav-prog" data-prog-for="${b.n}">0/${b.verses}</span>
    </button></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Peninjauan Ayat Perasaan — panduan telepon</title>
<style>
:root{
  --bg:oklch(0.978 0.007 160); --surface:#fff; --surface-2:oklch(0.985 0.005 160);
  --ink:oklch(0.219 0.024 167); --ink-2:oklch(0.416 0.021 169); --ink-3:oklch(0.509 0.021 166);
  --primary:oklch(0.416 0.083 165); --primary-wash:oklch(0.955 0.017 165);
  --primary-line:oklch(0.627 0.129 165/0.45); --line:oklch(0.900 0.010 165);
  --warn:oklch(0.52 0.11 55); --warn-wash:oklch(0.965 0.030 75);
  --gold-a:#16a249; --gold-b:#f0c851;
  --sk:oklch(0.30 0.045 168); --sk2:oklch(0.22 0.035 170);
  --r:14px; --shadow:0 1px 2px oklch(0.219 0.024 167/.05),0 8px 24px oklch(0.219 0.024 167/.06);
}
@media (prefers-color-scheme:dark){:root{
  --bg:oklch(0.175 0.018 165); --surface:oklch(0.225 0.020 165); --surface-2:oklch(0.205 0.019 165);
  --ink:oklch(0.970 0.006 160); --ink-2:oklch(0.800 0.012 165); --ink-3:oklch(0.680 0.014 165);
  --primary:oklch(0.760 0.128 165); --primary-wash:oklch(0.760 0.128 165/0.14);
  --primary-line:oklch(0.760 0.128 165/0.42); --line:oklch(0.320 0.022 165);
  --warn:oklch(0.80 0.11 70); --warn-wash:oklch(0.80 0.11 70/0.13);
  --gold-a:#34d399; --gold-b:#f5d67a; --sk:oklch(0.16 0.03 168); --sk2:oklch(0.11 0.022 170);
  --shadow:0 1px 2px #0006,0 10px 30px #0004;
}}
:root[data-theme=dark]{
  --bg:oklch(0.175 0.018 165); --surface:oklch(0.225 0.020 165); --surface-2:oklch(0.205 0.019 165);
  --ink:oklch(0.970 0.006 160); --ink-2:oklch(0.800 0.012 165); --ink-3:oklch(0.680 0.014 165);
  --primary:oklch(0.760 0.128 165); --primary-wash:oklch(0.760 0.128 165/0.14);
  --primary-line:oklch(0.760 0.128 165/0.42); --line:oklch(0.320 0.022 165);
  --warn:oklch(0.80 0.11 70); --warn-wash:oklch(0.80 0.11 70/0.13);
  --gold-a:#34d399; --gold-b:#f5d67a; --sk:oklch(0.16 0.03 168); --sk2:oklch(0.11 0.022 170);
  --shadow:0 1px 2px #0006,0 10px 30px #0004;
}
:root[data-theme=light]{
  --bg:oklch(0.978 0.007 160); --surface:#fff; --surface-2:oklch(0.985 0.005 160);
  --ink:oklch(0.219 0.024 167); --ink-2:oklch(0.416 0.021 169); --ink-3:oklch(0.509 0.021 166);
  --primary:oklch(0.416 0.083 165); --primary-wash:oklch(0.955 0.017 165);
  --primary-line:oklch(0.627 0.129 165/0.45); --line:oklch(0.900 0.010 165);
  --warn:oklch(0.52 0.11 55); --warn-wash:oklch(0.965 0.030 75);
  --gold-a:#16a249; --gold-b:#f0c851; --sk:oklch(0.30 0.045 168); --sk2:oklch(0.22 0.035 170);
  --shadow:0 1px 2px oklch(0.219 0.024 167/.05),0 8px 24px oklch(0.219 0.024 167/.06);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  -webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:ui-serif,Georgia,"Iowan Old Style","Times New Roman",serif;font-weight:600;line-height:1.25;margin:0}
.layout{display:grid;grid-template-columns:320px 1fr;min-height:100vh}

/* ── sidebar: the celestial ground, the only place gold is allowed ───────── */
.side{position:sticky;top:0;height:100vh;overflow-y:auto;color:#e8f4ee;
  background:radial-gradient(120% 80% at 50% -10%,var(--sk) 0%,var(--sk2) 60%,var(--sk2) 100%);
  border-right:1px solid var(--primary-line)}
.side::-webkit-scrollbar{width:8px}.side::-webkit-scrollbar-thumb{background:#ffffff26;border-radius:4px}
.brand{padding:26px 22px 18px;border-bottom:1px solid #ffffff1f}
.brand .mark{display:flex;align-items:center;gap:10px;color:#8fe3bd}
.brand .mark svg{width:26px;height:26px}
.brand h1{font-size:20px;margin-top:12px;color:#fff}
.brand h1 em{font-style:normal;background:linear-gradient(92deg,var(--gold-a),var(--gold-b));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.brand p{margin:6px 0 0;font-size:12.5px;color:#a9c9bb;line-height:1.5}
.overall{padding:16px 22px;border-bottom:1px solid #ffffff1f}
.overall .bar{height:6px;border-radius:99px;background:#ffffff1f;overflow:hidden}
.overall .bar i{display:block;height:100%;width:0;border-radius:99px;
  background:linear-gradient(90deg,var(--gold-a),var(--gold-b));transition:width .3s}
.overall .lbl{display:flex;justify-content:space-between;font-size:12px;color:#a9c9bb;margin-bottom:7px}
.overall .lbl b{color:#fff}
nav ul{list-style:none;margin:0;padding:10px 12px 28px}
.nav-item{width:100%;display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;
  padding:11px 12px;border:0;border-radius:11px;background:transparent;color:inherit;cursor:pointer;text-align:left;
  font:inherit;transition:background .15s}
.nav-item:hover{background:#ffffff12}
.nav-item.is-active{background:#ffffff1c;box-shadow:inset 0 0 0 1px var(--primary-line)}
.nav-item .n{font-family:ui-serif,Georgia,serif;font-size:14px;color:#8fe3bd;min-width:22px}
.nav-item.is-done .n::after{content:"✓";margin-left:3px;color:#8fe3bd}
.nav-title{display:block;font-size:13.5px;color:#eaf6f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-meta{display:block;font-size:11.5px;color:#9dbdb0;margin-top:2px}
.nav-meta .w{font-style:normal;color:#f0c07a}
.nav-prog{font-size:11.5px;color:#9dbdb0;font-variant-numeric:tabular-nums}
.side-actions{padding:0 22px 24px;display:flex;flex-wrap:wrap;gap:8px}
.side-actions button{flex:1 1 auto;padding:8px 10px;border-radius:9px;border:1px solid #ffffff2e;
  background:#ffffff10;color:#dcefe6;font:inherit;font-size:12.5px;cursor:pointer}
.side-actions button:hover{background:#ffffff1c}

/* ── main ────────────────────────────────────────────────────────────────── */
main{padding:44px 40px 96px;max-width:820px;margin:0 auto;width:100%}
.eyebrow{margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--primary);font-weight:600}
.p-head h2{font-size:29px;letter-spacing:-.01em}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0;padding:0;list-style:none}
.stats span{font-size:12.5px;color:var(--ink-2);background:var(--surface);border:1px solid var(--line);
  border-radius:99px;padding:5px 12px}
.stats span b{color:var(--ink)}
.stats .warn{color:var(--warn);border-color:color-mix(in oklch,var(--warn) 40%,transparent)}
.stats .warn b{color:var(--warn)}

.alert{margin:26px 0;padding:18px 20px;border-radius:var(--r);background:var(--warn-wash);
  border:1px solid color-mix(in oklch,var(--warn) 34%,transparent);border-left-width:3px}
.alert h3{font-size:15px;color:var(--warn);margin-bottom:8px}
.alert p{margin:0 0 8px;font-size:14px;color:var(--ink-2)}
.alert p:last-child{margin-bottom:0}
.alert .muted{font-size:13px;color:var(--ink-3)}

.guide{margin:22px 0;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.guide>summary{cursor:pointer;padding:14px 18px;font-weight:600;font-size:14.5px;color:var(--primary);list-style:none}
.guide>summary::-webkit-details-marker{display:none}
.guide>summary::before{content:"▸ ";display:inline-block;transition:transform .15s}
.guide[open]>summary::before{transform:rotate(90deg)}
.guide-body{padding:2px 20px 20px;border-top:1px solid var(--line)}
.lede{font-size:14.5px;color:var(--ink-2)}
.guide ol{margin:14px 0;padding-left:20px;font-size:14px;color:var(--ink-2)}
.guide li{margin:7px 0}
.script{margin:16px 0 0;padding:16px 18px;border-left:3px solid var(--primary-line);
  background:var(--primary-wash);border-radius:0 10px 10px 0;font-size:14.5px;color:var(--ink)}

/* girih divider — emerald hairline + khātam, never gold */
.f-head{margin:44px 0 18px;text-align:center}
.girih{display:flex;align-items:center;gap:14px;color:var(--primary);opacity:.75;margin-bottom:14px}
.girih::before,.girih::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--primary-line),transparent)}
.girih-star{width:19px;height:19px;flex:none}
.f-head h3{font-size:23px}
.f-open{margin:8px 0 0;font-size:13.5px;color:var(--ink-3)}
.f-open em{color:var(--ink-2)}

.verse{margin:18px 0;padding:22px;border:1px solid var(--line);border-radius:var(--r);
  background:var(--surface);box-shadow:var(--shadow)}
.verse.is-flagged{border-color:color-mix(in oklch,var(--warn) 40%,var(--line))}
.verse.is-answered{border-color:var(--primary-line);background:var(--surface-2)}
.v-head{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:start}
.medallion{position:relative;width:38px;height:38px;flex:none;display:grid;place-items:center;color:var(--primary)}
.medallion .khatam{position:absolute;inset:0;width:38px;height:38px;opacity:.55}
.medallion b{font-family:ui-serif,Georgia,serif;font-size:14px;color:var(--primary)}
.v-id h4{font-size:16.5px}
.v-id .ref{color:var(--ink-3);font-weight:400}
.v-tags{margin:6px 0 0;display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:11px;padding:3px 9px;border-radius:99px;border:1px solid var(--line);color:var(--ink-3)}
.chip-warn{color:var(--warn);border-color:color-mix(in oklch,var(--warn) 40%,transparent);background:var(--warn-wash)}
.chip-live{color:var(--primary);border-color:var(--primary-line);background:var(--primary-wash)}
.v-state{font-size:12px;color:var(--primary);font-weight:600;white-space:nowrap}

.read{margin:18px 0 0;padding:17px 19px;border-left:3px solid var(--primary);background:var(--primary-wash);
  border-radius:0 10px 10px 0}
.read-tag,.say-tag{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--primary);font-weight:700;margin-bottom:7px}
.read p{margin:0;font-family:ui-serif,Georgia,"Iowan Old Style",serif;font-size:18px;line-height:1.72}
.say{margin:14px 0 0;padding:14px 17px;border:1px dashed var(--line);border-radius:11px}
.say p{margin:0;font-size:14.5px;color:var(--ink-2)}
.say-doubt{border-color:color-mix(in oklch,var(--warn) 45%,transparent);background:var(--warn-wash)}
.say-doubt .say-tag{color:var(--warn)}
.say-doubt p{color:var(--ink)}
.say-withdraw{border-style:solid;border-color:var(--primary-line);background:var(--primary-wash)}
.caption{margin:14px 0 0;font-size:14px;color:var(--ink-2);font-style:italic}
.caption span{display:block;font-style:normal;font-size:11px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-3);font-weight:700;margin-bottom:4px}
.kemenag{margin:12px 0 0}
.kemenag summary{cursor:pointer;font-size:13px;color:var(--ink-3)}
.kemenag p{margin:9px 0 0;padding:12px 15px;background:var(--surface-2);border:1px solid var(--line);
  border-radius:10px;font-size:14px;color:var(--ink-2)}

.answer{margin:18px 0 0;padding-top:17px;border-top:1px solid var(--line)}
.answer label{display:block;font-size:13px;font-weight:600;color:var(--ink-2);margin-bottom:8px}
.answer label em{font-weight:400;color:var(--ink-3);font-style:normal}
textarea,input[type=date]{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;
  background:var(--bg);color:var(--ink);font:inherit;font-size:14.5px;resize:vertical}
textarea:focus,input:focus{outline:2px solid var(--primary);outline-offset:1px;border-color:transparent}
.choices{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.choice{padding:8px 14px;border:1px solid var(--line);border-radius:99px;background:var(--surface);
  color:var(--ink-2);font:inherit;font-size:13px;cursor:pointer;transition:.15s}
.choice:hover{border-color:var(--primary-line);color:var(--ink)}
.choice.is-on{background:var(--primary);color:#fff;border-color:var(--primary);font-weight:600}
.choice[data-choice=cabut].is-on{background:var(--warn);border-color:var(--warn)}
:root[data-theme=dark] .choice.is-on,@media (prefers-color-scheme:dark){.choice.is-on{color:oklch(0.18 0.02 165)}}

.f-tail{margin:16px 0 0;padding:16px 19px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r)}
.f-tail p{margin:0 0 9px;font-size:14px;color:var(--ink-2)}
.closing{margin:52px 0 0;padding:26px;border:1px solid var(--primary-line);border-radius:var(--r);background:var(--surface)}
.closing h3{font-size:19px;margin-bottom:12px}
.why-confirm{font-size:14px;color:var(--ink-2);margin:16px 0}
.confirm-grid{display:grid;gap:11px;margin:18px 0}
.confirm-grid label{font-size:14px;color:var(--ink-2)}
.confirm-grid input[type=date]{margin-top:6px}
.chk{display:flex;align-items:center;gap:9px}
.chk input{width:17px;height:17px;accent-color:var(--primary)}
.chk.strong{padding:11px 14px;border:1px solid var(--primary-line);border-radius:10px;background:var(--primary-wash)}
.closing-actions{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-top:8px}
.btn{padding:10px 17px;border-radius:10px;border:1px solid var(--line);background:var(--surface);
  color:var(--ink);font:inherit;font-size:14px;cursor:pointer}
.btn-primary{background:var(--primary);color:#fff;border-color:var(--primary);font-weight:600}
.hint{font-size:12.5px;color:var(--ink-3)}
.toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);opacity:0;
  background:var(--ink);color:var(--bg);padding:11px 20px;border-radius:99px;font-size:14px;
  transition:.25s;pointer-events:none;z-index:9}
.toast.is-on{opacity:1;transform:translateX(-50%)}

@media (max-width:900px){
  .layout{grid-template-columns:1fr}
  .side{position:static;height:auto;max-height:none}
  main{padding:28px 20px 72px}
  .p-head h2{font-size:23px}
}
@media print{
  .side,.side-actions,.choices,.closing-actions,.toast{display:none!important}
  .layout{display:block}main{max-width:none;padding:0}
  .panel[hidden]{display:none}.verse{break-inside:avoid;box-shadow:none}
  body{background:#fff;color:#000}
}
/* A reduced-motion reader gets no transitions — the progress bar, the toast slide, the choice-button
   and card state changes all resolve instantly. This is a tool a scholar may use with accessibility
   settings on; motion here is decoration, never meaning, so it is safe to drop entirely. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{transition-duration:0.01ms!important;animation-duration:0.01ms!important}
  html{scroll-behavior:auto}
}
</style>
</head>
<body>
<div class="layout">
  <aside class="side">
    <div class="brand">
      <div class="mark">${KHATAM("")}</div>
      <h1>Peninjauan <em>Ayat Perasaan</em></h1>
      <p>Panduan telepon bersama Ustadz Ahmad Isrofiel Mardlatillah. Halaman ini untuk pewawancara — jawaban tersimpan otomatis di perangkat ini.</p>
    </div>
    <div class="overall">
      <div class="lbl"><span>Kemajuan</span><span><b id="done-n">0</b> / ${totalVerses} ayat</span></div>
      <div class="bar"><i id="done-bar"></i></div>
    </div>
    <nav><ul>${nav}</ul></nav>
    <div class="side-actions">
      <button type="button" id="theme">Ganti tema</button>
      <button type="button" id="export">Unduh jawaban</button>
      <button type="button" id="print">Cetak</button>
    </div>
  </aside>
  <main>
    ${batches.map((b) => batchPanel(b, batches.length)).join("")}
  </main>
</div>
<div class="toast" id="toast"></div>
<script>
(function(){
  var KEY = "nq-ustadz-review-v1";
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch(e){ store = {}; }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(store)); } catch(e){} }
  function toast(msg){ var t=document.getElementById("toast"); t.textContent=msg; t.classList.add("is-on");
    clearTimeout(t._t); t._t=setTimeout(function(){t.classList.remove("is-on");},2200); }

  // ── restore ─────────────────────────────────────────────────────────────
  document.querySelectorAll("[data-note]").forEach(function(el){
    var k = el.getAttribute("data-note"), v = store["note:"+k];
    if (v === undefined) return;
    if (el.type === "checkbox") el.checked = !!v; else el.value = v;
  });
  document.querySelectorAll("[data-note]").forEach(function(el){
    el.addEventListener("input", function(){
      store["note:"+el.getAttribute("data-note")] = el.type==="checkbox" ? el.checked : el.value;
      save(); paint();
    });
  });
  document.querySelectorAll(".choice").forEach(function(b){
    b.addEventListener("click", function(){
      var ref=b.getAttribute("data-for"), val=b.getAttribute("data-choice");
      store["choice:"+ref] = (store["choice:"+ref]===val) ? "" : val;
      save(); paint();
    });
  });

  var LABEL={pas:"Pas, pakai",ganti:"Ganti kalimat",cabut:"Jangan dipakai",pikir:"Ustadz pikir dulu"};

  function paint(){
    var done=0, total=0;
    document.querySelectorAll(".verse").forEach(function(v){
      var ref=v.getAttribute("data-ref"), c=store["choice:"+ref]||"";
      total++;
      v.querySelectorAll(".choice").forEach(function(b){
        var on = b.getAttribute("data-choice")===c;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var st=v.querySelector("[data-state-for]");
      st.textContent = c ? LABEL[c] : "";
      st.style.color = c==="cabut" ? "var(--warn)" : "var(--primary)";
      v.classList.toggle("is-answered", !!c);
      if (c) done++;
    });
    document.getElementById("done-n").textContent=done;
    document.getElementById("done-bar").style.width=(total?done/total*100:0)+"%";
    document.querySelectorAll(".panel").forEach(function(p){
      var vs=p.querySelectorAll(".verse"), d=0;
      vs.forEach(function(v){ if(store["choice:"+v.getAttribute("data-ref")]) d++; });
      var n=p.id.replace("bagian-","");
      var tag=document.querySelector('[data-prog-for="'+n+'"]');
      if(tag){ tag.textContent=d+"/"+vs.length; }
      var nav=document.querySelector('[data-go="'+n+'"]');
      if(nav) nav.classList.toggle("is-done", d===vs.length && vs.length>0);
    });
  }

  // ── navigation ──────────────────────────────────────────────────────────
  function go(n){
    document.querySelectorAll(".panel").forEach(function(p){ p.hidden = p.id !== "bagian-"+n; });
    document.querySelectorAll(".nav-item").forEach(function(b){
      b.classList.toggle("is-active", b.getAttribute("data-go")===String(n));
    });
    store.last=n; save();
    window.scrollTo({top:0});
    if (location.hash !== "#bagian-"+n) history.replaceState(null,"","#bagian-"+n);
  }
  document.querySelectorAll(".nav-item").forEach(function(b){
    b.addEventListener("click", function(){ go(b.getAttribute("data-go")); });
  });

  // ── export / copy ───────────────────────────────────────────────────────
  function summaryFor(n){
    var p=document.getElementById("bagian-"+n); if(!p) return "";
    var lines=["Hasil peninjauan — bagian "+n, ""];
    p.querySelectorAll(".feeling").forEach(function(f){
      var name=f.querySelector("h3").textContent;
      var rows=[];
      f.querySelectorAll(".verse").forEach(function(v){
        var ref=v.getAttribute("data-ref"), c=store["choice:"+ref]||"", note=store["note:"+ref]||"";
        if(!c && !note) return;
        rows.push("  QS "+ref+" — "+(LABEL[c]||"belum dijawab")+(note?("\\n    catatan: "+note):""));
      });
      if(rows.length){ lines.push(name+":"); lines.push(rows.join("\\n")); lines.push(""); }
      var usul=store["note:usulan:"+name];
      if(usul){ lines.push("  usulan ayat lain: "+usul); lines.push(""); }
    });
    lines.push("Mohon dicek apakah sudah sesuai dengan yang Ustadz maksud. Kalau sudah pas, mohon dibalas \\u201cbetul\\u201d.");
    return lines.join("\\n");
  }
  document.querySelectorAll("[data-copy]").forEach(function(b){
    b.addEventListener("click", function(){
      var txt=summaryFor(b.getAttribute("data-copy"));
      navigator.clipboard.writeText(txt).then(function(){ toast("Ringkasan disalin — tempel ke WhatsApp"); },
        function(){ toast("Gagal menyalin"); });
    });
  });
  document.getElementById("export").addEventListener("click", function(){
    var blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"});
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="peninjauan-ustadz.json"; a.click(); URL.revokeObjectURL(a.href);
    toast("Jawaban diunduh");
  });
  document.getElementById("print").addEventListener("click", function(){ window.print(); });
  document.getElementById("theme").addEventListener("click", function(){
    var cur=document.documentElement.getAttribute("data-theme");
    var next = cur==="dark" ? "light" : cur==="light" ? "dark"
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", next); store.theme=next; save();
  });
  if(store.theme) document.documentElement.setAttribute("data-theme", store.theme);

  var start = (location.hash.match(/bagian-(\\d+)/)||[])[1] || store.last || "1";
  go(start); paint();
})();
</script>
</body>
</html>`;
}
