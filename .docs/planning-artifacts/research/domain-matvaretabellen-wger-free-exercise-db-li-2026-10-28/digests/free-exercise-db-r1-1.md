# Digest: free-exercise-db licensing — round 1, assistant 1

**Headline:** JSON exercise data (names, equipment, muscle groups, instructions) is Unlicense/public domain — safe to seed with no attribution needed. Images are a live, unresolved gray area — repo maintainer admits he doesn't know their source; likely sourced from non-FOSS ExRx.net; multiple open GitHub issues calling for removal, unresolved as of latest commit. Recommend NOT using the images from this dataset.

## Findings

1. claim: free-exercise-db (github.com/yuhonas/free-exercise-db) is licensed under The Unlicense — confirmed by GitHub's license-detection metadata (spdx_id='Unlicense') AND the literal LICENSE.md text (standard public-domain dedication).
   source: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md ; https://api.github.com/repos/yuhonas/free-exercise-db
   publisher: GitHub / repo maintainer yuhonas
   accessed: 2026-10-28
   confidence: high
   class: regulatory/license
   note: two independent confirmations (API metadata + file text) — two-source bar met.

2. claim: The Unlicense is public-domain dedication, no attribution requirement, no copyleft; permits commercial or non-commercial reuse/redistribution "by any means" — so the JSON data can legally be reused in a closed-source student app without attribution.
   source: LICENSE.md text + canonical unlicense.org text it mirrors
   confidence: high
   class: regulatory/license

3. claim: Repo maintainer states explicitly he does NOT know where the exercise images came from or whether they're royalty-free ("usage would be at your own risk").
   source: https://github.com/yuhonas/free-exercise-db/issues/2, maintainer comment, 2023-06-27
   confidence: high
   class: regulatory/license

4. claim: In issue #13 (not #2 — corrected after citation check), a contributor (2026-08-01) flagged some images as likely from ExRx.net ("definitely not FOSS"); another contributor called the images "a huge problem [that] should be taken down ASAP"; maintainer (2026-08-02) agreed to consider replacing them with placeholders — unresolved, images still present as of last commit (2026-09-27).
   source: https://github.com/yuhonas/free-exercise-db/issues/13 (comments by DryfterX, 12people, yuhonas)
   pub_date: 2026-08-01/02
   confidence: high
   class: regulatory/license

5. claim: Issue #13 ("images has copyright?", opened 2024-08-26 — corrected after citation check, originally misdated 2024-09-10 — still open 2026-10-28) collects ~2 years of repeated user questions with no resolution; a comment (12people) argues distributing copyrighted images "is plain illegal... even via Github"; images not removed as of latest commits.
   source: https://github.com/yuhonas/free-exercise-db/issues/13
   pub_date: 2024-08-26 to 2026-08-02 (ongoing)
   confidence: high
   class: regulatory/license

6. claim: Data lineage traces to predecessor repo wrkout/exercises.json (also Unlicensed per GitHub API), with a secondhand reference (via a free-exercise-db comment) to an upstream issue stating images "aren't royalty free" — i.e. the image problem predates and was inherited by free-exercise-db, not introduced by it.
   source: wrkout/exercises.json API metadata; free-exercise-db issue #2 comment by skyerus, 2025-02-20, referencing wrkout/exercises.json#305
   confidence: medium (secondhand paraphrase, upstream issue not opened directly)
   class: license

7. claim: Data distributed only as files inside the GitHub repo (per-exercise JSON in exercises/, combined dist/exercises.json, per-exercise image folders) — raw.githubusercontent.com or clone. No published npm package named free-exercise-db (npm registry returns 404).
   source: repo README/file listing; https://registry.npmjs.org/free-exercise-db (404)
   confidence: high
   class: license

8. claim: Actively maintained — most recent commit 2026-09-27, substantive content commits through 2026-08-29; not archived.
   source: GitHub API commits endpoint
   confidence: high
   class: regulatory

## Leads not chased
- Did not directly open wrkout/exercises.json#305 (only secondhand paraphrase) — worth pulling directly.
- No systematic audit of which/how many of the ~800+ images are affected — GitHub threads describe "some" on casual inspection only.
- No evidence of an actual DMCA/takedown notice from ExRx.net — only user speculation about future risk.
- Exercise instruction TEXT provenance beyond the JSON license not independently verified beyond one commenter's informal opinion.

## Recommendation surfaced by assistant
Use the JSON field data (names, equipment, muscle groups, instructions) freely — Unlicense, no attribution needed. Do NOT use the bundled images; source exercise images elsewhere (own photos or a dataset with clear image licensing).
