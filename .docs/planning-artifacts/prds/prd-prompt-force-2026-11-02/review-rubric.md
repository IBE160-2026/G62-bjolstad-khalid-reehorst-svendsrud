# PRD Quality Review — Prompt Force

## Overall verdict
This is a good PRD for a graded four-person, one-semester course project. It has a clear thesis (a beginner-first core loop: profile → calorie target → log food → log training → daily overview), a strong Glossary, a fully worked FR-6 test table whose arithmetic is all correct, explicit Non-Goals, and Phase 2 kept apart behind a counter-metric. Two things put it at risk. First, all 28 v1 FRs are "must be finished and stable" and there is no cut line, even though barcode scanning still depends on an unproven mobile spike. Second, some behaviour rules sit outside the FRs that downstream stories will test, such as the calorie floor and the note for 16–17-year-olds. Neither problem is structural, and both can be fixed in an afternoon.

## Decision-readiness — adequate
Decisions are stated as decisions. The addendum's "Options considered" table (addendum §H) names what was given up: ticking equipment every time, one list per day, maintenance-only targets and an English UI. The confirmed-decisions line under §12 turns earlier assumptions into commitments. The Open Questions in §11 are genuinely open and each has an owner. Both `[NOTE FOR PM]` callouts sit at real tensions: Sikt reporting in §6.1 and exercise coverage gaps in the §4.4 Notes.

The weak spot is one open question that blocks a core FR without any interim decision.

### Findings
- **[medium]** Undisclosed sex blocks FR-5/FR-6 with no interim default (§11 Q6, §3 Profile, FR-6). The Glossary fixes sex as "(male/female)", and FR-6's formula needs it. Q6 asks "What should happen when a User does not want to give their sex?" but gives no default, so FR-5 cannot be built or tested without guessing. *Fix:* record an interim decision, e.g. "v1: sex is required, and the field explains why the formula needs it", tag it `[ASSUMPTION]`, and keep Q6 open for revisiting.
- **[low]** Multi-muscle Exercises are left undecided while the data model already assumes one (§11 Q4, §3 Exercise "Muscle Group" singular, addendum §A). If the answer is "yes", the Glossary, FR-20 filtering and the data model all change. *Fix:* pick v1 behaviour now (e.g. one primary Muscle Group) and record the alternative as deferred.

## Substance over theater — strong
There is one persona, Sara, and she drives real decisions: the dumbbells-at-home scenario (UJ-3), the "MyFitnessPal too much" framing (UJ-1) and the edge cases. UJ-5, the examiner, is a sharp, project-specific addition that directly produces NFR-3, NFR-4 and Mock Mode. The NFRs carry thresholds rather than boilerplate: 360 px (NFR-1), under 20 minutes (NFR-3), 15 lookups a minute (NFR-6) and no reload (NFR-9). The Vision could not be swapped into another fitness PRD unchanged.

### Findings
- **[low]** The equipment-based differentiation claim is overstated (§1 "exercise suggestions based on the user's own equipment" as the difference). The addendum itself credits the saved-equipment pattern to Fitbod (addendum §H). The real differentiator is the combination: beginner-only scope plus food and training in one app. *Fix:* reword §1 to claim the combination, not equipment-based suggestions as novel.

## Strategic coherence — adequate
The thesis is explicit: fewer features, honest guidance, built for beginners. Feature order follows the core loop, not ease of building. SM-C1 to SM-C3 are good counter-metrics that fit a course grading context; SM-C1 explicitly guards against starting Phase 2 to pad the feature count. The MVP is a problem-solving MVP, and §9 is consistent with that.

The gap is that every Success Metric checks functional correctness. None checks the beginner thesis itself: "one number I understand", "don't overwhelm me".

### Findings
- **[medium]** No metric validates the beginner thesis (§10 SM-1–SM-6 vs §1, §2.1 JTBD). The PRD bets on beginners understanding the Calorie Target and not feeling overwhelmed, yet SM-1 to SM-6 would all pass even if a real beginner found the app confusing. *Fix:* add one cheap secondary metric that fits a course project, e.g. "SM-7: 3–5 people outside the group, new to structured training, complete UJ-1 and UJ-2 unaided and can explain their Calorie Target in their own words."

## Done-ness clarity — adequate
Several FRs are excellent. FR-6 has a worked table with four profiles plus Lose/Gain variants. FR-19 has a concrete negative test ("not suggested barbell deadlift"). FR-26 defines kcal remaining, including the negative case. NFR-8 lists exactly which rules need automated tests. Other FRs still leave the engineer guessing, and two calorie rules live outside the FR that stories will be cut from.

### Findings
- **[high]** The calorie floor and the age note are behaviour rules with no FR or test case (§6.4, §8.1 vs FR-6, §3 Calorie Target). §6.4 says the target "is never set below 1 200 kcal (female) / 1 500 kcal (male)… the app uses the floor and says so". §8.1 adds a "rough estimate" note for ages 16–17. Neither appears in FR-6 or FR-5, the Glossary definition of Calorie Target leaves out the floor, and the FR-6 table has no floor row. A story cut from FR-6 will miss both rules. *Fix:* move both rules into FR-6 (or FR-7) as consequences, update the Glossary definition, and add a test row, e.g. Female, 45 kg, 150 cm, 60 years, Sedentary, Lose: BMR 926.5 → 1111.8 − 500 = 612 → floor 1 200 kcal plus message.
- **[medium]** The ±1 % tolerance contradicts the exact formula (FR-6 "within ± 1 %" vs "rounded to the nearest whole kcal"). For Profile 1, 1 % is ±28 kcal, so a wrong activity factor or rounding bug could still pass. SM-2 depends on this test. *Fix:* require an exact match to the rounded integer values in the table.
- **[medium]** The barcode lookup scope conflicts with User-created privacy (FR-8 "first looks up the Barcode in its own database" vs FR-12 "A User-created Food Item is visible only to that User", FR-10 manual registration with the barcode prefilled). It is undefined whether User A's scan can match User B's private item with the same barcode. *Fix:* state that lookup covers shared items (Open Food Facts cache, Matvaretabellen) plus the scanning User's own items only.
- **[medium]** Search has no matching rules (FR-11). Partial versus whole-word matching, case and æ/ø/å handling, result order (own items first?) and a result cap are all unspecified, and FR-11 sits on the main food-logging path. *Fix:* add 2–3 consequences, e.g. "case-insensitive substring match; 'egg' finds 'Egg, kokt'; at most 20 results; the User's own items first."
- **[low]** Adjectives where a bound is needed: FR-1 "rate-limited" (how many attempts in what window?), FR-14 "most recently logged Food Items" (how many?), FR-19 ordering within a Level, and NFR-10 "large enough to tap" / "sufficient contrast". *Fix:* give numbers, e.g. 5 failed logins per 15 minutes, the last 10 items, alphabetical within each Level, 44×44 px targets and 4.5:1 contrast.
- **[low]** The UJ-3 edge case contradicts the coverage data (UJ-3: filtering on "Shoulders" with dumbbells gives nothing, vs addendum §G: "Home: dumbbells" has no gaps). *Fix:* change the edge case to a profile that really has a gap, e.g. kettlebell-only, or to Level = Advanced.

## Scope honesty — adequate
Omissions are explicit: §8 Non-Goals, §8.1 per-feature exclusions with FR back-references, Phase 2 gated by "only when FR-1 to FR-28 are done and tested", and §9.3 for the vision items. The Assumptions Index matches the inline tags exactly (11 of 11). The open-items count (8 Open Questions, 11 assumptions, 2 `[NOTE FOR PM]`) is acceptable for a course PRD.

What is missing is honesty about size. v1 includes custom authentication, GDPR consent and deletion, camera barcode scanning, three food sources, a 30–50-exercise library with video, set-by-set workout logging and dated history. For four students in one semester that is substantial, and the PRD treats all of it as equally required.

### Findings
- **[high]** There is no priority or cut line inside v1 (§9.1 "must be finished and stable", FR-1–FR-28). The brief says v1 must be small and testable, yet every one of the 28 FRs carries the same weight. FR-8 depends on a library that is "Not proven on iOS Safari" (addendum §B, §11 Q2), and the PRD does not say what ships if the spike fails or time runs out. *Fix:* tag each v1 FR as must or should. Plausible candidates for should: FR-13 servings, FR-14, FR-18 rename and defaults, FR-21 embedded video, FR-27 date picker. Also state that if the spike fails, FR-9 (typed barcode) plus FR-11 is the accepted fallback, and that FR-8 then moves to "should".

## Downstream usability — adequate
This PRD is chain-top (UX → architecture → epics, §0), so traceability matters. The Glossary is strong and mostly used verbatim. FR, NFR, UJ and SM IDs are contiguous and unique. Each feature section states which UJs it realizes, and every SM names the FR or NFR it validates. Addendum §A gives architecture a clean starting data model. The problems are a couple of broken section references (see Mechanical notes) and one SM whose oracle lives in an artifact that is about to change.

### Findings
- **[medium]** SM-5's oracle is unstable and only gives counts (SM-5 "give exactly the expected Exercises" using "the research coverage table"). Addendum §G gives counts, not exercise lists, and is based on the 34-exercise list that §4.4 Notes and §11 Q4 say will grow by 3–6. *Fix:* say the expected sets are a test fixture derived from the final `ovelsesliste.md`, and that fixture must be checked in before SM-5 counts.
- **[low]** SM-1 contradicts UJ-1 (SM-1 "A seeded test user can complete UJ-1 to UJ-4" vs UJ-1, which is creating a new account with a consent screen). *Fix:* "A new user completes UJ-1; a seeded test user completes UJ-2 to UJ-4."

## Shape fit — strong
This is a consumer product with meaningful UX, so UJs with a named protagonist are load-bearing, and they are present: Sara, plus the examiner. Rigor is pitched about right for a course project. Technical detail is pushed into the addendum, Phase 2 is specified only enough for the architecture to leave room for it, and there is no over-formalisation.

### Findings
- **[low]** The UI strings are in English while NFR-2 requires Norwegian (UJ-2 "We couldn't find this product", FR-28 "Log your first meal", FR-16 attribution). Downstream UX may copy them verbatim. *Fix:* add a §0 note that quoted UI text is illustrative and translated, or give the Norwegian strings.

## Mechanical notes
- **FR-6 arithmetic: all correct.** P1: 800 + 1125 − 125 + 5 = 1805; × 1.55 = 2797.75 → 2798. Lose 2297.75 → 2298; Gain 3097.75 → 3098. P2: 650 + 1031.25 − 150 − 161 = 1370.25; × 1.375 = 1884.09 → 1884. P3: 950 + 1112.5 − 250 + 5 = 1817.5; × 1.2 = 2181. P4: 550 + 1000 − 110 − 161 = 1279; × 1.725 = 2206.28 → 2206. UJ-4: 1 640 − 1 420 = 220. Correct.
- **UJ-1's 1 640 kcal cannot be reproduced** because Sara's weight and height are not given. It is plausible: e.g. about 60 kg, 169 cm, Moderate, Lose ≈ 1 641. *Fix:* state her inputs so UJ-1 can double as a test case.
- **Broken cross-references:** the header says assumptions are confirmed "(see §11)", but the Assumptions Index is §12 (§11 is Open Questions). FR-8 says "pending the mobile spike; see §10", but §10 is Success Metrics; the spike is §11 Q2 and addendum §B. §8.1 "FR-16 notes" refers to the §4.3 Notes block, which follows FR-16; acceptable, but "§4.3 Notes" is clearer.
- **ID continuity:** FR-1–FR-30, NFR-1–NFR-10, UJ-1–UJ-5, SM-1–SM-6 and SM-C1–SM-C3 are contiguous with no duplicates. All FR, NFR and SM cross-references resolve.
- **Assumptions Index roundtrip:** all 11 inline `[ASSUMPTION]` tags are indexed and every index entry appears inline. OK.
- **Glossary drift (low):** "daily overview" is lowercase in UJ-1, UJ-2 and UJ-4 and "calorie target" in §1 (the Glossary has "Daily Overview" and "Calorie Target"). "moderately active" (UJ-1) vs "Moderate" (§3). "Goal = Maintain / Lose / Gain" (FR-6) vs "Maintain weight / Lose weight / Gain weight" (§3). "visitor" (FR-1) is not a Glossary term. Addendum §G uses "Equipment profile".
- **Attribution text mismatch:** FR-16 has "Matvaretabellen 2026. Mattilsynet", while §6.3 has "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no". Pick one.
- **Minor:** UJ-3's "Home" profile contains dumbbells, while FR-18's default "Home" is bodyweight only. This is consistent only if Sara edited it; say so in UJ-3. Addendum §E lists CSRF protection, which FR-1 does not mention; consider adding it as a consequence.
- **Required sections:** all present for the stakes and product type (Vision, users, UJs, Glossary, FRs, NFRs, constraints, Non-Goals, MVP scope, SMs with counter-metrics, Open Questions, Assumptions Index).
