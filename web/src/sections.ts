/**
 * Hadis & Fikih — the two new browse sections.
 *
 * These render honest PLACEHOLDER surfaces on purpose. New-Quranku's rule is that it displays other
 * people's scholarship verbatim and never authors religious content, so a hadith or fiqh corpus may
 * only go live once its SOURCE and LICENSING are settled and a scholar has signed off (see the
 * content-pillars + "displaying others' scholarship" notes). Until then these pages state plainly
 * what is coming rather than shipping unreviewed text. The nav entries + routes exist now so the
 * information architecture is in place; wiring real data is a later, gated step.
 *
 * Presentation only — nothing here touches the answer engine.
 */

interface Stub {
  title: string;
  sub: string;
  lead: string;
  plans: string[];
  note: string;
}

const stub = (s: Stub): string => `
  <div class="read-index section-stub">
    <header class="tematik-head">
      <div class="tematik-head-l">
        <h1 class="qk-hero-gradient tematik-title">${s.title}</h1>
        <p class="tematik-sub">${s.sub}</p>
      </div>
      <div class="tematik-head-r">
        <a class="tematik-back" href="#/">Kembali</a>
      </div>
    </header>

    <div class="stub-card" role="note">
      <span class="stub-badge">Dalam penyusunan</span>
      <p class="stub-lead">${s.lead}</p>
      <ul class="stub-plans">
        ${s.plans.map((p) => `<li>${p}</li>`).join("")}
      </ul>
      <p class="stub-note">${s.note}</p>
    </div>
  </div>`;

export function renderHadis(mount: HTMLElement): void {
  mount.innerHTML = stub({
    title: "Hadis",
    sub: "Sabda dan teladan Nabi ﷺ — dengan sumber dan derajatnya.",
    lead: "Bagian Hadis sedang kami siapkan. Tujuannya menampilkan hadis apa adanya dari sumbernya, lengkap dengan perawi dan derajat keshahihannya — bukan tafsiran kami.",
    plans: [
      "Telusuri hadis dari kitab-kitab induk (mis. Ṣaḥīḥ al-Bukhārī & Ṣaḥīḥ Muslim).",
      "Setiap hadis membawa sumber, nomor, dan derajatnya (shahih, hasan, dan seterusnya).",
      "Tautan ke ayat dan tema terkait, agar Al-Qur'an dan Sunnah terbaca berdampingan.",
    ],
    note: "Kami menampilkan karya ulama apa adanya dan tidak mengarang isi agama. Bagian ini baru terbit setelah sumbernya jelas dan ditinjau oleh ustadz yang menaunginya.",
  });
}

export function renderFikih(mount: HTMLElement): void {
  mount.innerHTML = stub({
    title: "Fikih",
    sub: "Hukum-hukum amal ibadah dan muamalah — beserta dalilnya.",
    lead: "Bagian Fikih sedang kami siapkan. Tujuannya menampilkan pembahasan fikih dari rujukan yang tepercaya, dengan dalil dari Al-Qur'an dan Sunnah — bukan pendapat kami.",
    plans: [
      "Telusuri topik fikih: thaharah, salat, puasa, zakat, muamalah, dan lainnya.",
      "Setiap pembahasan membawa dalil dan rujukannya, bukan kesimpulan tanpa sumber.",
      "Tautan ke ayat dan hadis terkait agar mudah ditelusuri sampai ke asalnya.",
    ],
    note: "Kami menampilkan karya ulama apa adanya dan tidak berfatwa. Bagian ini baru terbit setelah sumbernya jelas dan ditinjau oleh ustadz yang menaunginya.",
  });
}
