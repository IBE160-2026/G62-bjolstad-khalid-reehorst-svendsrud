# Digest: consent/minimization/deletion pattern — round 1

**Bottom line (shortest honest version for a course-project-scale app):**
1. CONSENT: one short screen at signup, separate from generic ToS, plain language on what's collected/why, no pre-ticked boxes, declining optional extras doesn't block core use, log who/when/which text version was agreed to.
2. MINIMIZATION: don't collect exact DOB if an age band would do; don't collect precise GPS unless a feature needs it; only collect fields a current feature actually uses.
3. DELETION: a "delete my account" action that soft-deletes/deactivates immediately, then actually hard-deletes or irreversibly anonymizes within a short, stated, bounded window (days, not indefinite) — covering backups too.

## Q1: Minimal honest consent flow

1. claim: Valid consent must identify the controller, cover each purpose/activity with its own clear option (granular), tell people they can withdraw and make it easy, be presented separately from other T&Cs in plain language, and require a deliberate affirmative act — "silence, pre-ticked boxes or inactivity should not constitute consent."
   source: ICO "What is valid consent" guidance — Information Commissioner's Office (UK) — undated, live page — accessed 2026-10-28 — confidence: high — class: official regulator guidance
2. claim: Consent has no fixed legal duration — degrades over time, should be refreshed at sensible intervals; past processing stays lawful after withdrawal, but withdrawal must stop future processing "as soon as possible."
   source: ICO "What is valid consent" guidance — confidence: high
3. claim: EDPB Guidelines 05/2020 define 4 elements of valid consent: freely given (no cookie-wall-style conditioning), specific (separate consent per purpose, not vague "improving experience"), informed (controller identity + purpose stated), unambiguous affirmative act (scrolling/swiping does NOT count).
   source: law-firm/consultancy summaries of EDPB Guidelines 05/2020 — confidence: medium (secondary sources, not primary PDF text)
4. claim: A Danish patient-association app's privacy policy requires separate specific consent for Art.9 health-data processing; withdrawing it limits the app to non-interactive/reference use only.
   source: Diabetesforeningen app privacy policy PDF — pub_date 2024-10-22 — confidence: medium (Danish, illustrative only, not Norwegian/UK)

## Q2: Data minimization for a fitness/nutrition data model

5. claim: Art.5(1)(c) — data must be adequate, relevant, limited to what's necessary; collecting "just in case" is not valid justification.
   source: GDPR Art.5(1)(c), as applied in a fitness-app practitioner guide — confidence: medium (principle is primary law, application is practitioner interpretation)
6. claim: Practitioner guidance (no regulator source confirmed) argues an age range is usually sufficient where only eligibility/age-appropriate content matters, since full DOB is a long-lived cross-system identifier; full DOB justified only when exact age drives a real feature.
   source: various vendor/practitioner blogs — confidence: low-medium, flagged unverified-belief-adjacent, practitioner consensus only, no regulator confirmation found
7. claim: Open Trackers (open-source fitness tracker) states as policy "we aim to limit the information we collect to the minimum necessary," storing data locally on-device + user's own iCloud rather than centrally, collecting only opt-in diagnostics and basic web logs.
   source: Open Trackers privacy policy, directly fetched — confidence: high (primary source)

**Could not find:** an official regulator document specifically listing "categories commonly flagged unnecessary for fitness/diet apps" (DOB-vs-range, precise-location). Weakest-evidenced question — treat as reasonable, widely-echoed practitioner practice, not confirmed regulator doctrine.

## Q3: "Delete my account" under Art. 17

8. claim: Art.17 requires erasure "without undue delay"; general GDPR response-window benchmark is one month — any grace period must fit inside that, not replace it.
   source: GDPR Art.17 text as applied in erasure-rights explainers — confidence: high for the one-month point (primary law), medium for how guides apply it
9. claim: A Danish DPA guide (summarized) states merely deleting a reference/link while leaving underlying data in the database does not constitute real deletion — a flag-only "soft delete" that never progresses to actual removal is non-compliant.
   source: Danish Data Protection Agency guide, via JD Supra summary — confidence: medium (secondary summary, primary text not read directly)
10. claim: Practitioner consensus (not a regulator rule): soft delete is acceptable only as a short, bounded transitional state (one real vendor example: 10-day window) followed by an actual hard-delete or crypto-shredding step.
    source: developer/vendor blogs (sota.io 2026, Khoros docs) — confidence: medium (practical pattern, not a fixed legal requirement)
11. claim: Right to erasure extends to backup copies too — grace-period/soft-delete design must account for backup retention/rotation, not just the live database.
    source: erasure-rights explainer guides — confidence: medium
12. claim: Anonymization (stripping identifiers) is a commonly cited alternative to full deletion for retained logs/history — once truly anonymized, data falls outside GDPR scope.
    source: unverified belief — consistent with Art.17/Recital 26 logic but not evidenced by a retrieved source this session for this specific use case — confidence: low, flagged unverified

**Bottom line Q3:** instant permanent hard-delete is not legally required; a short bounded soft-delete/grace window followed by actual hard delete (or anonymization) within roughly a month fits the practical pattern. A "flag deleted forever, keep the rows" design does not satisfy erasure per the Danish DPA's stated logic.

## Q4: Documented examples from small/OSS fitness apps

13. claim: MyTracker (open-source weight tracker) handles deletion via the user opening a GitHub issue requesting the maintainer "permanently delete your account and all associated data."
    source: MyTracker privacy policy page — confidence: high (primary source, read via search snippet not full fetch)
14. claim: Open Trackers (OpenAlloc): data stored locally on-device + user's own iCloud, not a central server; deletion requests for anything the maintainer does hold go through a support-email request, excluding data kept for "administrative, legal, or security purposes"; explicit minimization commitment stated.
    source: Open Trackers privacy policy, directly fetched — confidence: high
15. claim: Lettest (open-source weight tracker) also routes deletion requests through its public GitHub issue tracker rather than an in-app self-service flow.
    source: Lettest privacy policy page — confidence: medium (seen via search snippet, not fetched directly)

**Bottom line Q4:** the realistic small/OSS pattern is NOT a fully automated self-service deletion pipeline — several real open-source fitness trackers handle deletion via manual request (GitHub issue or support email). A student project with "a delete-account button that soft-deletes, with a manual/scripted hard-delete job run shortly after" would be at least as rigorous as these published examples. Keeping data client-side/local-first (as Open Trackers does) sidesteps much of the minimization/deletion complexity entirely.

## Could not find
- A direct, current ICO "consent checklist" artifact (reconstructed from the live guidance page's stated rules).
- Any Datatilsynet (Norway) guidance specifically on consent for a non-clinical consumer health/fitness app (only found Helsedirektoratet clinical-patient-portal guidance and older general Datatilsynet app statements).
- A regulator source explicitly naming "DOB vs age range" or "precise location" as flagged-unnecessary for fitness/diet apps specifically — practitioner-blog consensus only.
- A numeric regulator-endorsed grace-period length for soft delete — the one-month Art.17 window is primary law, the "X days of soft delete" pattern is vendor practice only.

**Primary sources worth reading directly:** ICO "What is valid consent" (ico.org.uk), Open Trackers privacy policy (open-trackers.github.io/privacy).
