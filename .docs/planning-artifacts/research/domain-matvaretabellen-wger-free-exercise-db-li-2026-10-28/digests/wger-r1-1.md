# Digest: wger licensing — round 1, assistant 1

**Headline:** wger's server CODE is AGPL-3.0 (irrelevant if only consuming data via the public API, not forking the server). Exercise/ingredient DATA is separately CC-licensed, per-entry (mostly CC-BY-SA, but varies — must read each entry's `license` field, not assume one version). Public JSON REST API, no key/auth needed, no documented rate limit found. Images separately licensed per-image with attribution fields.

## Findings

1. claim: wger's application code is licensed AGPL-3.0-or-later.
   source: https://github.com/wger-project/wger (README License section) + GitHub API license-detection metadata (spdx_id='AGPL-3.0')
   publisher: wger-project
   accessed: 2026-10-28
   confidence: high
   class: regulatory/license

2. claim: Exercise/ingredient DATA is licensed separately from the code, under Creative Commons ("see individual entries" per README); ReadTheDocs states initial exercise/ingredient data is CC-BY-SA 3.0, documentation text CC-BY-SA-4.0-or-later.
   source: README.md (GitHub) + https://wger.readthedocs.io/en/latest/ (Licence section)
   confidence: high
   class: regulatory/license
   note: two independent sources (GitHub README vs ReadTheDocs) confirm the code/data license split.

3. claim: License is tracked per-entry, not uniformly. Live /api/v2/license/ endpoint lists 5 possible licenses in use: CC-BY-SA 3.0, CC-BY 4.0, CC-BY-SA 4.0, CC0 1.0 (public domain), ODbL. A sampled exercise (id 9, "Kettlebell Swing") is tagged CC-BY-SA 4.0 with a named license_author — not the "3.0 initial data" the docs' blanket statement implies. Per-exercise license must be read from the API field, not assumed from docs.
   source: https://wger.de/api/v2/license/ ; https://wger.de/api/v2/exerciseinfo/9/ (live API)
   confidence: high
   class: regulatory/license
   note: most authoritative source since it's the actual data to be consumed; overrides the docs' blanket "3.0" description.

4. claim: Exercise images are licensed independently per image (separate license id, license_author, license_author_url, license_derivative_source_url fields); some images originate from Wikipedia with a per-folder SOURCES file documenting provenance.
   source: https://wger.de/api/v2/exerciseimage/ (live API) + ReadTheDocs Licence/Sources section
   confidence: high
   class: regulatory/license

5. claim: Exercise/ingredient data distributed via a public JSON REST API at wger.de/api/v2/ (exercise/, exerciseinfo/, exerciseimage/, license/). Anonymous GET requests succeed with no API key or auth header.
   source: direct requests to wger.de/api/v2/exercise/, /exerciseinfo/9/, /exerciseimage/, /license/
   confidence: high
   class: regulatory

6. claim: No documented rate limit found; one test request showed no rate-limit headers. Absence of evidence, not proof of no limit — a bulk/scraper policy may exist elsewhere, not found.
   confidence: medium
   class: regulatory

7. claim: CC BY-SA 3.0 permits commercial use and adaptation, requiring (a) attribution — credit, license link, indicate changes — and (b) ShareAlike — any remix/adaptation must carry the same or a compatible license.
   source: https://creativecommons.org/licenses/by-sa/3.0/deed.en
   publisher: Creative Commons
   confidence: high
   class: regulatory/license

## Interpretation flagged by assistant (inference, not a sourced finding)
Consuming wger's data only via its public REST API (not forking/running its AGPL server code) likely does NOT bring the student app's own code under AGPL — AGPL's network-disclosure obligations attach to the covered program itself, not to unrelated clients that merely call its API. CC-BY-SA terms still apply separately to the imported exercise text/images (attribution + share-alike if adapted). Flagged explicitly as an unverified-belief/legal inference, not a confirmed finding.

## Leads not chased / not found
- No official rate-limit policy page located.
- Did not confirm whether an official bulk data dump/fixture exists (vs. only the live API) — GitHub code search needed auth, unexplored.
- wger.de's site-wide Terms of Service page returned only an anti-bot challenge page — not retrievable.
- Did not verify CC's own FAQ language on whether CC licenses propagate into surrounding unrelated application code.

## Recommendation surfaced by assistant
Pulling ~30-50 exercises via the public API is permissible under CC-BY-SA (commercial + adaptation allowed) with per-entry attribution (license_author field) and share-alike if text is adapted. AGPL governs wger's own codebase, not API-consumed data. Exact license varies per exercise — read the `license` field per entry, don't assume one blanket version.
