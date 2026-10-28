# Digest: Matvaretabellen licensing — round 1, assistant 1

**Headline:** Matvaretabellen data is openly licensed, free, no registration/API key required, reuse incl. commercial use permitted provided attribution is given. One unresolved discrepancy on exact license name (CC BY 4.0 vs NLOD 2.0) — does not block the decision, both are permissive/attribution-requiring/commercial-allowed.

## Findings

1. claim: Mattilsynet's own copyright/terms page states data from Matvaretabellen is available under CC BY 4.0, usable freely for any purpose within the license (implying commercial use allowed), requires citation "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no". Disclaims warranty on accuracy/completeness.
   source: https://mattilsynet.no/mat-og-drikke/matvaretabellen/opphavsrett
   publisher: Mattilsynet (Norwegian Food Safety Authority)
   pub_date: undated (page reviewed 2026-10-26)
   accessed: 2026-10-28
   confidence: high
   class: regulatory/license

2. claim: data.norge.no (Digdir open-data catalog) lists Matvaretabellen's dataset distributions (ODS, XLSX, HTML service) under "Norwegian Licence for Open Government Data (NLOD) 2.0", not CC BY 4.0 — appears in two separate catalog entries.
   source: https://data.norge.no/en/datasets/9d082918-e3d4-4ae2-8efd-e7d025dfd52d/matvaretabellen ; https://data.norge.no/en/datasets/bc57cc76-4d20-3c21-ae1b-c5a3cdcb58f7/matvaretabellen
   publisher: data.norge.no / Digdir (harvested from Mattilsynet)
   pub_date: issued 2023-11-19/20; metadata updated 2025-03-21 / 2025-07-30
   accessed: 2026-10-28
   confidence: medium
   class: regulatory/license
   note: CONFLICTS with finding 1 on exact license name. Both NLOD 2.0 and CC BY 4.0 are permissive, attribution-required, commercial-use-allowed — practical effect for this project is the same either way. No page found reconciling which is authoritative. Primary source (Mattilsynet) should outweigh third-party catalog with staler-looking metadata.

3. claim: Mattilsynet's download page offers "Matvaretabellen 2026" in .xlsx and .ods formats, no cost/login/registration mentioned; links to the opphavsrett terms page rather than stating terms itself.
   source: https://mattilsynet.no/mat-og-drikke/matvaretabellen/last-ned
   publisher: Mattilsynet
   pub_date: undated (page dated 2026-10-26)
   accessed: 2026-10-28
   confidence: high
   class: regulatory/license

4. claim: Public API at matvaretabellen.no with 5 endpoints (foods, food groups, nutrients, LanguaL codes, sources), JSON or EDN, Norwegian/English (LanguaL codes untranslated). No API key/registration/cost mentioned. Requests citation of "the Food Table" as source, notes annual (autumn) updates, allows local caching, links to a GitHub repo for source code.
   source: https://www.matvaretabellen.no/en/api/
   publisher: Mattilsynet / matvaretabellen.no
   pub_date: undated
   accessed: 2026-10-28
   confidence: medium
   class: regulatory/license

5. claim: Mattilsynet confirmed as publisher across own site and independent data.norge.no catalog.
   source: as above
   confidence: high
   class: regulatory/license

## Leads not chased (budget-limited, ~8/10 calls used)
- No page reconciles CC BY 4.0 vs NLOD 2.0 discrepancy — worth emailing matvaretabellen@mattilsynet.no, or checking the linked GitHub repo's own LICENSE file (separate from data license, also unchecked).
- No explicit text on redistributing the raw dataset itself (vs. using it inside an app) — implied yes under CC BY 4.0 but not spelled out for third-party redistribution specifically.
- No explicit "this is free of charge" statement anywhere, though absence of any pricing/paywall across multiple pages is itself evidence of free use.
- Two-source bar only partially met: one primary source + one independent-but-conflicting source (on license name specifically, not on free/attribution-required reuse, which both agree on).

## Recommendation surfaced by assistant
Safe to use for seeding ~100-200 items with attribution ("Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no"), no registration/key needed, via XLSX/ODS download or JSON API. Flag CC BY 4.0 / NLOD 2.0 discrepancy as a known open question.
