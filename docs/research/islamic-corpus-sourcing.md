# Islamic Knowledge Corpus — Source Map, Rights, and Ingestion Policy

**Filed:** 2026-08-08 · **Revised:** 2026-08-08 (project confirmed **non-commercial**)
**Status:** research complete on three of four branches; open items in §7
**Purpose:** decide what may be ingested into the OKF knowledge base, under what rights, for a
**non-commercial, publicly distributed** dakwah application.

> **The one-line result.** The binding axis is **distribution, not commerce**. Being free does not
> cure a prohibition on reproduction, an `ai-train=no` signal, or an absent licence — none of those
> have a commercial qualifier. What being non-commercial *does* unlock is the CC BY-NC-SA tier,
> which includes OpenITI, the only deliberately-licensed scholarly corpus in this landscape. The
> viable architecture remains **retrieve-and-cite with a per-record rights gate**, not corpus
> ingestion.

## 0. What the non-commercial decision changes — and what it does not

**Unlocked.** **OpenITI / KITAB** (CC BY-NC-SA 4.0) — ~6,785 unique titles, 2,843 authors, ~750M
words, latest release 2025.1.9. The NonCommercial term was the only bar. **Caveat that travels
forever:** ShareAlike is viral — anything adapting OpenITI must itself be released CC BY-NC-SA 4.0.
That is permanent and forecloses commercialising later.

**Unchanged.** Every one of these lacks a commercial qualifier, so free distribution does not widen
them:

| Constraint | Why non-commercial does not cure it |
|---|---|
| sunnah.com About §8 | *"We do not permit the scraping of our data, nor mass reproduction of entire books or collections."* No commercial qualifier. |
| Shamela / NU / Muhammadiyah `ai-train=no` | Content Signals have no commercial axis. |
| Dorar — no licence published | Silence is the absence of a grant; not charging is not a grant either. |
| NU Munas 2023 ruling | Concerns the *nature of the act*. §4 stands untouched. |

**Made worse.** The manhaj-skew risk in §5. Reach is what makes doctrinal skew consequential, and a
free, professionally packaged app reaches further than a paid one. A Salafi-weighted corpus presented
as "Islam" to a Shāfiʿī-Ashʿarī population does more harm when given away as an act of worship than
when sold. The sourcing bar goes **up**, not down.

**One line to be deliberate about.** CC NonCommercial means "not primarily directed toward commercial
advantage." An app carrying the branding of an AI company is exactly where that gets argued.

---

## 1. Why this document exists

Every record currently in `~/printing-press/library/tafseer-okf/okf/` carries a `license:` field, and
**every one of them says private research use**:

```
14,736  license: "sunnah.com data — private research use; attribution to sunnah.com …"
 4,143  license: "© Dorar Al-Saniyyah — private research use"
     2  Dorar + Thalib — riset pribadi
```

18,881 records, zero cleared for commercial use. The provenance discipline that makes this KB good is
also what documents the exposure. This document is the input to fixing that.

---

## 2. The three rights layers — the trap in this whole domain

Collapsing these is the single most common error.

| Layer | Status | Risk |
|---|---|---|
| Classical Arabic base text (author d. pre-1900) | Public domain worldwide | Low |
| **Modern critical edition** — muhaqqiq's tahqiq, apparatus, vocalization, pagination, footnotes | **Copyrighted.** Named living editors, active publishers | **High** |
| **Database compilation** — selection, arrangement, page-id scheme, TOC | **EU/UK *sui generis* database right**; thin compilation copyright in US | Medium–High |
| Modern translations | Copyrighted | High |

**Hard evidence.** `api.turath.io/book?id=1&ver=3` returns its own metadata:

```
المؤلف: حمد بن ناصر آل معمر (١١٦٠–١٢٢٥ هـ)     ← 18th c., public domain
المحقق: عبد السلام بن برجس العبد الكريم        ← living editor
الناشر: دار العاصمة، الطبعة الأولى ١٤٠٧ هـ      ← active publisher, 1987
```

Al-Ṭabarī is public domain. *Dār al-ʿĀṣima's 1987 edition of him* is not. The same applies to our
existing Dorar records: the classical material is free, Dorar's encyclopedia of it is not.

Shamela's `[ترقيم الكتاب موافق للمطبوع]` means its page numbers derive from the copyrighted print
edition — **citing page numbers reproduces protected material.**

---

## 3. Verified rights status per source

Confidence tags: [HIGH] directly observed · [MED] observed indirectly · [LOW] unverified.

### 3.1 Commercially clean — the short list

| Source | Rights | Evidence |
|---|---|---|
| **Qurʾān Arabic text — Tanzil** | *"Permission is granted to copy and distribute verbatim copies… changing the text is not allowed."* Usable in any website or application provided the Tanzil Project is credited and linked. **No commercial prohibition.** Modification forbidden. | [HIGH] `tanzil.net/download` |
| **Qurʾān Arabic text — Indonesia** | **No copyright at all.** UU 28/2014 **Pasal 42** names `kitab suci` among works with no Hak Cipta. | [HIGH] |
| **MUI fatwas** | ToS: *"Penggunaan ulang konten harus mencantumkan sumber dan tidak boleh menyesatkan konteks aslinya."* Reuse granted with attribution + faithful context. `robots.txt` **explicitly allows** GPTBot, CCBot, Google-Extended. | [HIGH] `mui.or.id/syarat-dan-ketentuan` |
| **Pengadilan Agama decisions** | Free under **Pasal 42** (`putusan pengadilan`). A fully-open Indonesian Islamic-law corpus nobody is using. | [HIGH] on the law; Direktori Putusan URL not verified |
| **DSN-MUI fatwas adopted into POJK/PBI** | Once adopted they become `peraturan perundang-undangan` → Pasal 42, no copyright *in the adopted form*. | [MED] — reasoned from statute, needs counsel |

### 3.2 Permission obtainable — the highest-value relationship

| Source | Status |
|---|---|
| **LPMQ Kemenag official API** — `https://quran-api.lpmqkemenag.id/` | Live since **9 Oct 2025**. Serves rasm Uthmani (Mushaf Standar Indonesia), **Terjemahan 2019**, **Tafsir Ringkas**, **Tafsir Tahlili**, transliteration, as JSON. **Gated:** registration + a formal **surat permohonan to Kepala LPMQ** (Abdul Aziz Sidqi), then token + endpoints issued. Endpoints never published publicly. Contact `lajnah@kemenag.go.id`, cc `quran.kemenag@gmail.com`. ~1,000 registered users, ~40 daily active. **[HIGH]** |

This is the only legitimate path to Terjemahan 2019 / Tafsir Kemenag rights, and almost nobody has
walked it. **Open this first.**

### 3.3 Refused for AI training — retrieve-and-cite only

All serve Cloudflare Content Signals `search=yes, ai-train=no, use=reference` with explicit
`Disallow: /` for ClaudeBot, GPTBot, CCBot, Google-Extended, and an express reservation under
**EU DSM Directive Article 4**:

- **shamela.ws** [HIGH] — the largest Arabic Islamic corpus on the internet
- **nu.or.id** [HIGH] — note `islam.nu.or.id` (the fiqh subdomain) is *unrestricted*; treat that as a
  config oversight, not a grant
- **muhammadiyah.or.id** [HIGH] — note `tarjih.or.id` is unrestricted
- **islami.co**, **alif.id**, **republika.co.id** [HIGH]
- **laduni.id** [HIGH] — `Disallow: /` outright. **Do not crawl.**

`search=yes` + `use=reference` means indexing and citation-with-link-out **are** permitted. Training
is not. `ai-input` (RAG grounding) is unspecified — neither granted nor refused.

### 3.4 Non-commercial — the finding that overturns the usual assumption

| Source | License |
|---|---|
| **OpenITI / KITAB** | **CC BY-NC-SA 4.0** — *Creative Commons Attribution **Non Commercial** Share Alike 4.0 International*. Latest release **2025.1.9, 30 Dec 2025**. **[HIGH]** — Zenodo concept DOI `10.5281/zenodo.3082463` |

OpenITI is universally described as "the open scholarly corpus" and is the one everyone reaches for.
It is openly licensed **and forbidden for commercial use**, with a viral ShareAlike term on top.
`github.com/OpenITI/RELEASE` has **no LICENSE file** and GitHub's detector returns `None` — the
licence lives on the Zenodo records. ~11 GB, ~6,785 unique titles, 2,843 authors.

**Useful for research, evaluation, and benchmarking. Not for the product.**

### 3.5 No licence published — silence is not a grant

| Source | Position |
|---|---|
| **turath.io** | **Nothing.** No robots.txt (the 200 is an SPA fallback), no ToS, no copyright notice. Serves the *same corpus as Shamela* — 8,593 books, bulk JSON, no auth, `access-control-allow-origin: *`, incremental `patches` sync. The most ingest-ready thing in the landscape, and **taking Shamela's text from here to route around Shamela's refusal is precisely the shortcut we do not take.** [HIGH] |
| **islamweb.net**, **islamport.com**, **ar.lib.eshia.ir**, **noorlib.ir** | No licence published. Scrape-only. [HIGH] |
| **waqfeya.net** | Footer `جميع الحقوق محفوظة` (all rights reserved). PDFs actually hosted on archive.org. [HIGH] |
| **Salafi Indonesian tier** — rumaysho.com, muslim.or.id, konsultasisyariah.com, almanhaj.or.id, bimbinganislam.com | All open crawl, clean sitemaps, **no AI-bot blocks**, **no open licence**. [HIGH] |

### 3.6 Two claims circulating that are false

- **Hindawi is not CC BY.** Footer: `حقوق محفوظة لمؤسسة هنداوي © ٢٠٢٥`. The CC reference is per-book
  and applies to *the original work being translated*, not Hindawi's Arabic translation. [MED-HIGH]
- **HuggingFace `AuthenticIlm/Shamela4_Full_DB` "MIT" is not load-bearing.** The card's own text asks
  you to respect muhaqqiq and publisher rights, which contradicts the grant. A third party cannot
  MIT-licence Dār al-ʿĀṣima's 1987 edition. [MED]
- **archive.org is per-item roulette.** 559,066 items in `booksbylanguage_arabic`. Spot-checked
  `WAQ69939`: **no `licenseurl` field at all.** Unstated ≠ public domain. Read every item; skip
  anything unstated. (Collections `arabic_books`, `arabiccollections`, `waqfeya` do not exist.) [HIGH]

---

## 4. What the religious authorities have ruled

Every authority that has spoken has converged, from opposite ends of the spectrum.

| Authority | Ruling |
|---|---|
| **NU** — Munas Alim Ulama, Jakarta, **19 Sept 2023** | Bahtsul Masail Waqiʿiyah: taking AI religious answers as guidance is **"dilarang atau diharamkan atau tidak boleh."** *Asking* permitted; *following* haram. PBNU **recommended NU build its own Aswaja-aligned AI.** [HIGH] |
| **IslamQA** (Salafi) — fatwa **540774**, 27 Jul 2025 | "Not permissible to ask it for fatwas or trust its answers in matters of religion." Carve-out: researchers may use AI to *gather* material if they verify sources. [HIGH] |
| **MUI** — KH Cholil Nafis, Cairo, Aug 2025 | AI *"tidak memiliki kesadaran manusia"* — cannot be a mufti. [HIGH] |
| **IIFA / OIC Fiqh Academy** — Res. 258 (3/26), Doha, May 2025 | Six conditions for AI generally; **conspicuously silent on ifta**. Deferred. [HIGH] |

**AI may retrieve. AI may not rule.** The Salafi body and the traditionalist body reached identical
conclusions eighteen months apart. This is not a factional objection that can be sourced around.

---

## 5. The manhaj skew — a product risk, not a nicety

**Documented by OpenITI/KITAB themselves** (`kitab-project.org/Bias-in-the-OpenITI-corpus`) [HIGH]:

- **4,290 of 5,104 works (~75%)** come from three collections: Shamela, al-Jāmiʿ al-Kabīr, ShiaOnline
- Shamela was created on an **Ahl al-Ḥadīth forum in 2005**; >90% of its texts came from four internet
  collections, largest being al-Warrāq at >35%
- KITAB names the genre skew itself: hadith/Qurʾān-heavy, originally **zero poetry** — attributed to
  Salafi preference

The skew is **documented in kind, never in degree.** No madhhab-level breakdown of Shamela's fiqh
shelf has ever been published. It is computable from OpenITI release metadata — a genuinely novel
piece of work, and permitted, since research use is what NC allows.

**The Indonesian inversion.** Indonesia's *population* is Shāfiʿī-Ashʿarī-traditionalist. Indonesia's
*indexed online religious content* is disproportionately Salafi — that tier built the better SEO and
leaves its robots.txt open, while NU and Muhammadiyah block AI crawlers. **A crawl-what-you-can
pipeline silently builds a manhaj-skewed index in the world's largest traditionalist market.**
Ingestion weights must be set by manhaj policy, not by robots.txt permissiveness.

**Precedent for exactly this failure:** the King Fahd Complex's **Hilali-Khan** translation — a
state-funded free artifact that became the global default and carried doctrinal interpolations with
it.

**Aqeedah is the detonator, not fiqh.** Indonesia is Shāfiʿī, so fiqh variance rarely surprises. What
detonates is a Salafi-sourced answer calling *tahlilan*, *ziarah kubur*, *qunut*, *talqin*, *maulid*
or *tawassul* bidʿah — on precisely the highest-traffic queries.

---

## 6. Consequences for the OKF schema and the product

1. **Add a rights gate to every OKF record.** `license:` as free text is documentation. It needs to be
   a machine-enforceable field the retrieval layer honours:
   ```yaml
   usage: commercial | reference-only | research-only | private
   rights_holder: "…"
   rights_basis: "UU 28/2014 Pasal 42 | Tanzil verbatim licence | MUI ToS | CC BY-NC-SA 4.0 | none-published"
   ```
   `reference-only` records may be retrieved and quoted with a link, never used to train and never
   silently paraphrased. `research-only` and `private` must be excluded from the product index
   entirely. This makes `use=reference` compliance **architectural rather than promised**.

2. **Add grader attribution to hadith before expanding.** All 14,736 current records carry
   `grade: sahih` with **zero grader attribution** — which is fine, because the Ṣaḥīḥayn gradings are
   agreed across every school. The exposure is prospective: adding Abū Dāwūd, Tirmidhī, Nasāʾī and Ibn
   Mājah inherits **al-Albānī's contested verdicts** (sunnah.com ships Darussalam translations with
   al-Albānī / Zubair ʿAlī Zaʾī gradings) with no field to hold the attribution. Add `grader:` and
   `grading_source:` **before** that ingestion.

3. **Label madhhab on every ruling.** IslamWeb doesn't. Dar al-Ifta doesn't. **Ansari** — the leading
   open Islamic AI — has no madhhab statement, no fatwa disclaimer, no school positioning anywhere in
   its docs. Nobody labels. A product that tags every ruling with its school and shows disagreement
   side-by-side is both the honest build and the only differentiated one. Al-Azhar's **1959 Shaltūt
   fatwa** gives institutional cover for multi-school presentation.

4. **No generative rulings.** Retrieval, citation, link-out, and verbatim quotation with the fatwa
   number. Not paraphrase — MUI's "not misleading the original context" is a substantive obligation
   that a generative summary can breach even with perfect citation.

5. **Watch Arabic byte fidelity.** turath's `books-v3/*.json` minifies JSON keys to Arabic diacritics
   (`ً ٌ ٍ َ ُ ِ ّ`) as a size optimisation. Given the known Arabic-normalisation hazard in this repo,
   this will bite hardest on qirāʾāt material, where rasm and tashkīl fidelity *is* the content.

---

## 6a. sunnah.com — resolved 2026-08-08

**The binding document is the terms, not robots.txt.** `sunnah.com/robots.txt` is wide open —
`User-agent: * / Allow: /`, only `/selectiondata/*` disallowed, **no AI-bot directives and no Content
Signals**. Reading that as permission would be reading the wrong document. The live host returns a
Cloudflare 403 to scripted clients; the text below is from an archived snapshot. [HIGH]

**About §8, "Reproduction, Copying, Scraping" — verbatim:**

> "We do not permit the scraping of our data, nor mass reproduction of entire books or collections on
> other websites. Our data is undergoing continuous refinement and this website is designed as a
> central and up-to-date resource. **If you would like a snapshot of hadith data, consider using our
> API.** Reproducing individual hadith or selections of hadith for a teaching/didactic/presentation
> purpose is permitted."

We hold **complete Bukhārī and complete Muslim**. That is "mass reproduction of entire books or
collections" on its face, whatever the age of the underlying Arabic. **This is the finding that
governs 14,736 of our 18,882 records.**

**But a sanctioned route exists and is obtainable** (Developers page, [HIGH]):
- API docs at `sunnah.stoplight.io/docs/api/`; **API key requested by opening an issue on their
  GitHub repo**
- *"You may also request an offline dump of hadith data if that is more suited to your needs"* —
  marked *not available yet* at snapshot time, worth asking
- Their stated value: *"Open: We provide an open platform – including data and software – so that
  others can build on top of hadith data."*

**Two corroborations from the same page:**
- Arabic sourced from `al-eman.com` and `hadith.al-islam.com` (now defunct) — not from print editions
- Gradings displayed are **al-Albānī and Darussalam (Ḥāfiẓ Zubair ʿAlī Zaʾī)**, with al-Arnaʾūṭ,
  Aḥmad Shākir and Abū Ghudda intended later — **and grades are only added for collections *not* in
  the Ṣaḥīḥayn.** This confirms our Bukhārī/Muslim records carry no contested grading, and that the
  exposure begins exactly when we add the four Sunan.

## 6b. Other sources resolved 2026-08-08

| Source | Finding |
|---|---|
| **`fawazahmed0/hadith-api`** | Repo LICENSE is **The Unlicense** (public-domain dedication, explicitly permits selling). **But its own `References.md` lists `sunnah.com`, `al-maktaba.org` (the Shamela mirror that refuses AI training), `zubairalizai.com`, and publisher sites as its sources.** The Unlicense covers the author's own code and compilation; he cannot dedicate to the public domain sunnah.com's translations, Shamela's texts, or al-Albānī / Zubair ʿAlī Zaʾī / al-Arnaʾūṭ gradings (al-Arnaʾūṭ d. 2016). **Same laundering pattern as the HF Shamela "MIT" claim — do not rely on it.** [HIGH] |
| **Quran Foundation API** | `api-docs.quran.foundation` live (200). **Registration required** — client ID, confirmed redirect URIs, OAuth for user data. Terms/licensing **not published on the portal page**; must be read from the linked ToS. Legacy `api.quran.com/api/v4` still responds (200). [MED] |
| **King Fahd Complex** — `qurancomplex.gov.sa` | **Unreachable** from Asia/Jakarta (curl code 000, repeated). Geo-restricted or down. **Unverified.** [LOW] |
| **alim.org** | Live (200). `robots.txt` disallows exactly the valuable paths — `/library/`, `/sirah/`, `/quran/qurtubi/`, `/hadith/narrator/`, `/Qurʾān/`. No AI-specific signals, no licence published. Scrape-only with the good material fenced off. [HIGH] |
| **al-Warrāq** | `alwaraq.net` live (200; `www.` 301s to bare). Relevant chiefly as **Shamela's largest single upstream (>35%)** — its rights posture propagates into everything downstream of Shamela. Terms not read. [MED] |

## 7. Open items — not verified, no URLs offered

1. **Muwaṭṭaʾ, Sunan Abū Dāwūd / Tirmidhī / Nasāʾī, named lexicons, al-Wāḥidī's Asbāb al-Nuzūl,
   qirāʾāt titles** — Shamela/turath *categories* verified (all 40, including all four madhāhib as
   separate shelves, أصول الفقه, السيرة النبوية, الغريب والمعاجم, التجويد والقراءات). Individual titles
   not enumerated. Settled cheaply by walking `files.turath.io/data-v3.json` (1.77 MB).
2. **King Fahd Complex** — unreachable from here; needs a different vantage point.
3. **Quran Foundation ToS** — portal reached, terms page not read.
4. **Ibāḍī** — no machine-readable corpus exists at all; manuscript images only. **Zaydī** nearly as
   bad. **Twelver** better than assumed (56% unique contribution to OpenITI) **but its upstream
   `shiaonlinelibrary.com` did not resolve** — single point of failure.
5. **Mālikī under-representation** — structurally plausible (Shamela's upstreams are Mashriqī), no
   evidence either way. Testable, untested.
6. **DSN-MUI-adopted-into-POJK question** needs Indonesian counsel.

---

## 8. Counter-argument to this document's own thesis

**No Islamic app has ever suffered public backlash over madhhab bias.** Either the risk is smaller
than this document assumes, or it is unpriced because nobody has been big enough in the Indonesian
religious-answer market to trigger it. The **Muslim Pro** precedent (Nov 2020 — X-Mode location data
reaching US defence contractors) suggests the latter: community scrutiny arrives all at once, at
scale, and aims at ownership and provenance.
