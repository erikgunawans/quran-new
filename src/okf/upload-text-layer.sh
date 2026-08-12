#!/usr/bin/env bash
# Upload the OKF text layer to the PRIVATE `okf-corpus` R2 bucket.
#
# Separate from build-text-layer.ts on purpose: building is pure and repeatable, uploading touches a
# remote bucket. Keys are namespaced by corpus_digest so a text layer can never be silently paired
# with an index built from a different corpus revision.
#
#   bun run okf:text            # build artifacts first
#   bash src/okf/upload-text-layer.sh
#
# NO `--remote` ON THE PUT CALLS. It is a wrangler **v4** flag; this repo pins v3.114, where it is a
# hard `Unknown argument: remote` error — and because every put redirects to /dev/null, the failure
# surfaces only as a generic "Logs were written to…" line, so the run looks like it worked. On v3
# remote IS the default and `--local` is the opt-in, so dropping the flag changes nothing about
# WHERE the object lands. Measured 2026-08-12 during the audio ingest, which hit the same trap.
set -euo pipefail

DIGEST=$(bun -e 'console.log(JSON.parse(require("fs").readFileSync("data/okf/text/text-layer.json","utf8")).corpus_digest.slice(0,16))')
PREFIX="text/${DIGEST}"
echo "uploading to okf-corpus/${PREFIX}/"

bunx wrangler r2 object put "okf-corpus/${PREFIX}/rerank-en.json.gz" \
  --file=data/okf/text/rerank-en.json.gz \
  --content-type=application/gzip --content-encoding=gzip >/dev/null
echo "  rerank blob ✓"

n=0
total=$(find data/okf/text/display -name '*.json' | wc -l | tr -d ' ')
while IFS= read -r f; do
  rel="${f#data/okf/text/display/}"
  bunx wrangler r2 object put "okf-corpus/${PREFIX}/display/${rel}" \
    --file="$f" --content-type=application/json >/dev/null
  n=$((n+1))
  printf '\r  display shards: %d/%d ' "$n" "$total"
done < <(find data/okf/text/display -name '*.json' | sort)
echo ""
echo "done — ${total} shards + 1 rerank blob under ${PREFIX}/"
