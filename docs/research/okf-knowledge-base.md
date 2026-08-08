# The OKF Knowledge Base — What We Have Built

**As of 2026-08-09** · Location: `~/printing-press/library/tafseer-okf/`
Companion document: [`islamic-corpus-sourcing.md`](./islamic-corpus-sourcing.md) (where the material may come from and under what rights)

---

## 1. In one paragraph

18,882 plain-Markdown records, 183 MB, covering Qurʾānic tafsīr in three languages, the ʿaqīdah
encyclopedia, and the complete Ṣaḥīḥayn. Every record is a self-describing file: YAML frontmatter
carrying identity, provenance, and a machine-enforceable rights gate, followed by human-readable
body text under stable Arabic section headings. No database, no proprietary container, no build step
required to read one. `git`-diffable, `grep`-able, and readable in any text editor a thousand years
from now — which is the point.

---

## 2. The shape on disk

```
tafseer-okf/
├── okf/                          183 MB · 18,882 records
│   ├── tafseer/
│   │   ├── ar/    1,345 files    69 MB   ← 114 surah dirs · 1,231 ayah-range records + 114 prefaces
│   │   ├── en/    1,344 files   7.2 MB   ← Dorar's own English edition
│   │   └── id/        2 files    20 KB   ← Al-Fātiḥah only; AI-assisted, UNREVIEWED
│   ├── aqeeda/
│   │   └── ar/    1,454 files    20 MB   ← 50 book dirs, 4-level كتاب›باب›فصل›مبحث tree
│   └── hadith/
│       ├── bukhari/ 7,277 files  43 MB   ← 97 kitāb dirs
│       ├── muslim/  7,459 files  45 MB   ← 57 kitāb dirs
│       ├── _index.md                     ← cross-collection topical index (derived)
│       └── topics.json                   ← same, machine-readable
├── tool/                                 ← Bun/TypeScript builders + Go crawler
├── cache/         801 MB                 ← raw fetched HTML; never shipped, reproducibility only
└── manifest*.json                        ← crawl manifests per edition
```

Paths are the primary key. `okf/tafseer/ar/104/001-009.md` *is* Sūrat al-Humazah, āyāt 1–9, Arabic
edition — no lookup table needed, and no ambiguity about what a file contains.

---

## 3. What one record looks like

Every record is `---` frontmatter, then Markdown. Nothing else.

```yaml
---
id: dorar-tafseer-104-1-9
surah: 104
surah_name: الهُمَزَةِ
ayah_start: 1
ayah_end: 9
source: "موسوعة التفسير — الدرر السنية"
source_url: https://dorar.net/tafseer/104/1
supervisor: "علوي بن عبد القادر السقاف"
language: ar
content_type: tafsir
retrieved_at: 2026-08-05
license: "© Dorar Al-Saniyyah — private research use"
rights:
  usage: reference-only
  holder: "Dorar Al-Saniyyah"
  basis: "no licence published; modern compilation, © Dorar Al-Saniyyah"
  commercial: prohibited
  share_alike: false
  attribution: "موسوعة الدرر السنية (dorar.net), with a link to the source entry"
  layers:
    - name: quran_text
      usage: distributable
      holder: "—"
      basis: "no copyright subsists (kitab suci, UU 28/2014 Pasal 42); spliced byte-for-byte
               from our own canonical corpus, not taken from Dorar"
    - name: commentary
      usage: reference-only
      holder: "Dorar Al-Saniyyah (موسوعة الدرر السنية)"
      basis: "modern authored compilation, no licence published; per-entry quotation with full
               attribution is a defensible reading of UU 28/2014 Pasal 44, bundling the corpus
               is not — JUDGEMENT CALL, confirm with counsel"
  clearance_path: "Written permission from Dorar Al-Saniyyah…"
  reviewed_at: 2026-08-08
---

# سورة الهُمَزَةِ — الآيات 1–9

## الآيات
<!-- Uthmani text spliced byte-for-byte from data/canonical/ayahs.json (not Dorar). -->
بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَيْلٌ لِّكُلِّ هُمَزَةٍ لُّمَزَةٍ ﴿1﴾ …

## غريب الكلمات
## المعنى الإجمالي
## تفسير الآيات
## الفوائد التربوية
## الفوائد العلمية واللطائف
## بلاغة الآيات
## المراجع
```

Three things in that record are worth naming, because they are the design.

**`license:` and `rights:` are different things and must never be merged.** `license:` records what
the source said at `retrieved_at` — it is evidence. `rights:` is *our determination* on top of that
evidence. Collapsing them would destroy the ability to re-audit a determination without re-crawling.

**The rights block is per-layer.** This one record contains material with two different rights
states: the Qurʾān text (no copyright at all — `kitab suci`, UU 28/2014 Pasal 42, and spliced from
our own canonical corpus rather than taken from Dorar) sitting directly above Dorar's commentary
(a modern compilation, fully protected). A single verdict per record would force us to either
over-block text we may ship or under-block text we may not. `rights.usage` is always the **most
restrictive layer** — the safe gate — while the layers stay visible so a future re-source can unlock
the free parts without a re-crawl.

**The section headings are the source's own.** `غريب الكلمات`, `الفوائد التربوية`, `بلاغة الآيات` —
these are Dorar's editorial structure, preserved verbatim, not a taxonomy we imposed. That is what
makes the corpus queryable by section without us having invented the sections.

---

## 4. Coverage, honestly

| Branch | Records | Covers | Gaps |
|---|---:|---|---|
| **tafsīr — Arabic** | 1,345 | All 114 surahs · 1,231 āyah-range entries + 114 surah prefaces | Complete for this edition |
| **tafsīr — English** | 1,344 | Dorar's own English edition | 1 record short of the Arabic; not investigated |
| **tafsīr — Indonesian** | **2** | Al-Fātiḥah only | **The market language. Effectively zero.** AI-assisted and **unreviewed** — must not ship |
| **ʿaqīdah — Arabic** | 1,454 | 50 books, 4-level كتاب›باب›فصل›مبحث tree | Arabic only. Single school (see §6) |
| **ḥadīth — Bukhārī** | 7,277 | 97 kitāb, Arabic + English | — |
| **ḥadīth — Muslim** | 7,459 | 57 kitāb, Arabic + English | — |
| **Total** | **18,882** | | |

**What is entirely absent:** the other four of the Kutub al-Sittah (Abū Dāwūd, Tirmidhī, Nasāʾī, Ibn
Mājah), Muwaṭṭaʾ, Musnad Aḥmad, **fiqh in any madhhab**, uṣūl al-fiqh, sīrah, Arabic lexicons, asbāb
al-nuzūl, qirāʾāt, and any fatwā corpus. An app that intends to answer on "every aspect of Islam"
currently holds tafsīr, creed, and two ḥadīth collections — and no jurisprudence at all.

---

## 5. The rights gate — and the number that matters

The `rights:` block is not documentation. `tool/rights-audit.ts` enforces four invariants and
**exits non-zero**, so it can gate a build:

1. Every record carries a `rights:` block — unreviewed material never reaches an index by default
2. `usage` is one of four known tiers — an unknown tier is one `if` away from being treated as permissive
3. **`usage` is never laxer than the worst layer** — the invariant a well-meaning hand-edit breaks
4. Anything not `distributable` names a `clearance_path` — an audit that only says no is a dead end

The tiers are about **distribution scale**, not commerce, because this is a non-commercial work:

| Tier | Meaning |
|---|---|
| `distributable` | may ship publicly, subject to `attribution` |
| `reference-only` | may be retrieved and **quoted per entry** with attribution and a link; **not** bulk-reproduced as a corpus, **not** trained on |
| `research-only` | may inform and evaluate our work; never ships |
| `private` | stays on this machine |

Current state:

```
RIGHTS AUDIT — okf/
  records            : 18,882
  gate distribution  :
    reference-only     18,879
    private                 3
  rights holders     :
     14,736  sunnah.com (compilation); Darussalam and named translators (English)
      4,143  Dorar Al-Saniyyah
          2  Dorar Al-Saniyyah + Ustadz Muhammad Thalib
          1  sunnah.com (compilation)

  DISTRIBUTABLE AS-IS: 0 / 18,882
  ✓ all invariants hold
```

**Read that last line plainly: nothing in this corpus may currently be shipped as a bundle.**

`reference-only` is not a failure state, though — it is precisely what a dakwah app needs. sunnah.com
§8 expressly permits *"reproducing individual hadith or selections of hadith for a
teaching/didactic/presentation purpose"*. So the app **may** look a ḥadīth up and display it with
credit and a link. It **may not** ship the 14,736-record dump, and it may not train on it. The tier
encodes that distinction; a boolean could not.

The three clearance paths that would move the whole corpus:

| Records | Action |
|---:|---|
| 14,737 | Request the API key / offline dump from **sunnah.com** (GitHub issue; docs at `sunnah.stoplight.io/docs/api/`) |
| 4,143 | Written permission from **Dorar Al-Saniyyah** — no contact terms published; outreach with an unknown answer |
| 2 | Permission from **both** Dorar and Ustadz Thalib, **and** scholarly review before display |

---

## 6. The structural weakness, stated plainly

**Every record in this KB comes from one publisher with one manhaj.** 4,143 records are Dorar
Al-Saniyyah — a contemporary Saudi project, explicitly Salafi, whose *Mawsūʿat al-ʿAqīdah* is
structured as an orthodoxy-versus-deviant-sects taxonomy. The remaining 14,736 are Ṣaḥīḥayn via
sunnah.com, which is manhaj-neutral in content but arrives through Darussalam's translation pipeline.

Indonesia is overwhelmingly **Shāfiʿī in fiqh and Ashʿarī/Māturīdī in creed**. A knowledge base whose
entire ʿaqīdah shelf comes from one school's encyclopedia, presented as "Islam", is a sourcing
problem before it is a content problem — and free, wide distribution makes it more consequential,
not less.

Two schema additions are required **before** the next ingestion, not after:

- **`grader:` / `grading_source:` on ḥadīth.** All 14,736 current records carry `grade: sahih` with
  zero grader attribution — which is fine, because Ṣaḥīḥayn gradings are agreed across every school,
  and sunnah.com only adds grades for collections *outside* the Ṣaḥīḥayn. The exposure begins exactly
  when the four Sunan are added: those arrive carrying al-Albānī's and Zubair ʿAlī Zaʾī's
  **contested** verdicts, with no field to hold the attribution.
- **`madhhab:` / `manhaj:` on any ruling.** Nobody in this space labels — not IslamWeb, not Dār
  al-Iftāʾ, not Ansari, the leading open Islamic AI. It is simultaneously the honest build and the
  only unclaimed differentiator.

---

## 7. Why this format, and not a database

- **Durability.** A Markdown file with YAML frontmatter needs no runtime to read. The `.bok` and
  `.mdb` containers that held Islamic corpora twenty years ago now need archaeology.
- **Auditability.** Provenance travels *inside* the record. You can hold one file in your hand and
  answer where it came from, when, under what terms, and what our determination was — without a
  database, a join, or trust in a separate manifest.
- **Diffability.** Re-crawls produce reviewable diffs. A corpus that silently mutates is a corpus you
  cannot vouch for.
- **Plain-Unicode discipline.** ʿaqīdah prose is stored as plain Arabic — no QCF glyph font, no
  Private Use Area codepoints. Qurʾānic text is spliced byte-for-byte from our own canonical corpus
  and marked as such in the body, so the scripture in this KB is never the source's transcription of
  scripture.

---

## 8. The tools

| Command | Does |
|---|---|
| `bun run build` | Dorar tafsīr → OKF |
| `bun run aqeeda:manifest \| :crawl \| :build` | ʿaqīdah pipeline (manifest → Go crawler → OKF) |
| `bun run hadith:crawl-sunnah \| :babmap \| :build \| :index` | ḥadīth pipeline |
| `bun run hadith:coverage` | coverage gate — manifest vs cache vs built |
| `bun run rights:migrate` | dry-run the rights gate |
| `bun run rights:apply` | write rights blocks (`--force` re-derives) |
| `bun run rights:audit` | **enforce the four invariants; non-zero on violation** |

The Go crawler exists for one reason: it is the only client that reliably clears Dorar's Cloudflare
challenge. Everything downstream of fetching is Bun/TypeScript.

---

## 9. Honest limits of this document

- The 1-record discrepancy between Arabic (1,345) and English (1,344) tafsīr is unexplained.
- `cache/` is 801 MB of raw HTML retained for reproducibility. It is not part of the KB and carries
  the same rights as the records derived from it.
- `tafseer-okf` **is not a git repository**. There is no version history and no undo beyond re-running
  the builders. Given that the rights migration just rewrote all 18,882 records, this is the largest
  operational risk in the project right now.
