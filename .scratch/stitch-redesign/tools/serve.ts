#!/usr/bin/env bun
// Tiny static server for the redesign contact sheet. bun serve.ts [port]
const DIR = "/Users/erikgunawansupriatna/quran-new/.scratch/stitch-redesign";
const port = Number(process.argv[2] ?? 8899);
Bun.serve({
  port,
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === "/") p = "/index.html";
    const file = Bun.file(DIR + decodeURIComponent(p));
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
  },
});
console.log(`serving ${DIR} at http://localhost:${port}`);
