# Digest: GDPR applicability + special-category health data — round 1

**Bottom line:** GDPR is NOT automatically switched off for a small, unpublished, non-commercial student project. The "purely personal activity" exemption (Art 2(2)(c)) is narrow and personal to an individual's own private use — it does not extend to the team as provider of the software, nor to any use involving other real people's real data. Diet/weight/training data is not *automatically* "special category" health data, but EU regulatory guidance leans toward treating fitness-tracking data — especially longitudinal/aggregated logs — as health data once it can reveal something about health status.

## Q1: Does GDPR apply to a small, unpublished, non-commercial student project?

1. claim: GDPR applies to processing of personal data wholly/partly by automated means (Art 2(1)), but Art 2(2)(c) excludes processing "by a natural person in the course of a purely personal or household activity."
   source: gdpr-info.eu, Article 2 — mirror of EU Regulation 2016/679 — accessed 2026-10-28 — confidence: high — class: primary
2. claim: Recital 18 clarifies the exemption covers activity with no connection to a professional/commercial activity, BUT "the Regulation still applies to controllers or processors that provide the means for processing personal data for those activities."
   source: gdpr-info.eu, Recital 18 — accessed 2026-10-28 — confidence: high — class: primary
3. claim: The household exemption is read narrowly; CJEU Lindqvist (C-101/01) found posting about colleagues online fell outside it; CJEU Ryneš (C-212/13) found home CCTV covering a public space fell outside it too.
   source: secondary commentary summarizing CJEU case law (multiple independent write-ups) — accessed 2026-10-28 — confidence: medium (consistent across independent secondary sources, CJEU judgments not fetched directly)
   **Bottom line Q1:** A team member entering their OWN real data purely for private testing sits close to the "personal activity" line, but the moment the app is used by other real people (classmates, a grader account, anyone besides the person entering their own data) or the team acts as the entity providing the software (per Recital 18), GDPR applies regardless of commercial status. No EDPB or regulation-text carve-out for "small," "student," "non-commercial," or "unpublished" projects was found — those factors affect enforcement risk, not legal applicability.

## Q2: Is diet/weight/exercise data automatically "special category" health data?

4. claim: Art 4(15) GDPR defines "data concerning health" as personal data related to physical/mental health, including healthcare provision, "which reveal information about his or her health status."
   source: GDPR Art. 4(15), via search summary (not independently WebFetched verbatim) — confidence: high — class: primary, flagged as search-snippet-sourced not directly fetched
5. claim: Article 29 Working Party's 2015 letter took a broad view: health data in lifestyle/wellbeing apps is "certainly not limited to medical data in the strict sense"; data not inherently medical (e.g. step counts) can become health data when it, alone or combined with other data, allows conclusions about health status (example given: a single week of step data may not qualify, several years of it could).
   source: law-firm summaries of the WP29 letter (3 independent write-ups, consistent) — pub_date: 2015 — confidence: medium (primary letter not fetched)
6. claim: EDPB Guidelines 03/2020 (COVID-19 research, adopted ~2020-04-21) state health data "can be derived from a variety of sources," including data that becomes health data by cross-referencing with other data.
   source: Mondaq summary of EDPB Guidelines 03/2020 — pub_date: 2020 — confidence: medium (EDPB PDF not fetched directly)
   **Bottom line Q2:** Not automatic — only when it reveals actual health status. But the safer, more defensible assumption, consistent with regulators' stated approach, is to treat ongoing weight/diet/training logs tied to identifiable people as Art. 9 special-category data rather than bet on the exception.

## Q3: Simplest valid legal basis if Art 9 applies

7. claim: Art 9(2)(a) lifts the Art 9(1) prohibition where "the data subject has given explicit consent to the processing of those personal data for one or more specified purposes."
   source: gdpr-info.eu, Article 9 — confidence: high — class: primary
8. claim: EDPB Guidelines 05/2020 on consent (adopted 2020-05-04) state explicit consent requires an express statement — a written statement, electronic consent form, confirmation email, or signed-document upload; a default/opt-out or inferred consent is not sufficient; controller must be able to prove consent was given.
   source: EDPB's own summary page + secondary commentary — confidence: medium-high (official EDPB document, summarized rather than directly quoted) — class: primary-adjacent
   **Bottom line Q3:** A clear, specific, unticked opt-in consent screen per user, naming the exact purpose, with a record of when/how consent was given and an easy withdrawal path.

## Q4: Baseline obligations regardless (Art 5, Art 17)

9. claim: Art 5(1)(c) data minimisation: personal data must be "adequate, relevant and limited to what is necessary" for the stated purpose.
   source: gdpr-info.eu, Article 5 — confidence: high — class: primary
10. claim: Art 5(1)(e) storage limitation: identifiable data should not be kept longer than necessary for the purpose (narrow exceptions for archiving/research/statistics with safeguards).
    source: gdpr-info.eu, Article 5 — confidence: high — class: primary
11. claim: Art 17(1) right to erasure: data subject can require erasure without undue delay on several grounds — no longer necessary, consent withdrawn (no other basis remains), objection under Art 21, unlawful processing, legal obligation, or child's data collected under Art 8(1).
    source: gdpr-info.eu, Article 17 — confidence: high — class: primary
    **Bottom line Q4:** Collect only the fields the app actually needs; don't keep real students' real health-adjacent data around after grading/testing is done; have a real, working way to delete data on request.

## Overall plain-language bottom line (assistant's synthesis)
GDPR is not switched off by being a small/unpublished/non-commercial student project — the personal-activity exemption is narrow and personal, not organizational. Diet/weight/training data isn't automatically special-category, but the defensible assumption is to treat it as such given regulators' broad reading of longitudinal/aggregated health-adjacent data.

**Practical path suggested:** (1) design/grade primarily against fictional/synthetic data — GDPR only applies to real identifiable people's data; (2) if any real team member's real data is entered for their own testing, get explicit, specific, opt-in consent from that person first; (3) build in data minimization and a working delete/erasure path from day one; (4) in the PRD's risk section, frame this as "low enforcement risk because no real special-category data at scale," not "GDPR doesn't apply" — the text doesn't support the latter.

## Could not fully verify
- No EDPB/regulation carve-out for "student"/"course"/"educational" projects found — absence itself is informative.
- EDPB Guidelines 03/2020 and 05/2020 not fetched verbatim (relied on EDPB's own summary page + law-firm secondary summaries).
- CJEU Lindqvist/Ryneš judgments not fetched directly — relied on consistent secondary case-law summaries.
- Art. 4(15) wording from a search snippet, not independently WebFetched.
- ~8 of ~10-call budget used, across gdpr-info.eu (primary mirror) and EDPB/WP29-derived secondary sources — meets the 2-independent-source bar for the Art 9/consent recommendations.
