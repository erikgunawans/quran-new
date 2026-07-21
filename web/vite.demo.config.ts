import { existsSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/**
 * ISOLATED demo build — the QuranKu clone + Tanya feature.
 *
 * This config is used ONLY when passed explicitly (`--config web/vite.demo.config.ts`). The
 * default prod build (`vite build web`, no config) never loads it, so the live New-Quranku
 * build output is completely unaffected. root stays `web` so `/corpus.json` and the shard
 * `public/` dir resolve exactly as they do in dev. Output goes to its own `dist-demo/`.
 */

/**
 * Because the entry HTML lives at `web/demo/index.html` and `root` stays `web`, Vite emits it
 * to `dist-demo/demo/index.html` (mirroring the source path). All asset/data refs are absolute
 * (`/assets/…`, `/corpus.json`) and routing is hash-based, so flattening the HTML to the outDir
 * root lets the deployed subdomain serve the app at `/` instead of `/demo/`. Assets are untouched.
 */
function flattenDemoHtml(): Plugin {
  const nested = fileURLToPath(new URL("./dist-demo/demo/index.html", import.meta.url));
  const root = fileURLToPath(new URL("./dist-demo/index.html", import.meta.url));
  const nestedDir = fileURLToPath(new URL("./dist-demo/demo", import.meta.url));
  return {
    name: "flatten-demo-html",
    closeBundle() {
      if (existsSync(nested)) {
        renameSync(nested, root);
        rmdirSync(nestedDir);
      }
    },
  };
}

/**
 * Wrangler serves everything under the assets directory (`dist-demo/`) verbatim, so an OS-generated
 * `.DS_Store` would otherwise ship as a public static asset. Emit a `.assetsignore` (gitignore syntax)
 * into the outDir on every build so wrangler skips those files. Written here rather than committed as a
 * static file because `emptyOutDir` wipes `dist-demo/` on each build.
 */
function emitAssetsIgnore(): Plugin {
  const target = fileURLToPath(new URL("./dist-demo/.assetsignore", import.meta.url));
  return {
    name: "emit-assetsignore",
    closeBundle() {
      writeFileSync(target, ".DS_Store\n**/.DS_Store\nThumbs.db\n");
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [flattenDemoHtml(), emitAssetsIgnore()],
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./demo/index.html", import.meta.url)),
    },
  },
});
