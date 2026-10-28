---
title: 'domain research: GDPR / helseopplysninger for a student prototype'
type: 'domain'
topic: 'GDPR obligations for weight/diet/training data in a non-commercial course prototype (Prompt Force)'
decision: 'What GDPR obligations realistically apply to Prompt Force, and what concrete requirements (consent, data minimization, deletion) should go in the PRD'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-28'
updated: '2026-10-28'
claims_verified: 4
claims_unverified: 5
claims_disputed: 0
claims_overturned: 0
---

# domain research: GDPR / helseopplysninger for a student prototype

**Decision this research serves:** What GDPR obligations realistically apply to Prompt Force (a course prototype storing weight/diet/training data), and what concrete requirements should go in the PRD.

**Project context check (read directly, not research):** `.docs/course/sensorveiledning-del1-applikasjon-og-prosess.pdf` does not mention GDPR/personvern/helseopplysninger anywhere as a grading criterion. This is about professional practice, not chasing a named sensor requirement.

## Executive summary

**GDPR is not switched off by being a small, unpublished, non-commercial student project.** The "purely personal activity" exemption is narrow and personal to an individual's own private use — it does not cover a team providing software to others (classmates, a grader, any real user besides the one person logging their own data) [1][2]. No regulation text or EDPB guidance carves out "student" or "course" projects specifically [1].

**The single most actionable, Norway-specific finding:** Sikt's (formerly NSD's) notification duty — the thing Norwegian students are usually told to worry about — is explicitly scoped on Sikt's own site to *research*, not ordinary graded coursework, and each institution separately decides which project types are covered [11]. This is not automatically a research project. **The team should ask their course coordinator or the institution's Sikt/personvern contact directly** — this is the one question this research could not answer and web research cannot answer for them.

**The practical path that sidesteps most of the complexity:** test and grade primarily against fictional/synthetic data. Per Helsedirektoratet's own testing guidance, genuinely fictional data about made-up people is not personal data at all and falls outside GDPR entirely [13] — though this rests on one directly-on-point Norwegian source, not two. If any real team member logs their own real data for their own testing, treat it conservatively: get explicit, specific, opt-in consent first, since diet/weight/training logs are not *automatically* special-category health data but EU regulators lean toward a broad reading, especially for longitudinal data [4][5][6].

**What this concretely means for the PRD:** data minimization and a working deletion path from day one (cheap now, expensive to retrofit) [9][10]; a short, separate, plain-language consent screen if any real personal data is ever entered, not a wall of legal text [18][8]; and — the pattern real small open-source fitness trackers actually use — deletion doesn't need to be instant or fully automated, a soft-delete button followed by a manual or scripted hard-delete shortly after is a legitimate, realistic design [23][27][28].

## GDPR applicability & special-category health data

GDPR applies to automated processing of personal data (Art 2(1)), with an exemption for processing "by a natural person in the course of a purely personal or household activity" (Art 2(2)(c)) [1]. Recital 18 clarifies this covers activity with no connection to a professional/commercial purpose, but explicitly states "the Regulation still applies to controllers or processors that provide the means for processing personal data for those activities" [2]. CJEU case law reads the exemption narrowly — posting about colleagues online (Lindqvist) and home CCTV covering a public space (Ryneš) both fell outside it [3]. For this project: a team member logging their own data purely for their own private testing sits close to the exempt line, but the moment the app is used by anyone else, or the team is the entity providing the software, GDPR applies — commercial status, size, and "it's just a course project" are not legally relevant factors, only enforcement-risk factors.

Diet, weight, and exercise data is **not automatically** "special category" health data under Art 9 — the GDPR's own definition (Art 4(15)) requires data that "reveal[s] information about health status," not merely health-adjacent topic matter [4]. But regulatory guidance leans broad: the Article 29 Working Party's 2015 letter on lifestyle/wellbeing apps states health data is "certainly not limited to medical data in the strict sense," and that non-medical data (e.g. step counts) can become health data in aggregate even when a single data point wouldn't qualify [5]; EDPB Guidelines 03/2020 similarly note health data "can be derived from a variety of sources," including by cross-referencing data [6]. For an ongoing weight/diet/training log tied to an identifiable person, the defensible assumption is to treat it as special-category data rather than bet on the narrow reading.

If Art 9 applies, the simplest valid basis is explicit consent (Art 9(2)(a)) [7]. EDPB Guidelines 05/2020 require an actual affirmative act — a written statement, ticked box, or similar — not a default or inferred consent, with the controller able to prove consent was given [8]. Baseline obligations apply regardless of special-category status: data minimization (Art 5(1)(c) — only "adequate, relevant and limited to what is necessary"), storage limitation (Art 5(1)(e)), and the right to erasure (Art 17(1)) [9][10].

## Datatilsynet / Sikt — what actually applies in Norway

No Datatilsynet.no guidance specifically for small businesses, hobby projects, or student/course work was found — unlike Denmark's Datatilsynet, which publishes one [negative finding, low confidence, may reflect search limits rather than confirmed absence]. An EDPB "SME Data Protection Guide" exists in Norwegian, but it's an EU/EDPB resource, not Datatilsynet's own [14]. Datatilsynet's own general definition page confirms the standard GDPR personal-data definition in plain language, applying uniformly regardless of project size [12].

The load-bearing finding: **Sikt's own service page states its personverntjenester (and the associated meldeplikt/notification duty) is scoped to "forsking"** — "Sikt (tidlegare NSD) tilbyr personverntenester for forsking til utdannings- og forskingsinstitusjonar," and "Forskarar og studentar som skal behandle personopplysingar i forsking, melder inn prosjektet til Sikt" [11]. The same page states each institution decides for itself which project types must be reported: "I avtalen bestemmer institusjonen sjølv kva type prosjekt som skal meldast til og vurderast av Sikt" [11]. Several Norwegian universities tell students the Sikt duty applies to bachelor/master-level student projects, but these describe thesis/research-type projects — none of the pages found addressed an ordinary graded course coding assignment specifically [15], medium confidence, genre not disambiguated. **This is a real distinction, not an assumption: a graded course project is not automatically a Sikt-covered research project**, and the scoping question is institution-specific — this research cannot resolve it, and neither can further web search.

Genuinely fictional/synthetic test data appears to fall outside GDPR entirely. Helsedirektoratet's "Normen" testing guidance states plainly, across two sentences: "Syntetiske data er fiktive opplysninger som er laget for testformål" and "Syntetiske data kan ikke identifisere fysiske personer og anses derfor ikke som personopplysninger" [13]. This is only single-sourced from a Norwegian regulator (Helsedirektoratet, not Datatilsynet or Sikt directly) — treat as well-supported, not fully double-sourced per the pack's own rule for regulatory claims. One caution found nowhere in the sources but logically necessary: data generated by lightly modifying real people's profiles is not the same as genuinely fictional data, and likely wouldn't qualify for this exception.

For team members testing with their own real data inside a shared/gradable system, no Norway-specific guidance was found — the EU-level household exemption (Art 2(2)(c), discussed above) probably doesn't cleanly apply once the data sits inside a system built for others to eventually use or grade [17], but this is this research's own inference applying the sourced rule to the facts, not a directly retrieved ruling on this exact scenario.

## A concrete, workable consent / minimization / deletion pattern

**Consent.** The UK ICO's guidance — usable as a practical pattern even outside the UK, since it implements the same EU consent standard — requires valid consent to identify the controller, offer granular purpose-by-purpose options where practical (the guidance allows combining them only where separate consents "would be unduly disruptive or confusing"), explain withdrawal, use plain language, and require a genuine affirmative act: "Silence, pre-ticked boxes or inactivity should not therefore constitute consent" [18]. EDPB Guidelines 05/2020 define the same four elements: freely given, specific, informed, and an unambiguous affirmative act — scrolling or swiping does not count [8]. In practice this means one short screen, separate from the general terms of service, naming what's collected and why, with no pre-ticked boxes and no penalty for declining anything non-essential. A Danish patient-association app provides a real (if non-Norwegian) example of this pattern applied to health data specifically, including narrowing app functionality if special-category consent is withdrawn [20].

**Minimization.** Art 5(1)(c) requires data to be "adequate, relevant and limited to what is necessary" — collecting fields "in case they're useful later" is not a valid justification [21]. No regulator source was found specifically naming which fields a fitness/diet app commonly over-collects (e.g. exact birthdate vs. an age band, precise location); the "collect an age band instead of a full birthdate unless a feature genuinely needs exact age" pattern is widely echoed in practitioner writing but not confirmed regulator doctrine [22] — flag this as reasonable practice, not sourced law. A real open-source fitness tracker (Open Trackers) states minimization as explicit policy and achieves it architecturally by storing data locally on-device plus the user's own iCloud rather than on a central server [23].

**Deletion.** Article 17 requires erasure "without undue delay," with the general GDPR response benchmark of one month providing the outer bound [10]. A Danish DPA guide states that merely flagging a record deleted while leaving the underlying data in the database does not constitute real deletion [24]. Practitioner/vendor practice (not a fixed legal rule) treats a short, bounded soft-delete window — one real example uses 10 days — followed by an actual hard delete or anonymization as acceptable, so long as it isn't indefinite [25]; the right to erasure extends to backups, which need either explicit handling or a stated retention policy [26]. Tellingly, the realistic small/open-source pattern is *not* a fully automated self-service pipeline: published privacy policies for MyTracker and Lettest (both open-source weight trackers) route deletion requests through a GitHub issue to the maintainer rather than an in-app button [27][28]. A student project offering a "delete my account" button that soft-deletes immediately, with a manual or scripted hard-delete run shortly after, would already be at least as rigorous as these real, published examples.

## Cross-dimension insight

The three dimensions converge on the same practical architecture decision, approached from three different angles: EU law treats "it's a student project" as irrelevant to whether GDPR applies [1][2], Norwegian Sikt guidance treats "it's a course project, not research" as *relevant* to a different, narrower notification duty [11], and real small open-source apps treat "we're small" as a reason to keep the *implementation* simple (local-first storage, manual deletion requests) without treating it as an excuse to skip the obligation entirely [23][27][28]. The throughline for the PRD: scope the *rigor* of the implementation to the project's real size (a button plus a manual follow-up job beats a full enterprise deletion pipeline), but don't scope the *right to ask* for deletion, or the *honesty* of the consent text, down to zero just because the audience is small.

## Recommendations

1. **Default to fictional/synthetic test data for grading and demos.** *Confidence: medium-high.*
2. **If any real team member logs their own real data, get explicit, specific, opt-in consent first — and treat the data as special-category (Art 9) to be safe.** *Confidence: high* on the mechanism; *medium* on the Art 9 default (a conservative choice, not a forced one).
3. **Build data minimization and a real deletion path into the data model from day one** — a soft-delete button plus a manual or scripted hard-delete shortly after is legitimate; it doesn't need to be instant or fully automated. *Confidence: high.*
4. **Ask the course coordinator or institution's Sikt/personvern contact whether this course project falls under the institution's Sikt agreement.** The one question only the institution can answer. *Confidence: high that this is the right next step; the answer itself is unknown.*
5. **Frame this in the PRD's risk/compliance section as "low enforcement risk given no real special-category data at scale," not "GDPR doesn't apply."** The latter misrepresents the law. *Confidence: high.*

## Open questions

- **Does this specific course's Sikt agreement cover graded course/class assignments, or only thesis/research projects?** The single most actionable open item — ask the course coordinator or institution directly; this cannot be resolved by further web research [11].
- **Is lightly-modified "synthetic" data (based on real people) still exempt, or does it re-enter GDPR's scope?** Not addressed by any source found this session — a reasonable caution, not a sourced finding.
- **What does a Norway-specific minimal consent/info text actually need to say?** No Datatilsynet-authored template was found; the closest match was Danish (not Norwegian) guidance on minimum consent-text content [16]. The team would be assembling a text from EU/UK (ICO, EDPB) and Danish sources, not a direct Norwegian one.
- **Is "age range instead of exact birthdate" and similar minimization moves regulator-endorsed, or just practitioner convention?** No regulator source was found making this specific comparison for fitness/diet apps — flagged as reasonable practice, not confirmed doctrine.
- **What's an appropriate soft-delete grace window?** No regulator-stated number exists; the one-month Art 17 response benchmark is primary law, the "days, not indefinite" pattern is vendor practice only.

## Source appendix

| # | Source | Publisher | Pub. date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | [gdpr-info.eu — Article 2](https://gdpr-info.eu/art-2-gdpr/) | gdpr-info.eu (EU Regulation 2016/679 mirror) | 2016/undated mirror | 2026-10-28 | high |
| [2] | [gdpr-info.eu — Recital 18](https://gdpr-info.eu/recitals/no-18/) | gdpr-info.eu | 2016/undated mirror | 2026-10-28 | high |
| [3] | CJEU Lindqvist (C-101/01) & Ryneš (C-212/13), via secondary case-law summaries | various (consistent across independent write-ups) | undated | 2026-10-28 | medium |
| [4] | GDPR Article 4(15) — definition of health data, via search summary | GDPR text / search summary | 2016 regulation | 2026-10-28 | high (snippet-sourced, not directly WebFetched) |
| [5] | Article 29 Working Party 2015 letter on lifestyle/wellbeing apps, via law-firm summaries | WP29, summarized by 3 independent firms | 2015 | 2026-10-28 | medium |
| [6] | EDPB Guidelines 03/2020 (COVID-19 research context), via Mondaq summary | EDPB, via Mondaq | adopted ~2020-04-21 | 2026-10-28 | medium |
| [7] | [gdpr-info.eu — Article 9](https://gdpr-info.eu/art-9-gdpr/) | gdpr-info.eu | 2016/undated mirror | 2026-10-28 | high |
| [8] | EDPB Guidelines 05/2020 on consent, via EDPB summary + secondary commentary | European Data Protection Board | adopted 2020-05-04 | 2026-10-28 | medium-high |
| [9] | [gdpr-info.eu — Article 5](https://gdpr-info.eu/art-5-gdpr/) | gdpr-info.eu | 2016/undated mirror | 2026-10-28 | high |
| [10] | [gdpr-info.eu — Article 17](https://gdpr-info.eu/art-17-gdpr/) | gdpr-info.eu | 2016/undated mirror | 2026-10-28 | high |
| [11] | [Sikt — personverntjenester for forsking](https://sikt.no/tjenester/personverntjenester-forskning) | Sikt | undated, fetched live | 2026-10-28 | high |
| [12] | [Datatilsynet — personopplysninger](https://www.datatilsynet.no/) | Datatilsynet | sist endret 2025-03-31 | 2026-10-28 | high |
| [13] | [Helsedirektoratet — Normen, syntetiske data](https://www.helsedirektoratet.no/normen/testing-og-testdata-faktaark-43/ulike-datagrunnlag-ved-testing/syntetiske-data) | Helsedirektoratet | undated | 2026-10-28 | medium-high |
| [14] | [EDPB — SME Data Protection Guide (Norwegian)](https://edpb.europa.eu/sme-data-protection-guide_no) | EDPB | undated | 2026-10-28 | medium |
| [15] | Norwegian university student-project pages (USN, VID, UiO, NTNU, UiS) | various Norwegian universities | various, one 2021 doc | 2026-10-28 | medium |
| [16] | Danish Datatilsynet samtykke guidance (different jurisdiction) | Datatilsynet (Denmark) | undated | 2026-10-28 | low for Norway specifically |
| [17] | EU household-exemption secondary sources (Irish DPC, GDPR.eu) | various | undated | 2026-10-28 | medium |
| [18] | [ICO — What is valid consent](https://ico.org.uk/) | Information Commissioner's Office (UK) | undated, live page | 2026-10-28 | high |
| [20] | Diabetesforeningen app privacy policy PDF | Diabetesforeningen (Denmark) | 2024-10-22 | 2026-10-28 | medium (illustrative, Danish not Norwegian) |
| [21] | GDPR Art 5(1)(c) applied in a fitness-app practitioner guide | dev.to / Custodia | undated | 2026-10-28 | medium (principle is primary law, application is practitioner interpretation) |
| [22] | DOB-vs-age-range practitioner blogs | strac.io, dev.to, meta.discourse.org | undated | 2026-10-28 | low-medium, practitioner consensus only |
| [23] | [Open Trackers — privacy policy](https://open-trackers.github.io/privacy) | OpenAlloc / open-trackers | undated, live page | 2026-10-28 | high |
| [24] | Danish DPA guide on erasure, via JD Supra summary | Datatilsynet (Denmark), via JD Supra | undated | 2026-10-28 | medium |
| [25] | Soft-delete vendor practice (sota.io, Khoros) | sota.io; Khoros | sota.io post dated 2026; Khoros undated | 2026-10-28 | medium |
| [26] | Erasure-rights explainer on backup scope | legiscope.com and similar | undated | 2026-10-28 | medium |
| [27] | MyTracker privacy policy | gonespral (GitHub Pages) | undated, live page | 2026-10-28 | high (seen via search snippet) |
| [28] | Lettest privacy policy | willarentz (GitHub Pages) | undated | 2026-10-28 | medium (seen via search snippet) |

## Staleness map

Computed via `recon_kit.py staleness` (regulatory class, 6-month window): all 9 tracked claims are fresh, re-check by **2027-04-01**. The GDPR regulation text itself (refs [1][2][7][9][10]) is stable long-term and unlikely to need re-checking even then. The one item worth re-checking sooner than the computed date, in practice: **ref [11]** (Sikt's scoping of its own notification duty) — institutional agreements and service descriptions can be updated, and this is the one open question this research explicitly could not close. A direct answer from the course coordinator should supersede this secondary research immediately, regardless of the formal re-check date.
