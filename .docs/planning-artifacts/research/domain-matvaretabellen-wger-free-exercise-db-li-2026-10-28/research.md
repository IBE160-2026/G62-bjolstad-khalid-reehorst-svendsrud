---
title: 'domain research: Matvaretabellen, wger & free-exercise-db licensing'
type: 'domain'
topic: 'Matvaretabellen, wger, and free-exercise-db — license terms for seeding Prompt Force data'
decision: 'Whether/how Prompt Force can use Matvaretabellen (Mattilsynet), wger, and free-exercise-db to seed the nutrition and exercise databases'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-28'
updated: '2026-10-28'
claims_verified: 5
claims_unverified: 5
claims_disputed: 1
claims_overturned: 0
---

# domain research: Matvaretabellen, wger & free-exercise-db licensing

**Decision this research serves:** Whether/how Prompt Force can use Matvaretabellen (Mattilsynet), wger, and free-exercise-db to seed the nutrition and exercise databases.

## Executive summary

All three datasets can be used, but not uniformly, and not for everything:

- **Matvaretabellen** — safe to use for seeding food/nutrient data. Free, no key/registration, reuse (including commercial use) permitted with attribution via XLSX/ODS download or a public JSON API [1][2][3]. The one open point is the *exact* license label — Mattilsynet's own page says CC BY 4.0 [1], data.norge.no, the national open-data catalog, says NLOD 2.0 [4] — but both are permissive, attribution-requiring, commercial-use-allowed licenses, so this does not block the decision.
- **wger** — safe to use the exercise/ingredient *data* via its public API (no key needed), but **not uniformly licensed**: the server code is AGPL-3.0 (irrelevant if only the API is consumed, not the server itself) while the data is separately Creative-Commons-licensed *per entry* — live data shows a mix of CC-BY-SA 3.0, CC-BY 4.0, CC-BY-SA 4.0, CC0, and ODbL across exercises [8][9][10][11]. The team must store the license and author per imported row, not assume one blanket license.
- **free-exercise-db** — the JSON exercise *text* (names, equipment, muscle groups, instructions) is public domain (Unlicense), free to use with no attribution required [5][6]. Its bundled *images* are a live, unresolved risk: the maintainer admits not knowing their source [7], and a separate contributor thread traces likely sourcing to a non-open site and calls for removal, unresolved as of the latest commit [8]. **Do not use the images from this dataset.**

**Biggest caveat:** none of the three gives "free, zero-bookkeeping" exercise images. wger's images carry real but trackable per-image attribution; free-exercise-db's images carry real, currently-unresolved legal risk. If the team wants images without per-item attribution bookkeeping, none of these three sources provides that — the existing plan to use YouTube embeds for exercise demonstration video sidesteps this cleanly.

## Licensing — Matvaretabellen

Mattilsynet (the Norwegian Food Safety Authority) publishes Matvaretabellen as an openly licensed dataset. Its own terms page states the data is available under CC BY 4.0, usable freely for any purpose within the license (implying commercial use), and requires the citation "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no" [1]. The dataset can be downloaded as XLSX or ODS with no cost, login, or registration [2], and is also exposed through a public JSON/EDN API covering foods, food groups, nutrients, LanguaL codes, and sources, again with no key or registration mentioned, updated annually each autumn [3].

One discrepancy surfaced: data.norge.no (Digdir's open-data catalog) lists the same dataset's distributions under the "Norwegian Licence for Open Government Data (NLOD) 2.0" rather than CC BY 4.0, across two separate catalog entries [4]. No source reconciles the two labels. In practice this does not change the decision — NLOD 2.0 and CC BY 4.0 are both permissive, attribution-requiring, commercial-use-allowed licenses — but the exact label is disputed rather than settled, and Mattilsynet's own primary-source page [1] should be treated as more authoritative than data.norge.no's metadata [4].

**Confidence:** high on "free, attribution-required, no key needed." Medium/disputed on the precise license name.

## Licensing — wger

wger's own application code is AGPL-3.0-or-later, confirmed both by its README and by GitHub's license-detection metadata [10]. Its exercise and ingredient *data*, however, is licensed separately — the README states "see individual entries," and the project's documentation describes the initial exercise/ingredient data as CC-BY-SA 3.0 [10][11]. Checking the live API directly shows this is only a partial description: the `/api/v2/license/` endpoint lists five licenses actually in use across entries — CC-BY-SA 3.0, CC-BY 4.0, CC-BY-SA 4.0, CC0 1.0 (public domain), and ODbL — and a sampled exercise (id 9, "Kettlebell Swing") is tagged CC-BY-SA 4.0 with a named author, not the "3.0" the docs' blanket statement implies [12]. The practical rule: **read the license from each entry's own `license` field when importing — do not assume a single project-wide license.**

Exercise images carry their own, separate per-image license and attribution fields (`license`, `license_author`, `license_author_url`, `license_derivative_source_url`); some images originate from Wikipedia with a per-folder sources file documenting provenance [13]. Data is reachable through a public JSON REST API (`wger.de/api/v2/`) with no key or auth header required for anonymous GET requests; no documented rate limit was found, though this is absence of evidence rather than a confirmed absence of a limit [12].

CC BY-SA 3.0, the license named for the initial dataset, permits commercial use and adaptation but requires attribution (credit, link to license, indicate changes) and ShareAlike (any adaptation must carry the same or a compatible license) [14].

One interpretive point, flagged explicitly by the research as an *inference rather than a sourced finding*: consuming wger's data only through its public API — rather than running or modifying wger's own AGPL-licensed server — likely does not bring a separate client application's own code under AGPL, since AGPL's copyleft/network-disclosure terms attach to the covered program itself, not to unrelated clients that merely call its API. wger itself does not state this anywhere; get a second opinion (e.g. course staff) before treating it as settled if it becomes load-bearing.

**Confidence:** high on the code/data license split and the per-entry license variability (both directly confirmed against the live API). Low/unverified on the AGPL-client inference and on rate-limit policy.

## Licensing — free-exercise-db

The free-exercise-db repository (`github.com/yuhonas/free-exercise-db`) is licensed under The Unlicense — a public-domain dedication — confirmed independently by both GitHub's own license-detection metadata and the literal text of its LICENSE.md file [5][6]. The Unlicense carries no attribution requirement and no copyleft obligation, and explicitly permits commercial or non-commercial use, copying, modification, and redistribution "by any means." This means the JSON exercise fields (names, equipment, muscle groups, categories, instructions) can legally be reused in a closed-source student app with no attribution needed [5].

The bundled exercise **images** are a different story. In one GitHub issue, the repository maintainer stated directly, in response to a user question, that he does not know where the images originally came from or whether they are royalty-free, and that "usage would be at your own risk" [7]. In a separate, longer-running issue (open since 2024-08-26, still open at the time of this research), a contributor identified likely sourcing from ExRx.net — a site whose content is explicitly not open-licensed — and called for the images to be removed; another comment argued distribution of copyrighted images would be "plain illegal... even via GitHub"; the maintainer acknowledged the problem and proposed replacing the images with placeholders, but had not acted as of the most recent commit [8]. The repository is otherwise actively maintained (most recent commit within the last two months of this research) [9], and the data is only distributed via the GitHub repository itself — there is no published npm package [9].

**Confidence:** high on the Unlicense status of the JSON data (two independent confirmations). High-confidence *absence of clearance* on the images — this is a documented, ongoing dispute, not a theoretical risk, though no systematic audit of how many images are affected, and no confirmed takedown notice, was found.

## Cross-dimension insight

Each dataset split its license at a finer grain than "one license for the whole thing" — by label, by code-vs-data, or by text-vs-image (see the sections above). The implication for Prompt Force's data model is architectural, not just a documentation footnote: **any table that caches or seeds data from an external source needs its own license/attribution field per row**, not a single blanket credit line in the README — this applies equally to the OFF-cached food products already flagged in the pre-PRD prep document, and to any wger-sourced exercises or images. Treat this as an input to the architecture phase, not only to the PRD's data-sourcing section.

## Recommendations

1. **Use Matvaretabellen** for the food/nutrient seed data (XLSX/ODS or the JSON API), with the Mattilsynet citation stored in the data-sources documentation. *Confidence: high.*
2. **Use wger's public API** to seed the exercise list, storing each entry's `license` and `license_author` fields rather than one project-wide line. *Confidence: high.*
3. **Use free-exercise-db's JSON text fields only — not its bundled images.** Source images from wger or the group's own material instead. *Confidence: high.*
4. **Add an attribution/license metadata column** to any table seeded or cached from an external source, per the cross-dimension insight above. *Confidence: high.*
5. **Get a second opinion** before treating the wger/AGPL inference (above) as settled, if it becomes load-bearing for the architecture or submission. *Confidence: low/unverified.*

## Open questions

- **Matvaretabellen's exact license name** (CC BY 4.0 per Mattilsynet's own page vs. NLOD 2.0 per data.norge.no) is unresolved. Next step: email matvaretabellen@mattilsynet.no, or check the license file of the GitHub source-code repo linked from the API docs.
- **wger's rate-limit policy** (if any) was not found documented anywhere searched; only tested with a single anonymous request. Next step: ask in a wger GitHub issue, or test with a short burst of requests before relying on uninterrupted bulk seeding.
- **Whether wger offers an official bulk data dump/fixture** (as an alternative to live API calls for one-time seeding) was not confirmed either way. Next step: check wger's GitHub repo for a committed fixture file, or ask in an issue.
- **wger's Terms of Service** page returned only an anti-bot challenge page during this research and could not be read. Next step: try again later, or request the terms through another channel.
- **The AGPL/client-app inference** for wger (see Recommendation 5) has not been independently verified against, e.g., AGPL's own FAQ language on network-client obligations. Next step: read the AGPL FAQ directly, or ask course staff if this matters for grading/submission.
- **How many of free-exercise-db's images are actually affected** by the ExRx.net provenance issue, and whether any takedown notice has ever been issued, was not established — only "some" images per casual contributor inspection. Not expected to change the recommendation (avoid the images regardless), but noted for completeness.

## Source appendix

| # | Source | Publisher | Pub. date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | [Matvaretabellen — Opphavsrett (terms)](https://mattilsynet.no/mat-og-drikke/matvaretabellen/opphavsrett) | Mattilsynet | undated (reviewed 2026-10-26) | 2026-10-28 | high |
| [2] | [Matvaretabellen — Last ned (download)](https://mattilsynet.no/mat-og-drikke/matvaretabellen/last-ned) | Mattilsynet | undated (dated 2026-10-26) | 2026-10-28 | high |
| [3] | [Matvaretabellen API documentation](https://www.matvaretabellen.no/en/api/) | Mattilsynet / matvaretabellen.no | undated | 2026-10-28 | medium |
| [4] | [Matvaretabellen dataset — data.norge.no catalog](https://data.norge.no/en/datasets/9d082918-e3d4-4ae2-8efd-e7d025dfd52d/matvaretabellen) | data.norge.no / Digdir | issued 2023-11; updated 2025-03/2025-07 | 2026-10-28 | medium |
| [5] | [free-exercise-db — LICENSE.md](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) | GitHub / repo maintainer yuhonas | undated | 2026-10-28 | high |
| [6] | [free-exercise-db — repo metadata (license detection)](https://api.github.com/repos/yuhonas/free-exercise-db) | GitHub | live metadata | 2026-10-28 | high |
| [7] | [free-exercise-db — issue #2 "License of Images?"](https://github.com/yuhonas/free-exercise-db/issues/2) | GitHub issue thread | 2023-06-27 (maintainer comment) to 2025-02-20 (pointer to upstream issue) | 2026-10-28 | high |
| [8] | [free-exercise-db — issue #13 "images has copyright?"](https://github.com/yuhonas/free-exercise-db/issues/13) | GitHub issue thread | opened 2024-08-26; most recent activity 2026-08-02 (ongoing) | 2026-10-28 | high |
| [9] | [free-exercise-db — commits / npm registry](https://api.github.com/repos/yuhonas/free-exercise-db/commits) | GitHub API / npm registry | commit 2026-09-27 | 2026-10-28 | high |
| [10] | [wger-project — README (License section)](https://github.com/wger-project/wger) | wger-project | undated | 2026-10-28 | high |
| [11] | [wger — ReadTheDocs Licence page](https://wger.readthedocs.io/en/latest/) | wger-project | undated | 2026-10-28 | high |
| [12] | [wger.de — live API /api/v2/license/](https://wger.de/api/v2/license/) | wger.de | live data | 2026-10-28 | high |
| [13] | [wger.de — live API /api/v2/exerciseimage/](https://wger.de/api/v2/exerciseimage/) | wger.de | live data | 2026-10-28 | high |
| [14] | [Creative Commons — CC BY-SA 3.0 deed](https://creativecommons.org/licenses/by-sa/3.0/deed.en) | Creative Commons | 2007 (3.0 Unported) | 2026-10-28 | high |

## Staleness map

Regulatory/licensing claims in this run are set to a 6-month re-check window, reflecting the pack's instruction to verify regulatory status as current regardless of a claim's age. All 11 tracked claims are fresh as of this writing; earliest re-check date: **2027-02-01** (the free-exercise-db image-provenance claim, the fastest-moving of the set since it depends on an unresolved, active GitHub discussion). All others re-check by **2027-04-01**. Re-running this as a Deepen/Refresh after those dates — or sooner if the team hears back from Mattilsynet or sees movement on the free-exercise-db issues — is the natural next step.
