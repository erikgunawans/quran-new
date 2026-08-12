import { guardAnswerProse } from "../../web/src/answer-guard.ts";
const read = (f: string) => Bun.file(f).text();
const allow = () => (_r: string) => true;   // widest: isolate the hadith rule only
const grounded = () => (_i: string) => false;
const run = async (file: string, wantOk: boolean) => {
  const lines = (await read(file)).split("\n").filter((l) => l.trim());
  const wrong = lines.filter((l) => guardAnswerProse(l, allow(), grounded()).ok !== wantOk);
  console.log(`${file}: ${lines.length - wrong.length}/${lines.length} correct`);
  for (const w of wrong) console.log(`   MISS: ${w}`);
};
await run(".scratch/isc-440/corpus-a.txt", false);
await run(".scratch/isc-440/corpus-b.txt", true);
