# Peta Tematik — ayah graph

The thematic map of the Qur'an as a graph: **every ayah is a node, and the ayahs cited under
more than one theme are the edges between themes.** Built 2026-08-04 from Ustadz Muhammad
Thalib's Indeks Tematik.

If you want to reuse this in another app, this file is the contract. Say
*"the Peta Tematik graph"* to Claude and it should land here.

---

## What it is

Three tiers, `ayah → subtopik → kategori`:

| | Count |
|---|---:|
| Ayah nodes (resolvable) | 1628 |
| — cited under exactly 1 category | 1110 |
| — **cited under 2+ categories (the connectors)** | **518** |
| Subtopic nodes | 37 |
| Category nodes | 13 |
| Ayah→topic citations | 2501 |
| Max categories one ayah bridges | 6 (QS 33:33 and QS 2:185) |

The 518 connectors are the point of the whole thing. They are Ustadz Thalib's own curation —
not inferred, not computed by similarity. They reconcile exactly with `bridges: 518` in
`web/public/peta/index.json`.

## Artifacts

| Path | What |
|---|---|
| `.planning/graphs/graph-ayah.json` | **The data contract.** 2.5 MB, `{nodes, edges, meta}` |
| `.planning/graphs/peta-tematik-explorer.html` | Standalone explorer, 0.71 MB, no server/network needed |
| `graphify-out/` | Same files, working copy |

## Data contract

```jsonc
{
  "meta": { "ayahs": 1628, "subtopics": 37, "categories": 13, "citations": 2501,
            "connectors": 518, "max_span": 6, "unresolvable": 4, "source": "…" },
  "nodes": [{
    "id": "ayah::33:33",          // "ayah::S:A" | "cat::<slug>" | "sub::<slug>::<subtopic>"
    "label": "QS 33:33",
    "kind": "ayah",               // ayah | subtopic | category
    "span": 6,                    // ayah only: how many CATEGORIES it appears in — the key field
    "color": "#f0c851",
    "detail": {
      "Ayat": "QS 33:33 — Al-Ahzaab",
      "Arab": "…",                                            // text_uthmani, verbatim
      "Tarjamah Tafsiriyah (Ustadz Muhammad Thalib)": "…",     // display_role: primary
      "Terjemah Kemenag": "…",                                // display_role: companion
      "Muncul di": "6 kategori, 6 subtopik",
      "Entri 1 · Ibadah › Zakat dan Shadaqah": "…"            // one per citing entry
    }
  }],
  "edges": [{ "from": "…", "to": "…", "kind": "cited_in" }]   // cited_in | in_category
}
```

`span` is the field worth building on — it is the bridging strength, and it drives both node
size and the colour ramp.

## Source chain

```
web/public/peta/*.json          15 shards — categories, subtopics, entries, refs, bridges
  + data/canonical/ayahs.json         text_uthmani
  + data/canonical/translations.json  Thalib (primary) + Kemenag (companion)
  + data/canonical/surahs.json        name_translit, revelation_type
  → graph-ayah.json
```

`data/` is **not** in worktrees — it lives only in the primary checkout
(`~/quran-new/data/`). See [[worktree-data-symlink]].

## Invariants — assert these after any rebuild

- 1628 resolvable + 4 unresolvable = **1632**, matching `index.json.verses`
- connectors (span ≥ 2) = **518** = `index.json.bridges`
- span distribution: `{1:1110, 2:360, 3:110, 4:36, 5:10, 6:2}`
- categories 13, named subtopics 37, citations 2501
- zero ayah nodes missing Arabic or the Thalib translation
- every `Arab` value is a byte-exact substring of `ayahs.json`

## Traps — all of these cost real time once

1. **Five categories are flat.** `allah-subhanahu-wa-ta-ala`, `keluarga`,
   `muhammad-shallallahu-alaihi-wasallam`, `prinsip-prinsip-pendidikan-islam`, `sosial` have a
   single subtopic whose name is `null` (736 entries). Attach those ayahs to the **category**
   node — do not create a `None` subtopic. That is why it is 37 named subtopics, not 42.
2. **Never retype Arabic.** Splice bytes from `ayahs.json`; verify with exact `includes()`.
   See [[arabic-normalization-hazard]].
3. **Never assemble a partial verse.** Cutting an ayah changes its meaning and the project has
   a review process (`docs/review/fragment-review.md`) that exists to prevent exactly that.
4. **12 corpus records contain `U+FFFD`** — all in Thalib's translation, Arabic is clean.
   Affects QS 2:197, 4:59, 6:151, 7:46-48, 7:175, 19:19, 21:96, 23:28, 46:35, 81:26.
   Restored in the explorer only; `data/canonical` is untouched and still corrupted.
5. **Graphify cannot ingest this.** `.json`/`.csv`/`.html` are in none of its extension sets,
   so the shards are invisible to it. Build the graph directly. See [[graphify-coverage-limits]].

## Reproducing it

**The build scripts are gone** — they were written into a session scratchpad that was cleared.
`graph-ayah.json` still exists and is correct, but is currently a build artifact with no
builder. Rewriting it as a committed TypeScript script under `src/app/` (alongside
`build-peta.ts`) is the outstanding task before anyone depends on it.

## Explorer notes

Standalone, 0.71 MB: gzip+base64 payload inflated via `DecompressionStream`, Amiri subset to
the 65 Arabic codepoints actually used, custom batched canvas renderer (no vis-network),
precomputed layout so there is no stabilisation wait.

**Perf trap:** the Interceptor Chrome extension wraps `beginPath`/`fill`/`stroke` to record
canvas commands. That makes canvas ~1300× slower and looks exactly like a broken app. Measured:
a 2538-segment stroke costs 432 ms with the extension active, **0.33 ms** natively in a Worker.
Test rendering performance in a window without it.
