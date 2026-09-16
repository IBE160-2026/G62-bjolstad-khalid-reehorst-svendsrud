# Addendum: Prompt Force Product Brief

Supporting depth that doesn't belong in the brief itself but is useful for the PRD, architecture, and later scoping decisions.

## Original Concept Dump (source material)

Captured verbatim (Norwegian) from the initial conversation, for reference when writing downstream docs:

> Trening og kosthold hjelp. Hvordan mennesker kan oppnå gode resultater med dette på en enkel og opplysende måte. Inspirasjon fra Hevy + Lifesum. En nettside som kan gjøre at mennesker får bedre helse med bruk av strekkode, bilde av mat som regner ut kalorier ut ifra vekt, høyde, alder og aktivitetsnivå, og foreslå treningsøvelser ut ifra hva du har tilgjengelig hjemme eller på et treningssenter. Koble det opp mot helseopplysninger fra telefonen så man kan beregne når det er behov for restitusjon, slik som Body Battery-prinsippet til Garmin. Videoer om hvordan treningsøvelser skal utføres på en skadefri metode. En funksjon som kan filme seg selv slik man kan få gode tips på om man faktisk utfører øvelsen riktig. Gratisversjon: kalorier + strekkode-scanning. Pro-versjon: bilde-basert kaloriberegning + treningsprogram som foreslår når man bør øke vekter og repetisjoner over tid.

Full original feature list, for traceability against what got cut to Vision in the brief:
1. Barcode scanning for food logging
2. Photo-based calorie estimation (weight/height/age/activity-level adjusted)
3. Exercise suggestions based on available equipment (home or gym)
4. Phone health-data integration for recovery estimation (Garmin Body Battery-style)
5. Instructional videos for injury-free exercise technique
6. Self-recorded video with AI feedback on exercise form
7. Free tier: calorie calc + barcode scan
8. Pro tier: photo-based calorie estimation + auto-progressing training programs (weight/rep increases over time)

## Research Digest (web research, 2026-09-16)

**Confidence note:** most sources were third-party comparison/SEO sites, not primary sources (Hevy's/Lifesum's own listings). Treat exact prices as directional, verify before quoting externally.

**Hevy** — workout logging, routines, PR tracking, body measurements, social feed, muscle-group volume charts. Free tier capped (~4 routines, 7 custom exercises, 3 months history). Pro (~$3/mo or ~$75 lifetime, unverified) adds unlimited routines/history, muscle heatmaps, CSV export, and "Hevy Trainer" — adaptive programs with auto weight adjustment/exercise substitution, directly comparable to Prompt Force's planned pro auto-progression feature. Gaps: zero nutrition tracking, no recovery/HRV/sleep integration, no equipment-aware exercise selection help, no form-checking.

**Lifesum** — calorie/macro tracking, barcode scan (free), photo food recognition ("Life Scan," added 2025, Premium-only, ~$7.50/mo or ~$31–100/yr unverified), meal photo/voice/text logging, water tracker, diet plans, fitness-tracker sync. Validates the free (barcode) / pro (photo-AI) split in the brief. Photo recognition is decent on clean single-item photos of common dishes, weak on mixed bowls/portion sizing — an industry-wide limitation, not a Lifesum-specific weakness. Gaps: no workout-programming depth, no recovery/HRV features, no exercise-video coaching.

**Garmin Body Battery** — derived from continuous wrist optical HR → HRV (RMSSD), overnight sleep quality/duration, stress (HRV-pattern-derived), and activity/steps/intensity. Sleep is the dominant recharge window (a good night can add 40–60 points). Exact algorithmic weighting is proprietary/unpublished — not confidently known beyond the inputs above.
- **Implication:** true Body Battery-style estimation requires continuous beat-to-beat HRV capture, which phone-only sensors cannot provide (no continuous PPG skin contact). Minimal viable paths: (a) pull HRV + sleep from a wearable via Apple Health / Google Health Connect / Garmin Connect API, or (b) build an explicitly-simplified "readiness score" from self-report (sleep, soreness, stress check-in) + training load history, clearly not marketed as Body Battery-equivalent. This is why the brief pushes the feature to Vision and reframes it if ever attempted.

**AI feasibility — photo calorie estimation:** mainstream already. MyFitnessPal's Meal Scanner (2025, reportedly ~±19% error, misclassifies sides), Lifesum's Life Scan (immature), SnapCalorie (cited as most accurate specialist). A 2025 systematic review found accuracy correlations ranging 0.20–0.97 across studies depending on food type — single clean foods ~85–90% for common cuisines, mixed dishes and portion size remain the hard, unsolved problem industry-wide. A student project should target "good enough on simple foods," not high accuracy on mixed meals.

**AI feasibility — video form-checking:** an active, fairly crowded space already (Gymscore, FormCoach, Form Fix, Gymaholic, "Workout Trainer AI," all launched in 2025) using pose-estimation computer vision (MediaPipe/OpenPose-style) to score alignment/tempo/risk cues on barbell/dumbbell lifts. A *scoped* MVP (e.g., squat/deadlift depth + back-angle check only, on 1-2 exercises) is feasible within a semester using existing pose-estimation libraries. Full multi-exercise generalized feedback is a stretch goal, not baseline — this is why it's Vision-scoped in the brief.

**Closest existing combined competitors:** Bevel (recovery + sleep + nutrition + strength + AI coaching; went free late 2025; Pro ~$15/mo) and Cora (training + recovery + nutrition unified via Apple Health/Garmin/Whoop/Oura integration, from ~$10/mo) are the closest "do-it-all" products to the Prompt Force concept — worth a direct feature-comparison table if this moves toward a PRD. Sonar (wearable/biomarker aggregator) is adjacent but more data-hub than tracker. Whoop and Cronometer are relevant references for how they integrate multi-wearable HRV/recovery data, which Prompt Force would need to replicate or substitute for phone-only users if the recovery feature is ever pursued.

## Deferred-to-Vision Rationale (options considered)

| Feature | Why deferred from v1 | Condition to revisit |
|---|---|---|
| Body Battery-style recovery score | Requires continuous wearable HRV data the phone alone can't provide; risks overpromising accuracy | Team gets wearable API access (Health Connect/Apple Health) and time to validate a simplified readiness score |
| AI video form-check | Feasible only in a narrow scope (1-2 exercises); full version is a substantial CV effort for a one-semester team | Core nutrition+workout loop is solid early, freeing time for a scoped pose-estimation spike |
| Auto-adaptive training programs | Needs a working progression-tracking data model first; not a v1 blocker but adds real logic complexity | Workout logging and history are solid and tested |

## Open Questions for Downstream Work

- No official IBE160 course assignment/spec was available at brief time — the user chose to proceed open-scope. If a spec surfaces later, re-validate this brief's scope and success criteria against it.
- Exact monetization mechanics (pricing, payment provider) were not discussed — likely out of scope for a course project unless graded criteria require it.
- Team roles, individual skill areas, and timeline/milestones within the semester were not discussed in this session — worth covering in the PRD or a kickoff doc.
