---
title: "PRD: Prompt Force"
status: draft
created: 2026-11-02
updated: 2026-11-03
---

# PRD: Prompt Force

> **AI draft.** Written by Osman Khalid with Claude Code (`bmad-prd`, fast path) on 2026-11-02, from the product brief, the course feedback and the team's research. Decisions marked `[ASSUMPTION]` were inferred and must be confirmed by the group before the PRD is final (see §12).

## 0. Document Purpose

This PRD describes what Prompt Force v1 must do, for the IBE160 team (G62), the course staff and the next BMAD steps (UX, architecture, epics and stories). It builds on, and does not repeat:

- the product brief and addendum: `.docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/`
- the course feedback on the brief: `tilbakemelding-product-brief.md` in the same folder
- the research in `.docs/planning-artifacts/research/` (pre-PRD prep, training, GDPR, data licences, barcode library, login)
- the exercise list: `.docs/planning-artifacts/ovelsesliste.md`

Features are grouped in §4 with globally numbered requirements (FR-1 …). Terms in §3 are used exactly as defined. Technical detail that belongs in the architecture lives in `addendum.md`.

## 1. Vision

Prompt Force is a web app, run in the browser, that puts training and nutrition in one place for people who are new to structured training. A beginner sets up a profile and gets a daily calorie target they understand, logs food by searching or entering a barcode, gets exercise suggestions that fit the equipment they actually have, and logs their workouts. A daily overview ties it together.

It takes the best parts of two category leaders, Hevy's set-by-set workout logging and Lifesum's approachable food logging, and keeps only what a beginner needs. The difference from broader platforms such as Bevel and Cora is not more features but fewer: one simple app, honest guidance, and exercise suggestions based on the user's own equipment.

V1 is the core loop: **profile → calorie target → log food → log training → daily overview**. It must be finished, stable and tested. Photo-based calorie estimation and a free/pro split are phase 2 (§4.7) and are only started when the core loop is stable.

## 2. Target User

**Primary user:** beginners and lightly experienced exercisers in Norway who want to start training regularly and keep track of what they eat, without the overload of tools made for experienced users.

**Secondary user:** more experienced exercisers who want training and food in one place. They can use v1, but it is not designed around their needs.

**Other users of the app:** the course examiner (sensor), who must be able to run and test the app locally from the README.

### 2.1 Jobs To Be Done

- **Functional:** "Tell me which exercises I can do with what I have, and show me how." "Give me one calorie number I understand." "Let me log a meal in a few taps."
- **Emotional:** "Help me feel I'm doing it right and not getting hurt." "Don't overwhelm me."
- **Progress:** "Show me what I lifted last time so I know what to beat."

### 2.2 Non-Users (v1)

- Competitive athletes and experienced lifters who need programming, periodisation or detailed analytics.
- People who need medical or clinical nutrition advice (e.g. diabetes, eating disorders). The app gives general guidance only.
- Users under 16 (see §8.1).

### 2.3 Key User Journeys

- **UJ-1. Sara gets her first calorie target.**
  Sara, 23, has just bought a gym membership and has two dumbbells at home. She found MyFitnessPal "too much". On her phone she creates an account, accepts a short consent screen and enters weight, height, age, sex, activity level and goal ("lose weight"). The app shows one number, 1 640 kcal a day, with one sentence explaining what it means. She lands on an empty daily overview with a clear "log your first meal" prompt.
  **Edge case:** she is unsure what "moderately active" means. Each activity level has a plain-language example.

- **UJ-2. Sara logs her breakfast yoghurt.**
  Logged in on her laptop, she clicks "Add food" under Breakfast and types the barcode from the yoghurt cup. The product appears with kcal per 100 g. She adjusts the amount to 150 g and saves. The breakfast total and the daily overview update at once.
  **Edge case:** the barcode is not found. She sees "We couldn't find this product" and a button to register it manually, with the barcode already filled in. The app never shows an empty result or crashes.

- **UJ-3. Sara trains at home with what she has.**
  She chooses her saved equipment profile "Home" (dumbbells). The app lists only exercises she can do with dumbbells or bodyweight, beginner level first. She opens "Goblet squat", watches the embedded video and adds it to today's workout. While logging, she sees last week's 8 kg × 10. She logs 3 sets of 10 at 10 kg and finishes the workout.
  **Edge case:** travelling without dumbbells, she picks a bodyweight-only Equipment Profile and filters on "Shoulders". Nothing matches, and she gets a message saying so, not an empty list.

- **UJ-4. Sara checks her day in the evening.**
  She opens the daily overview: target 1 640 kcal, eaten 1 420 kcal, 220 kcal remaining, her meals and today's workout with sets, reps and weight. She can tap yesterday to see her history.

- **UJ-5. The examiner runs the app.**
  The examiner clones the repo, copies `.env.example` to `.env`, follows the README and starts the app without any of the team's API keys or paid accounts. They log in with a seeded test user who already has food and workout logs, and can run the automated tests.

## 3. Glossary

- **User** — a person with an account. Has one Profile, any number of Equipment Profiles, Food Log Entries and Workouts.
- **Profile** — the User's body data: weight (kg), height (cm), age (years), sex (male/female), Activity Level and Goal.
- **Activity Level** — one of five levels with a fixed factor: Sedentary 1.2, Light 1.375, Moderate 1.55, Very active 1.725, Extremely active 1.9.
- **Goal** — Lose weight (−500 kcal), Maintain weight (0), Gain weight (+300 kcal).
- **BMR** — basal metabolic rate, calculated with the Mifflin-St Jeor formula.
- **Calorie Target** — the User's daily kcal target: BMR × Activity Level factor + Goal adjustment, rounded to the nearest whole kcal.
- **Food Item** — a food with a name and nutrition per 100 g (kcal required; protein, carbohydrate and fat optional). Has a source: Open Food Facts, Matvaretabellen or User-created. May have a Barcode and a serving size.
- **Barcode** — the EAN-13 (or EAN-8) number on a packaged product.
- **Meal** — one of Breakfast, Lunch, Dinner, Snacks.
- **Food Log Entry** — one Food Item eaten by a User on a date, in a Meal, with an amount in grams. Its kcal = kcal per 100 g × grams / 100.
- **Exercise** — an entry in the fixed exercise list, with name, required Equipment (one or more), Muscle Group, Level, Exercise Type, short description and video link.
- **Equipment** — one of nine fixed types: bodyweight, dumbbells, barbell and plates, bench, kettlebell, resistance band, pull-up bar, cable machine, leg press/machines. Bodyweight is always available.
- **Equipment Profile** — a named set of Equipment saved by a User, e.g. "Home" or "Gym".
- **Muscle Group** — Legs, Back, Chest, Shoulders, Arms or Core.
- **Level** — Beginner, Intermediate or Advanced.
- **Exercise Type** — Reps (logged as reps and optional weight) or Time (logged as seconds), e.g. plank.
- **Exercise Suggestion** — an Exercise shown to the User because their chosen Equipment Profile contains all the Equipment it requires.
- **Workout** — one training session by a User on a date. Contains Workout Exercises in order.
- **Workout Exercise** — one Exercise inside a Workout. Contains Sets.
- **Set** — one set of a Workout Exercise: set number, and reps + weight (kg) or seconds, depending on Exercise Type.
- **Daily Overview** — the screen that shows one date's Calorie Target, kcal eaten, kcal remaining, Food Log Entries by Meal and the Workout(s).
- **Seed Data** — fictional test users, food and workouts loaded into a local database for testing and grading.
- **Mock Mode** — a mode where an external service is replaced by a fixed test answer, so the app works without keys or network.
- **Pro Flag** — (phase 2) a yes/no field on the User that unlocks pro features. No payment.

## 4. Features

### 4.1 Account and Privacy

**Description:** A User registers with email and password and logs in to reach their own data. Before any health data is stored, the User gives explicit consent on a short, plain-language screen. The User can delete individual logs and their whole account. Realizes UJ-1, UJ-5.

#### FR-1: Register and log in
A visitor can create an account with email and password, log in and log out.
- Passwords are stored only as a salted hash (Argon2id or bcrypt), never in plain text.
- Login with a wrong email or a wrong password gives the same generic error message (no account enumeration).
- Repeated failed logins for one account are rate-limited.
- The session is kept in an HttpOnly, Secure, SameSite cookie, not in localStorage.

#### FR-2: Consent before health data
Before a User enters Profile data for the first time, the app shows a consent screen that names what is stored (body data, food logs, workout logs) and why, and requires an active choice (unticked checkbox + button).
- The User cannot create a Profile without giving consent.
- The time of consent is stored.

#### FR-3: Users see only their own data
A User can only read and change their own Profile, Equipment Profiles, Food Log Entries and Workouts.
- A request for another User's data is rejected and returns no data.

#### FR-4: Delete data
A User can delete a single Food Log Entry, a single Set, a whole Workout and their whole account.
- Deleting the account removes the User's Profile, Equipment Profiles, logs and User-created Food Items, or makes them unrecoverable, within 30 days `[ASSUMPTION: soft-delete at once, hard-delete by script; see research GDPR]`.
- A deleted account can no longer log in.

### 4.2 Profile and Calorie Target

**Description:** The User enters body data, Activity Level and Goal, and gets one daily Calorie Target, explained in plain Norwegian. Realizes UJ-1.

#### FR-5: Create and edit Profile
A User can enter and later edit weight, height, age, sex, Activity Level and Goal.
- Each Activity Level shows a short everyday example (e.g. "Moderate: training 3–5 days a week").
- Values outside a sensible range are rejected with a clear message: weight 30–300 kg, height 100–250 cm, age 16–100 `[ASSUMPTION: weight and height ranges]`.

#### FR-6: Calculate Calorie Target
The system calculates the Calorie Target with Mifflin-St Jeor:
BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + 5 (male) or − 161 (female).
Calorie Target = BMR × Activity Level factor + Goal adjustment, rounded to the nearest whole kcal, but never below a floor of 1 200 kcal (female) or 1 500 kcal (male).

**Consequences (testable):** with Goal = Maintain, these profiles give exactly the expected target:

| Profile | Sex | Weight | Height | Age | Activity Level | BMR | Calorie Target |
|---|---|---|---|---|---|---|---|
| 1 | Male | 80 kg | 180 cm | 25 | Moderate (1.55) | 1805 | 2798 kcal |
| 2 | Female | 65 kg | 165 cm | 30 | Light (1.375) | 1370.25 | 1884 kcal |
| 3 | Male | 95 kg | 178 cm | 50 | Sedentary (1.2) | 1817.5 | 2181 kcal |
| 4 | Female | 55 kg | 160 cm | 22 | Very active (1.725) | 1279 | 2206 kcal |

- Profile 1 with Goal = Lose gives 2298 kcal; with Goal = Gain it gives 3098 kcal.
- Floor: female, 45 kg, 150 cm, 60 years, Sedentary, Goal = Lose gives 612 kcal by the formula, so the Calorie Target is 1 200 kcal and the app says that the floor was used.
- For a User aged 16–17, the Calorie Target is shown with a note that it is a rough estimate, because the formula is validated for adults `[ASSUMPTION]`.
- Sex is required in v1, with a short explanation that the formula needs it `[ASSUMPTION: interim answer to §11 Q6]`.
- Changing the Profile recalculates the Calorie Target immediately.

#### FR-7: Explain the Calorie Target
The app shows the Calorie Target as one number with one or two plain-language sentences about what it means, without technical terms such as BMR on the main screen.

### 4.3 Food Logging

**Description:** The User logs what they eat into Meals, by scanning a barcode, searching or registering a food manually. Speed matters most: recently used foods are one tap away. Realizes UJ-2, UJ-4.

#### FR-8: Log food by scanning a barcode
A User can open the phone camera from a Meal, scan a Barcode and get the Food Item with kcal per 100 g.
- The system first looks up the Barcode among shared Food Items (Open Food Facts and Matvaretabellen) and the User's own Food Items, never other Users' Food Items; only if it is not found does it ask Open Food Facts, and then saves the result as a shared Food Item.
- Camera scanning is a **Should**. The app is run in a browser on a PC (that is how the examiner runs it), so FR-9 (type the barcode) and FR-11 (search) are the main food-logging path, and camera scanning is an extra where the browser and camera allow it (HTTPS or localhost). Changed 2026-11-03; see §11 Q2.

#### FR-9: Type the barcode by hand
If the camera does not work or is not allowed, the User can type the Barcode number and get the same result as a scan.

#### FR-10: Barcode not found
When a Barcode is not found, or the product has no kcal value, the User gets a clear message and a button to register the Food Item manually with the Barcode already filled in.
- The app never crashes or shows an empty result.
- If Open Food Facts cannot be reached, the User gets a message and can still register manually.

#### FR-11: Search for food
A User can search Food Items by name. The search covers the app's own database: a seeded selection of common Norwegian foods from Matvaretabellen, Food Items found earlier via Open Food Facts, and the User's own Food Items.
- Matching is case-insensitive and finds names that contain the search text; the User's recently used Food Items are listed first.
- Search does not call Open Food Facts while the User types.

#### FR-12: Register a food manually
A User can create their own Food Item with name and kcal per 100 g (protein, carbohydrate, fat and serving size optional), and log it.
- A User-created Food Item is visible only to that User.

#### FR-13: Choose amount and Meal
When logging, the User chooses the Meal and the amount in grams. If the Food Item has a serving size, the User can choose servings instead, and the app converts to grams.
- The Food Log Entry's kcal is calculated from the amount and shown before saving.

#### FR-14: Recently used foods
When adding food, the User sees their most recently logged Food Items and can log one again with one tap (same amount as last time, editable).

#### FR-15: Edit and delete Food Log Entries
A User can change the amount or Meal of a Food Log Entry, or delete it. The Daily Overview updates at once.

#### FR-16: Show data sources
Where Open Food Facts or Matvaretabellen data is shown, the app shows the required attribution ("Data from Open Food Facts" and "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no").

**Notes:** Protein, carbohydrate and fat are stored when available but only kcal is shown in v1 `[ASSUMPTION]`.

### 4.4 Exercise Library and Suggestions

**Description:** The app has a fixed list of exercises, each tagged with required Equipment, Muscle Group, Level and Exercise Type, and linked to an instructional video. The User saves Equipment Profiles and gets Exercise Suggestions that fit. Realizes UJ-3.

#### FR-17: Fixed exercise list
The system contains a fixed list of 30–50 Exercises, starting from the 34 in `ovelsesliste.md`. Users cannot add their own Exercises in v1.
- Each Exercise has name, required Equipment, Muscle Group, Level, Exercise Type, a short technique description and a video link.

#### FR-18: Equipment Profiles
A User can create, rename, edit and delete Equipment Profiles by ticking Equipment from the fixed list.
- New Users get two suggested Equipment Profiles, "Home" (bodyweight only) and "Gym" (all Equipment), which they can edit `[ASSUMPTION]`.
- Bodyweight is always included and cannot be removed.

#### FR-19: Exercise Suggestions
When the User chooses an Equipment Profile, the app shows only Exercises whose required Equipment is all contained in that Equipment Profile.
- Example test: a User with only dumbbells is not suggested barbell deadlift.
- Beginner Exercises are listed first, then Intermediate, then Advanced.

#### FR-20: Filter suggestions
The User can filter Exercise Suggestions by Muscle Group and Level.
- If no Exercise matches, the User sees a message explaining why and what to change, never an empty list.

#### FR-21: Exercise detail with video
The User can open an Exercise and see the technique description and an embedded video (youtube-nocookie).
- If the video cannot load, the description and data are still shown.

**Notes:** Coverage gaps found in the research: Users with only bodyweight, only a kettlebell or only a pull-up bar get no Shoulder or Arm exercises. The group should add 3–6 Exercises before the list is final (e.g. pike push-up, diamond push-up, kettlebell press) `[NOTE FOR PM]`.

### 4.5 Workout Logging

**Description:** The User logs a Workout set by set, like Hevy. They see what they did last time, and beginners get sensible defaults. Realizes UJ-3, UJ-4.

#### FR-22: Start and build a Workout
A User can start a Workout for a date and add Exercises to it, either from Exercise Suggestions or from the full list. The User can reorder and remove Workout Exercises.

#### FR-23: Log Sets
For each Workout Exercise the User can add, edit and delete Sets.
- Exercise Type Reps: reps (required) and weight in kg (optional; empty means bodyweight).
- Exercise Type Time: seconds (required).
- When an Exercise is added, it starts with 3 empty Sets with 10 reps suggested `[ASSUMPTION: ACSM beginner range 8–12, to verify against the original]`.

#### FR-24: Show last time
While logging a Workout Exercise, the User sees the Sets from the last time they did the same Exercise (date, reps/weight or seconds), if any.

#### FR-25: Finish and edit Workouts
A User can finish a Workout and later open it to edit or delete Sets, Workout Exercises or the whole Workout.

### 4.6 Daily Overview and History

**Description:** One screen per date that answers "how is my day going?". Realizes UJ-1, UJ-4.

#### FR-26: Daily Overview
For a chosen date (today by default) the app shows: Calorie Target, kcal eaten, kcal remaining, Food Log Entries grouped by Meal with a kcal total per Meal, and that date's Workout(s) with Exercises, Sets, reps, weight or seconds.
- kcal eaten = sum of the date's Food Log Entries; kcal remaining = Calorie Target − kcal eaten (may be negative and is then shown as "over").
- Training does not add kcal to the target, because the Activity Level already includes activity `[ASSUMPTION]`.

#### FR-27: Move between dates
The User can move to earlier dates (previous day, or pick a date) and see the Daily Overview for that date.

#### FR-28: Empty states
A new User, or a date without logs, sees short prompts ("Log your first meal", "Start a workout") instead of empty tables.

### 4.7 Phase 2 (only after the core loop is stable)

**Description:** Two features from the brief that are planned but not part of v1. They are specified here so the architecture leaves room for them. Work starts only when FR-1 to FR-28 are done and tested.

#### FR-29: Photo-based calorie estimate (Pro)
A User with the Pro Flag can take a photo of a single, clearly visible food item and get an estimated food name and kcal.
- The result is always labelled as an estimate, and the User can correct name, amount and kcal before saving.
- Mock Mode is the default: without an API key, the feature returns a fixed test answer.
- The image model is chosen in the architecture phase.

#### FR-30: Pro Flag
A User has a Pro Flag (default off) that unlocks FR-29. There is no payment; the flag is set in Seed Data or by a developer.
- A User without the Pro Flag who opens FR-29 sees that it is a pro feature, and no image is sent anywhere.

## 5. Cross-Cutting Non-Functional Requirements

- **NFR-1 Runs in the browser:** all v1 screens work in current desktop browsers (Chrome, Safari, Firefox, Edge). The layout also adapts to narrow screens down to 360 px, but there is no native app. Camera scanning (FR-8) needs HTTPS or localhost.
- **NFR-2 Language:** all UI text is in Norwegian (bokmål). Exercise names are Norwegian, with the English name in brackets where helpful.
- **NFR-3 Runnable from the README:** a new developer or examiner can start the app locally by following the README, with `.env.example` and no team API keys, paid accounts or private services. Target: under 20 minutes on a clean machine.
- **NFR-4 Seed Data:** a seed script creates fictional test users with Profiles, Equipment Profiles, Food Log Entries and Workouts across several dates (and in phase 2 one Pro user).
- **NFR-5 Replaceable external services:** Open Food Facts and (phase 2) the image model are called through separate modules that can be replaced by mocks in tests. Automated tests never call a real external service.
- **NFR-6 Open Food Facts rules:** the app sends its own User-Agent, stays under 15 product lookups a minute, caches every product it has looked up, and shows the ODbL attribution.
- **NFR-7 Secrets:** passwords, API keys and database connection strings are never committed. They live only in `.env` (git-ignored) and in the hosting provider's environment variables.
- **NFR-8 Testability:** calorie calculation (FR-6), Exercise Suggestions (FR-19, FR-20), kcal sums (FR-13, FR-26), access control (FR-3) and the not-found barcode path (FR-10) have automated tests.
- **NFR-9 Responsiveness:** a saved Food Log Entry or Set appears in the Daily Overview without a manual page reload.
- **NFR-10 Accessibility:** form fields have labels, buttons are large enough to tap on a phone, and text has sufficient contrast `[ASSUMPTION: aim for WCAG 2.1 AA basics, not a full audit]`.

## 6. Constraints and Guardrails

### 6.1 Privacy

- Weight, food and training logs tied to a person are treated as health data (GDPR art. 9) and handled with explicit consent (FR-2), data minimisation and deletion (FR-4).
- Only the fields the features need are stored. No location, contacts, photos (except phase 2, not stored after estimation `[ASSUMPTION]`) or birth date (age is enough).
- All data in the repo and in Seed Data is fictional.
- `[NOTE FOR PM]` Ask the course coordinator whether a course project like this must be reported to Sikt. The research could not answer this.

### 6.2 Cost

- V1 uses only free services: Open Food Facts (no key), Matvaretabellen (open data), YouTube embeds.
- Phase 2's image model is paid per call, so Mock Mode is the default and real calls only happen when a key is set.

### 6.3 Data licences

- Matvaretabellen: attribution required ("Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no").
- Open Food Facts: ODbL, attribution required.
- Exercise videos are linked/embedded from YouTube, not copied. No images from free-exercise-db are used.

### 6.4 Safety

- Exercise content is general guidance. The app shows a short note that it does not replace a doctor or physiotherapist, and recommends beginners start light.
- The Calorie Target has a safety floor of 1 200 / 1 500 kcal (see FR-6) `[ASSUMPTION]`.

## 7. Platform

A web app that runs in the browser, mainly on a PC or laptop, since the submission requires that the app runs in a browser and the examiner runs it locally. The layout adapts to smaller screens. No native app, PWA or offline mode in v1. Hosting: the course's Vercel setup for the group repo; local running per NFR-3 is what grading relies on.

## 8. Non-Goals (Explicit)

- Not a medical or clinical nutrition tool.
- Not a training-programme generator: no automatic progression of weights or reps, no planned workouts or schedules.
- No social features, sharing, feeds or leaderboards.
- No wearable or phone-health integration, recovery score or "Body Battery".
- No AI form-checking on video.
- No payment.
- No water, body measurement or progress-photo tracking.
- No notifications or reminders.

### 8.1 Out of scope for v1 within features

- Calories burned from training (FR-26).
- Showing macros (stored only, FR-16 notes).
- User-created Exercises (FR-17).
- Rest timer, warm-up sets, RPE and supersets (FR-23).
- Users under 16 (FR-5). Users aged 16–17 get a rough-estimate note on the Calorie Target (FR-6).

## 9. MVP Scope

### 9.1 In scope (v1, must be finished and stable)

**Priority.** All FRs below are **Must** except these **Should** items, which are cut first if time runs out: FR-8 (camera scanning), FR-14 (recent foods), FR-20 (filters), FR-24 (show last time), FR-27 (move between dates). FR-9 and FR-11 are the main food-logging path.


- Account, consent and deletion (FR-1 – FR-4)
- Profile and Calorie Target with Goal (FR-5 – FR-7)
- Food logging: scan, type barcode, search, manual, Meals, recent foods (FR-8 – FR-16)
- Fixed exercise list, Equipment Profiles, Exercise Suggestions, videos (FR-17 – FR-21)
- Workout logging with last-time values (FR-22 – FR-25)
- Daily Overview and history (FR-26 – FR-28)
- Mobile-friendly, Norwegian UI, runnable from the README with Seed Data (NFR-1 – NFR-10)

### 9.2 Phase 2 (only when v1 is stable)

- Photo-based calorie estimate with Mock Mode (FR-29)
- Pro Flag (FR-30)

### 9.3 Vision (not planned)

Recovery score from wearables, AI form-checking, adaptive training programmes, payment, native app. See the brief's addendum for the reasons and the conditions to revisit.

## 10. Success Metrics

This is a course project, so success is measured on the finished prototype, not on real users.

**Primary**
- **SM-1: The core loop works end to end.** A seeded test user can complete UJ-1 to UJ-4 on a real phone without errors. Validates FR-1 – FR-28.
- **SM-2: The Calorie Target is correct.** All four test profiles in FR-6 pass as automated tests. Validates FR-6.
- **SM-3: The examiner can run it.** A team member who did not set up the project runs the app from the README on a clean machine in under 20 minutes. Validates NFR-3, NFR-4.

**Secondary**
- **SM-4: Barcode lookup works.** At least 8 of 10 common Norwegian products are found when their barcode is typed in (or scanned, if FR-8 is built); the rest end in the manual path (FR-10). Validates FR-8 – FR-10.
- **SM-5: Suggestions are correct.** Automated tests for each Equipment Profile in the research coverage table give exactly the expected Exercises. Validates FR-19.
- **SM-6: Fast logging.** Logging a recently used food takes at most 3 taps from the Daily Overview. Validates FR-14.
- **SM-7: Beginners understand it.** 3–5 beginners outside the group complete UJ-1 to UJ-3 on their own phone without help, and can explain their Calorie Target in their own words. Validates the beginner focus in §1 and §2.1.

**Counter-metrics (do not optimise)**
- **SM-C1: Number of features.** More features do not improve the grade if the core loop is unstable; do not start phase 2 to raise feature count. Counterbalances SM-1.
- **SM-C2: Number of Exercises.** Do not grow the list beyond 50; a small, checked list with good videos beats a long one. Counterbalances SM-5.
- **SM-C3: Test count.** Many shallow tests are worth less than tests of the rules in NFR-8. Counterbalances SM-2, SM-5.

## 11. Open Questions

1. Does a course project storing health-like data need to be reported to Sikt? Ask the course coordinator. (Owner: group)
2. Which barcode library should camera scanning use? Quagga2 is recommended. Since 2026-11-03 camera scanning is a Should (FR-8), so this no longer blocks the architecture. (Owner: architecture phase)
3. How well does Open Food Facts cover Norwegian products? Test 10–15 products from Rema, Kiwi and Coop. (Owner: food side)
4. Which 3–6 Exercises are added to close the Shoulder/Arm gaps, and should an Exercise be able to have more than one Muscle Group (e.g. deadlift)? (Owner: training side)
5. Is the ACSM range of 8–12 reps for beginners confirmed in the original 2009 position stand? (Owner: training side)
6. What should happen when a User does not want to give their sex? The formula needs it. (Owner: group)
7. Tech stack and who works on what: food side and training side, two and two? (Owner: group, architecture phase)
8. Have all 34 exercise videos been watched and approved by someone in the group? (Owner: group)

## 12. Assumptions Index

- §4.1 FR-4 — Account deletion: soft-delete at once, hard-delete by script within 30 days.
- §4.2 FR-5 — Valid ranges: weight 30–300 kg, height 100–250 cm.
- §4.3 Notes — Macros stored, only kcal shown.
- §4.4 FR-18 — New Users get "Home" and "Gym" Equipment Profiles by default.
- §4.5 FR-23 — Default 3 Sets × 10 reps for new Workout Exercises (ACSM, to verify).
- §4.6 FR-26 — Training does not add kcal to the target.
- §5 NFR-10 — Accessibility at WCAG 2.1 AA basics level.
- §6.1 — Phase 2 photos are not stored after estimation.
- §4.2 FR-6 / §6.4 — Calorie Target floor of 1 200 / 1 500 kcal.
- §4.2 FR-6 — Sex is required in v1 (interim answer to §11 Q6).
- §4.2 FR-6 — Calorie Target for Users aged 16–17 shown with a "rough estimate" note.

Confirmed by Osman Khalid on 2026-11-02 (no longer assumptions): Goal adjustment (−500 / 0 / +300), Meals with grams, saved Equipment Profiles, Norwegian UI, minimum age 16.

Changed by Gustav Reehorst on 2026-11-03: the FR-8 assumption (scanning works on iPhone Safari and Android Chrome) is removed. The submission requires that the app runs in a browser and the examiner runs it on a PC, so camera scanning is now a Should, and typing the barcode (FR-9) and search (FR-11) are the main path. Updated in §1, UJ-2, FR-8, NFR-1, §7, §9.1, SM-4 and §11 Q2.
