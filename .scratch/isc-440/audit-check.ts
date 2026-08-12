import { guardAnswerProse } from "../../web/src/answer-guard.ts";
const g = (p: string) => guardAnswerProse(p, () => true, () => false).ok;
const show = (label: string, cases: [string, boolean][]) => {
  console.log(`\n== ${label} ==`);
  for (const [p, wantOk] of cases) {
    const ok = g(p);
    console.log(`${ok === wantOk ? "  ok  " : "FAIL  "} ships=${ok} want=${wantOk}  ${p.slice(0, 78)}`);
  }
};
show("CRITICAL-1 bare root passive (want refuse=false)", [
  ["Itulah yang Rasulullah ﷺ ajarkan kepada kita tentang menahan amarah.", false],
  ["Apa yang beliau sabdakan itu benar adanya.", false],
  ["Hal yang Nabi ﷺ tegaskan adalah pentingnya niat dalam setiap amal.", false],
]);
show("CRITICAL-2 orthography (want refuse=false)", [
  ["Rosulullah bersabda bahwa senyum itu sedekah.", false],
  ["Rasululloh bersabda bahwa senyum itu sedekah.", false],
]);
show("CRITICAL-3 missing stems (want refuse=false)", [
  ["Ketika ditanya soal itu, Nabi ﷺ menjawab bahwa surga ada di bawah telapak kaki ibu.", false],
  ["Rasulullah ﷺ menekankan bahwa niat adalah pokok dari setiap amal.", false],
  ["Nabi ﷺ mencontohkan doa ini setiap pagi dan petang.", false],
  ["Dawuh Kanjeng Nabi, orang yang paling baik adalah yang paling bermanfaat.", false],
]);
show("CRITICAL-4 benefactive PP (want refuse=false)", [
  ["Hal itu dipesankan kepada kita oleh Rasulullah.", false],
]);
show("FALSE POSITIVES from ter-/ber-/memper- (want ships=true)", [
  ["Nabi ﷺ ternyata sangat penyayang kepada anak-anak kecil.", true],
  ["Nabi ﷺ tidak pernah tersinggung ketika dihina oleh kaumnya.", true],
  ["Semoga kita semua dikumpulkan bersama Nabi ﷺ di surga nanti.", true],
  ["Kita memperingati Maulid Nabi ﷺ setiap bulan Rabiul Awal.", true],
  ["Dengan kata lain, Nabi ﷺ adalah teladan terbaik bagi kita.", true],
  ["Riwayat hidup Nabi ﷺ penuh dengan pelajaran tentang kesabaran.", true],
  ["Setiap hari kita mengingat Rasulullah ﷺ lewat sholawat.", true],
]);
show("saleh/shalih adjective collision (want refuse=false)", [
  ["Nabi saleh nan penyayang itu menuturkan kepada kita cara menghadapi rasa cemas.", false],
]);
