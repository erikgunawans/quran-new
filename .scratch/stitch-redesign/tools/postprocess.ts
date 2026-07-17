#!/usr/bin/env bun
/**
 * Deterministic post-processing for Stitch-generated frames. Stitch complies with the font tag /
 * md:hidden rules only ~60% per generation, so enforce them in post (per redesign memory):
 *   1. Rewrite any googleapis css2 <link> to the exact tested tag (+ ensure preconnect).
 *   2. Fraunces → Poppins  (Fraunces only ever appears as a font name).
 *   3. "Plus Jakarta Sans" → Inter  (the FONT — never bare "Jakarta", which is the city in content).
 *   4. Strip page-hiding md:hidden from <body> and the outermost wrapper (self-check 13b).
 * Returns a report of what changed. Idempotent.
 *
 * Usage: bun postprocess.ts <file.html> [<file2.html> ...]
 */
const PRECONNECT = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
const FONT_LINK = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@600;700;800&family=Inter:wght@400..600&display=swap">`;

export function postprocess(html: string): { html: string; changes: string[] } {
  const changes: string[] = [];
  let out = html;

  // 1. Font <link> — replace any googleapis css2 stylesheet link with the tested one.
  const cssLink = /<link\b[^>]*fonts\.googleapis\.com\/css2[^>]*>/gi;
  const matches = out.match(cssLink);
  if (matches) {
    // keep the first, drop the rest, normalise to the tested tag
    let seen = false;
    out = out.replace(cssLink, () => {
      if (seen) return "";
      seen = true;
      return FONT_LINK;
    });
    if (!/rel=["']preconnect["'][^>]*fonts\.gstatic/i.test(out)) {
      out = out.replace(FONT_LINK, `${PRECONNECT}\n    ${FONT_LINK}`);
    }
    if (matches.length !== 1 || matches[0] !== FONT_LINK) changes.push(`font-link normalised (${matches.length} found)`);
  } else if (!/fonts\.googleapis\.com/i.test(out)) {
    // no font link at all — inject into <head>
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n    ${PRECONNECT}\n    ${FONT_LINK}`);
    changes.push("font-link injected (was missing)");
  }

  // 2. Fraunces → Poppins
  if (/Fraunces/i.test(out)) {
    out = out.replace(/Fraunces/gi, "Poppins");
    changes.push("Fraunces → Poppins");
  }

  // 3. "Plus Jakarta Sans" → Inter (all separator variants; NOT bare "Jakarta")
  if (/Plus[\s_]?Jakarta[\s_]?Sans/i.test(out)) {
    out = out.replace(/Plus[\s_]?Jakarta[\s_]?Sans/gi, "Inter");
    changes.push('"Plus Jakarta Sans" → Inter');
  }

  // 3b. Every RTL (Arabic) element must also carry lang="ar" (self-check 17). Stitch is only ~60%
  // compliant; enforce it deterministically like the font tag.
  let langAdded = 0;
  out = out.replace(/<[a-z][^>]*\bdir=["']rtl["'][^>]*>/gi, (tag) => {
    if (/\blang=/i.test(tag)) return tag;
    langAdded++;
    return tag.replace(/\bdir=(["'])rtl\1/i, `dir="rtl" lang="ar"`);
  });
  if (langAdded) changes.push(`lang="ar" added to ${langAdded} rtl element(s)`);

  // 4. Strip page-hiding md:hidden from <body> and a top wrapper.
  out = out.replace(/<body\b[^>]*>/i, (tag) => {
    let t = tag;
    if (/\bmd:hidden\b/.test(t)) { t = t.replace(/\s*\bmd:hidden\b/g, ""); changes.push("body md:hidden stripped"); }
    if (/\bhidden\b/.test(t) && /\bmd:(block|flex|grid)\b/.test(t)) {
      t = t.replace(/\s*\bhidden\b/g, ""); changes.push("body 'hidden md:*' stripped");
    }
    return t;
  });
  // Outermost wrapper: first element after <body> carrying md:hidden that plausibly wraps the page.
  out = out.replace(/(<body\b[^>]*>\s*<(?:div|main|section)\b[^>]*class=["'][^"']*)\bmd:hidden\b/i, (_m, pre) => {
    changes.push("top-wrapper md:hidden stripped");
    return pre;
  });

  return { html: out, changes };
}

if (import.meta.main) {
  for (const path of process.argv.slice(2)) {
    const html = await Bun.file(path).text();
    const { html: fixed, changes } = postprocess(html);
    if (fixed !== html) await Bun.write(path, fixed);
    console.log(`${path}: ${changes.length ? changes.join("; ") : "no change (clean)"}`);
  }
}
