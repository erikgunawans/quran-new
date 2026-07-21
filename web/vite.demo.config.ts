import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * ISOLATED demo build — the QuranKu clone + Tanya feature.
 *
 * This config is used ONLY when passed explicitly (`--config web/vite.demo.config.ts`). The
 * default prod build (`vite build web`, no config) never loads it, so the live New-Quranku
 * build output is completely unaffected. root stays `web` so `/corpus.json` and the shard
 * `public/` dir resolve exactly as they do in dev. Output goes to its own `dist-demo/`.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./demo/index.html", import.meta.url)),
    },
  },
});
