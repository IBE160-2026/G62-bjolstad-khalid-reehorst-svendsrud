# Digest: Datatilsynet / Sikt practical guidance — round 1

Method note: partial primary-source retrieval — 2 direct fetches of sikt.no and datatilsynet.no succeeded (strongest evidence), several other datatilsynet.no URLs 404'd or weren't found. 10 searches + 3 fetch attempts (2 succeeded).

**Plain-language bottom line:** No formal notification/registration duty to Datatilsynet applies just for building/testing a course project. Sikt's meldeplikt (notification duty) is explicitly scoped to "forsking" (research) on Sikt's own site — student projects are covered only when processing personal data "i forsking," and each institution separately decides which project types funnel through Sikt. **A graded course/class coding assignment is not automatically a "student research project" in Sikt's own framing** — this is a real, important distinction, not an assumption. Purely fictional/synthetic test data is well-supported (single Norwegian source) as NOT personal data at all. If team members test with their own real data inside a multi-user system built for others, this is a genuine gray zone with no direct Norwegian guidance found.

## Q1: Does Datatilsynet publish simplified guidance for small/hobby/student projects?

1. claim: No Datatilsynet.no page specifically for small businesses, startups, hobby projects, or student/course projects was located across 4 targeted searches.
   source: absence of result — confidence: low (negative finding, may not have been found rather than proven absent) — class: gap
2. claim: Datatilsynet's general personal-data definition page ("Personopplysninger er alle opplysninger og vurderinger som kan knyttes til deg som enkeltperson, direkte eller indirekte") is plain-language and applies uniformly regardless of project size.
   source: datatilsynet.no page on personopplysninger, fetched directly — sist endret 31.03.2025 — confidence: high
3. claim: An EDPB "SME Data Protection Guide" exists with Norwegian-language pages, positioned as basics guidance for smaller actors — but this is an EU/EDPB resource, not Datatilsynet's own.
   source: edpb.europa.eu/sme-data-protection-guide (Norwegian pages) — confidence: medium

**Bottom line Q1:** No evidence of a Datatilsynet "course/hobby project" track. Only the general plain-language definitions page confirmed; no dedicated small-business/startup simplification guide found on the Norwegian site (unlike Denmark's Datatilsynet, which has one).

## Q2: Does Sikt/NSD's meldeplikt apply to course/class projects, or only formal research?

4. claim: Sikt's own service page states: "Sikt (tidlegare NSD) tilbyr personverntenester for forsking til utdannings- og forskingsinstitusjonar," and "Forskarar og studentar som skal behandle personopplysingar i forsking, melder inn prosjektet til Sikt."
   source: sikt.no/tjenester/personverntjenester-forskning, fetched directly — confidence: high — class: verified, primary direct quote
5. claim: The same page states each institution decides which project types must be reported: "I avtalen bestemmer institusjonen sjølv kva type prosjekt som skal meldast til og vurderast av Sikt" — scope (incl. whether ordinary course assignments count) is institution-specific, not fixed by Sikt itself.
   source: sikt.no/tjenester/personverntjenester-forskning — confidence: high
6. claim: Multiple universities (USN, VID, UiO, NTNU, UiS, HVL) tell students the Sikt notification duty applies to bachelor-/master-level student PROJECTS — but these describe degree-thesis/research-type student projects, not graded course/class coding assignments specifically; none of the retrieved pages explicitly addressed a non-thesis course project.
   source: usn.no, vid.no, uio.no, ntnu.no, uis.no — various dates, one 2021 UiS doc still naming "NSD" (likely outdated branding) — confidence: medium (secondary, genre not disambiguated)

**Bottom line Q2:** On Sikt's own primary source, the notification duty is explicitly framed as "for forsking" (for research), with "studentar" covered only "i forsking." Sikt's own page does not say the duty extends to ordinary graded course/class software projects not framed as research, and it delegates that scoping decision to each institution's agreement with Sikt. **Recommendation: the team should check directly with their course coordinator / institution's privacy-Sikt contact point whether this specific course counts as a project type covered by that institution's agreement** — this could not be resolved generically from Sikt's site alone.

## Q3: Does fictional/synthetic test data change any obligations?

7. claim: GDPR/Datatilsynet's core definition requires data to be linkable to "deg som enkeltperson" (you, an individual) — a real, existing individual; the fetched definition page is silent on fictional/synthetic data.
   source: datatilsynet.no personopplysninger page — 31.03.2025 — confidence: high on the definition text itself, gap on fictional-data application
8. claim: Helsedirektoratet's "Normen" testing guidance states: "syntetiske data er fiktive opplysninger laget for testformål, og de kan ikke identifisere fysiske personer og anses derfor ikke som personopplysninger" (synthetic data is fictional information created for testing purposes, cannot identify physical persons, and is therefore not considered personal data).
   source: helsedirektoratet.no/normen/testing-og-testdata-faktaark-43/ulike-datagrunnlag-ved-testing/syntetiske-data — confidence: medium-high, directly on point, but Helsedirektoratet not Datatilsynet/Sikt — only ONE directly-on-point Norwegian source, not two

**Bottom line Q3:** Purely fictional/synthetic data about made-up people is, per Helsedirektoratet and the general GDPR definitional structure, not personal data and not subject to GDPR. This rests on only one directly-on-point Norwegian source (per the pack's 2-source rule for regulatory claims, treat as plausible/well-supported but not fully double-sourced). Caution: data is only "synthetic" if genuinely decoupled from real people — lightly-modified real profiles can still count as personal data (unverified belief, not sourced this session).

## Q4: If team members test with their OWN real data, what minimal steps does Datatilsynet suggest?

9. claim: GDPR Art 2(2)(c) exempts processing by a natural person in a "purely personal or household activity" — commonly cited examples: personal address books, private photos, personal correspondence.
   source: general EU GDPR secondary sources (Irish DPC, GDPR.eu) — NOT a Norwegian Datatilsynet page — confidence: medium (settled EU law, Norway implements same Regulation, but no datatilsynet.no page found stating this directly this session)
10. claim: This household exemption is unlikely to cleanly cover the team's situation — once software is built to be used by others (classmates, graders, future users), a developer's own data within that system is arguably no longer "purely personal" even for that developer's own account, because the controller role attaches to the app/project, not private diary-keeping.
    source: inference from Art 2(2)(c) scope description in secondary legal commentary (Freevacy, TAG Alliances) — confidence: low-medium, flagged explicitly as inference applying the sourced rule to these facts, not a directly retrieved ruling on this exact scenario
11. claim: No Norwegian-specific minimum-content standard for a simple consent/info text found on datatilsynet.no; closest found was Danish Datatilsynet guidance (different jurisdiction) stating consent info should at minimum cover controller identity and purpose.
    source: Danish Datatilsynet samtykke guidance (wrong jurisdiction) + general GDPR Art.13 structure — confidence: low for Norway specifically — class: gap / non-Norwegian source only

**Bottom line Q4:** No Datatilsynet (Norway) guidance directly addressing "developer testing own app with own data" was found, nor a Norway-specific minimal consent/info template. GDPR Art.13's generic information-duty elements (who, what, why, legal basis, retention, rights, contact) is the EU-law fallback. Weakest-evidenced question in this dimension — would benefit from a direct follow-up to personverntjenester@sikt.no or the institution's data protection officer rather than further web search.

## Could not find
- A Datatilsynet.no page mirroring the Danish Datatilsynet's "GDPR guide for small/medium businesses," aimed at Norway.
- A Datatilsynet or Sikt page explicitly distinguishing "kursprosjekt"/"skoleoppgave" (course assignment) from "forskningsprosjekt"/"studentoppgave" (research/thesis project).
- A Norwegian Datatilsynet statement on the household/personal-use exemption as applied to software development/testing.
- A Datatilsynet-authored minimal consent/info-text template sized for a tiny non-commercial project.
- Independent second-source confirmation (beyond Helsedirektoratet) that fictional/synthetic data is categorically outside personopplysningsloven's scope.
