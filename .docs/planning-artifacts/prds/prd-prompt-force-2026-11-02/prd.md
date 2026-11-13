---
title: "PRD: Prompt Force"
status: final
created: 2026-11-02
updated: 2026-11-13
---

# PRD: Prompt Force

> **Origin.** First drafted by Osman Khalid with Claude Code (`bmad-prd`, fast path) on 2026-11-02 from the product brief, the course feedback and the team's research. The group reviewed every assumption on 2026-11-12 (see `gjennomgang-torsdag-2026-11-12.md`), and the course lecturer's formative feedback (`tilbakemelding-prd.md`) was applied on 2026-11-13. Status: final.

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
  She chooses her Equipment Profile "Home", which she has edited to add her dumbbells. The app lists only exercises she can do with dumbbells or bodyweight, beginner level first. She opens "Goblet squat", watches the embedded video and adds it to today's workout. While logging, she sees last week's 8 kg × 10. She logs 3 sets of 10 at 10 kg and finishes the workout.
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
- **Exercise** — an entry in the fixed exercise list, with name, required Equipment (one or more), a primary and optional secondary Muscle Groups, Level, Exercise Type, short description and video link.
- **Equipment** — one of nine fixed types: bodyweight, dumbbells, barbell and plates, bench, kettlebell, resistance band, pull-up bar, cable machine, leg press/machines. Bodyweight is always available.
- **Equipment Profile** — a named set of Equipment saved by a User, e.g. "Home" or "Gym".
- **Muscle Group** — Legs, Back, Chest, Shoulders, Arms or Core. Each Exercise has one primary Muscle Group and zero to two secondary ones (e.g. deadlift: primary Back, secondary Legs).
- **Level** — Beginner, Intermediate or Advanced.
- **Exercise Type** — Reps (logged as reps and optional weight) or Time (logged as seconds), e.g. plank.
- **Exercise Suggestion** — an Exercise shown to the User because their chosen Equipment Profile contains all the Equipment it requires.
- **Workout** — one training session by a User on a date. Contains Workout Exercises in order.
- **Workout Exercise** — one Exercise inside a Workout. Contains Sets.
- **Set** — one set of a Workout Exercise: set number, and reps + weight (kg) or seconds, depending on Exercise Type.
- **Daily Overview** — the screen that shows one date's Calorie Target, kcal eaten, kcal remaining, Food Log Entries by Meal and the Workout(s).
- **Examiner (sensor)** — the course examiner who grades the project by running the app locally from the README. «Examiner» and «sensor» mean the same role.
- **Seed Data** — fictional test users, food and workouts loaded into a local database for testing and grading.
- **Mock Mode** — a mode where an external service is replaced by a fixed test answer, so the app works without keys or network.
- **Pro Flag** — (phase 2) a yes/no field on the User that unlocks pro features. No payment.

## 4. Features

### 4.1 Account and Privacy

**Description:** A User registers with email and password and logs in to reach their own data. Before any health data is stored, the User gives explicit consent on a short, plain-language screen. The User can delete individual logs and their whole account. Realizes UJ-1, UJ-5.

#### FR-1: Register and log in · Must
A visitor can create an account with email and password, log in and log out.
- Passwords are stored only as a salted hash (Argon2id or bcrypt), never in plain text.
- Login with a wrong email or a wrong password gives the same generic error message (no account enumeration).
- After 5 failed logins for one account within 15 minutes, further attempts for that account are rejected for 15 minutes, with the message «For mange forsøk. Prøv igjen om litt.»
- The session is kept in an HttpOnly, Secure, SameSite cookie, not in localStorage.

#### FR-2: Consent before health data · Must
Before a User enters Profile data for the first time, the app shows a consent screen that names what is stored (body data, food logs, workout logs) and why, and requires an active choice (unticked checkbox + button).
- The User cannot create a Profile without giving consent.
- The time of consent is stored.

#### FR-3: Users see only their own data · Must
A User can only read and change their own Profile, Equipment Profiles, Food Log Entries and Workouts.
- A request for another User's data is rejected and returns no data.

#### FR-4: Delete data · Must
A User can delete a single Food Log Entry, a single Set, a whole Workout and their whole account.
- Deleting the account removes the User's Profile, Equipment Profiles, logs and User-created Food Items, or makes them unrecoverable, within 30 days: soft-delete at once, hard-delete by script (see research GDPR).
- A deleted account can no longer log in.

### 4.2 Profile and Calorie Target

**Description:** The User enters body data, Activity Level and Goal, and gets one daily Calorie Target, explained in plain Norwegian. Realizes UJ-1.

#### FR-5: Create and edit Profile · Must
A User can enter and later edit weight, height, age, sex, Activity Level and Goal.
- Each Activity Level shows a short everyday example (e.g. "Moderate: training 3–5 days a week").
- Values outside a sensible range are rejected with a clear message: weight 30–300 kg, height 100–250 cm, age 16–100.

#### FR-6: Calculate Calorie Target · Must
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
- For a User aged 16–17, the Calorie Target is shown with a note that it is a rough estimate, because the formula is validated for adults.
- Sex is required in v1, with a short explanation that the formula needs it (decided by the group 2026-11-12).
- Changing the Profile recalculates the Calorie Target immediately.

#### FR-7: Explain the Calorie Target · Must
The app shows the Calorie Target as one number with one or two plain-language sentences about what it means, without technical terms such as BMR on the main screen.
- **Consequences (testable):** the Daily Overview shows the Calorie Target and kcal remaining as numbers; the words «BMR», «TDEE» and «Mifflin» do not appear on the Daily Overview or the Profile setup result.

### 4.3 Food Logging

**Description:** The User logs what they eat into Meals, by scanning a barcode, searching or registering a food manually. Speed matters most: recently used foods are one tap away. Realizes UJ-2, UJ-4.

#### FR-8: Log food by scanning a barcode · Should
A User can open the phone camera from a Meal, scan a Barcode and get the Food Item with kcal per 100 g.
- The system first looks up the Barcode among shared Food Items (Open Food Facts and Matvaretabellen) and the User's own Food Items, never other Users' Food Items; only if it is not found does it ask Open Food Facts, and then saves the result as a shared Food Item.
- Camera scanning is a **Should**. The app is run in a browser on a PC (that is how the examiner runs it), so FR-9 (type the barcode) and FR-11 (search) are the main food-logging path, and camera scanning is an extra where the browser and camera allow it (HTTPS or localhost). Changed 2026-11-03; see §11 Q2.

#### FR-9: Type the barcode by hand · Must
If the camera does not work or is not allowed, the User can type the Barcode number and get the same result as a scan.

#### FR-10: Barcode not found · Must
When a Barcode is not found, or the product has no kcal value, the User gets a clear message and a button to register the Food Item manually with the Barcode already filled in.
- The app never crashes or shows an empty result.
- If Open Food Facts cannot be reached, the User gets a message and can still register manually.

#### FR-11: Search for food · Must
A User can search Food Items by name. The search covers the app's own database: a seeded selection of common Norwegian foods from Matvaretabellen, Food Items found earlier via Open Food Facts, and the User's own Food Items.
- Matching is case-insensitive and finds names that contain the search text; the User's recently used Food Items are listed first.
- Search does not call Open Food Facts while the User types.
- **Consequences (testable):** Seed Data contains at least 100 Food Items from Matvaretabellen; a search for «mel» finds «Havremel»; a search with no match shows the manual-registration option (FR-12), never an empty list.

#### FR-12: Register a food manually · Must
A User can create their own Food Item with name and kcal per 100 g (protein, carbohydrate, fat and serving size optional), and log it.
- A User-created Food Item is visible only to that User.

#### FR-13: Choose amount and Meal · Must
When logging, the User chooses the Meal and the amount in grams. If the Food Item has a serving size, the User can choose servings instead, and the app converts to grams.
- The Food Log Entry's kcal is calculated from the amount and shown before saving.
- **Consequences (testable):** 150 g of a Food Item with 63 kcal per 100 g gives 94.5 kcal, shown rounded to 95 kcal; an amount of 0 g or below, or above 5 000 g, is rejected with a message `[ASSUMPTION: upper limit 5 000 g]`.

#### FR-14: Recently used foods · Must
When adding food, the User sees their most recently logged Food Items and can log one again with one tap (same amount as last time, editable).
- **Consequences (testable):** the list shows the User's 10 most recently logged distinct Food Items, newest first; logging one from the list pre-fills the last amount and Meal; a new User with no logs sees no list and is pointed to search. Realizes SM-6.

#### FR-15: Edit and delete Food Log Entries · Must
A User can change the amount or Meal of a Food Log Entry, or delete it. The Daily Overview updates at once.
- **Consequences (testable):** changing 150 g to 200 g of a 63 kcal/100 g item changes the Meal total and kcal eaten by +31.5 kcal without a page reload; a deleted entry no longer counts in kcal eaten.

#### FR-16: Show data sources · Must
Where Open Food Facts or Matvaretabellen data is shown, the app shows the required attribution ("Data from Open Food Facts" and "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no").

**Notes:** Protein, carbohydrate and fat are stored when available but only kcal is shown in v1.

### 4.4 Exercise Library and Suggestions

**Description:** The app has a fixed list of exercises, each tagged with required Equipment, Muscle Group, Level and Exercise Type, and linked to an instructional video. The User saves Equipment Profiles and gets Exercise Suggestions that fit. Realizes UJ-3.

#### FR-17: Fixed exercise list · Must
The system contains a fixed list of 30–50 Exercises, starting from the 34 in `ovelsesliste.md`. Users cannot add their own Exercises in v1.
- Each Exercise has name, required Equipment, primary Muscle Group (plus 0–2 secondary), Level, Exercise Type, a short technique description and a video link.
- **Consequences (testable):** the seed contains between 30 and 50 Exercises; every Exercise has all fields filled; filtering on a Muscle Group (FR-20) matches both primary and secondary groups.

#### FR-18: Equipment Profiles · Must
A User can create, rename, edit and delete Equipment Profiles by ticking Equipment from the fixed list.
- New Users get two suggested Equipment Profiles, "Home" (bodyweight only) and "Gym" (all Equipment), which they can edit.
- Bodyweight is always included and cannot be removed.

#### FR-19: Exercise Suggestions · Must
When the User chooses an Equipment Profile, the app shows only Exercises whose required Equipment is all contained in that Equipment Profile.
- Example test: a User with only dumbbells is not suggested barbell deadlift.
- Beginner Exercises are listed first, then Intermediate, then Advanced.

#### FR-20: Filter and search suggestions · Should
Priority: the Muscle Group and Level filters are **Should**; search by name is **Must**.

The User can filter Exercise Suggestions by Muscle Group and Level, and can search the fixed Exercise list by name.
- Search is case-insensitive and matches names that contain the search text, the same way Food search works (FR-11).
- If no Exercise matches, the User sees a message explaining why and what to change, never an empty list.

#### FR-21: Exercise detail with video · Must
The User can open an Exercise and see the technique description and an embedded video (youtube-nocookie).
- If the video cannot load, the description and data are still shown.

**Notes:** Coverage gaps found in the research: Users with only bodyweight, only a kettlebell or only a pull-up bar get no Shoulder or Arm exercises. Five new Exercises (#35–39, e.g. pike push-up and diamond push-up) are proposed in `ovelsesliste-gjennomgang-2026-11-11.md` and await group approval (issue #8).

### 4.5 Workout Logging

**Description:** The User logs a Workout set by set, like Hevy. They see what they did last time, and beginners get sensible defaults. Realizes UJ-3, UJ-4.

#### FR-22: Start and build a Workout · Must
A User can start a Workout for a date and add Exercises to it, either from Exercise Suggestions or from the full list. The User can reorder and remove Workout Exercises.
- **Consequences (testable):** a Workout can hold several Exercises in the order chosen; removing a Workout Exercise also removes its Sets; a Workout without any Sets is not shown on the Daily Overview.

#### FR-23: Log Sets · Must
For each Workout Exercise the User can add, edit and delete Sets.
- Exercise Type Reps: reps (required) and weight in kg (optional; empty means bodyweight).
- Exercise Type Time: seconds (required).
- When an Exercise is added, it starts with 3 empty Sets with 10 reps suggested (ACSM beginner range 8–12 reps, verified against the 2009 position stand on 2026-11-11; the number of sets is a common starting point, not stated in the abstract).

#### FR-24: Show last time · Must
While logging a Workout Exercise, the User sees the Sets from the last time they did the same Exercise (date, reps/weight or seconds), if any.
- **Consequences (testable):** when a Workout Exercise is opened and the User has logged the same Exercise before, the Sets from the latest Workout before today's date are shown (date, reps × weight or seconds). If there is none, «Første gang» is shown. Sets from today's Workout are never shown as «last time».

#### FR-25: Finish and edit Workouts · Must
A User can finish a Workout and later open it to edit or delete Sets, Workout Exercises or the whole Workout.
- **Consequences (testable):** a finished Workout appears on the Daily Overview for its date; editing a Set in it updates the Daily Overview and future «last time» values (FR-24); deleting the Workout asks for confirmation first.

### 4.6 Daily Overview and History

**Description:** One screen per date that answers "how is my day going?". Realizes UJ-1, UJ-4.

#### FR-26: Daily Overview · Must
For a chosen date (today by default) the app shows: Calorie Target, kcal eaten, kcal remaining, Food Log Entries grouped by Meal with a kcal total per Meal, and that date's Workout(s) with Exercises, Sets, reps, weight or seconds.
- kcal eaten = sum of the date's Food Log Entries; kcal remaining = Calorie Target − kcal eaten (may be negative and is then shown as "over").
- Training does not add kcal to the target, because the Activity Level already includes activity.

#### FR-27: Move between dates · Should
The User can move to earlier dates (previous day, or pick a date) and see the Daily Overview for that date.
- **Consequences (testable):** choosing yesterday shows yesterday's Food Log Entries and Workouts only; future dates cannot be chosen; logging on a past date counts toward that date, not today.

#### FR-28: Empty states and first-time guidance · Must
A new User, or a date without logs, sees short prompts ("Log your first meal", "Start a workout") instead of empty tables.
- A User who has never used the app before sees a short, optional first-run introduction to the three steps (profile → log → train) before reaching the empty Daily Overview. It can be dismissed and does not reappear once dismissed.

### 4.7 Phase 2 (only after the core loop is stable)

**Description:** Two features from the brief that are planned but not part of v1. They are specified here so the architecture leaves room for them. Work starts only when FR-1 to FR-28 are done and tested.

#### FR-29: Photo-based calorie estimate (Pro) · Phase 2
A User with the Pro Flag can take a photo of a single, clearly visible food item and get an estimated food name and kcal.
- The result is always labelled as an estimate, and the User can correct name, amount and kcal before saving.
- Mock Mode is the default: without an API key, the feature always returns «Egg, 1 stk, 78 kcal (estimat)».
- If the call fails, returns no kcal or takes more than 15 seconds, the User sees a message and can register the food manually (FR-12).
- At most 20 photo calls per Pro user per day.
- Before sending, the User is told that the photo is sent to an external service.
- Reference test: 3 test photos with known kcal content.
- The image model is chosen in the architecture phase.

#### FR-30: Pro Flag · Phase 2
A User has a Pro Flag (default off) that unlocks FR-29. There is no payment; the flag is set in Seed Data or by a developer.
- A User without the Pro Flag who opens FR-29 sees that it is a pro feature, and no image is sent anywhere.

## 5. Cross-Cutting Non-Functional Requirements

- **NFR-1 Runs in the browser:** the primary test device is Chrome on a PC. All v1 screens also work in current Safari, Firefox and Edge, and every screen is usable at 360 px width without horizontal scrolling. There is no native app. Camera scanning (FR-8) needs HTTPS or localhost.
- **NFR-2 Language:** all UI text is in Norwegian (bokmål). Exercise names are Norwegian, with the English name in brackets where helpful.
- **NFR-3 Runnable from the README:** a new developer or examiner can start the app locally by following the README, with `.env.example` and no team API keys, paid accounts or private services. The examiner runs the app with Docker, so the repo includes a Docker Compose setup that starts the whole app with one command. Target: under 20 minutes on a clean machine.
- **NFR-4 Seed Data:** a seed script creates fictional test users with Profiles, Equipment Profiles, Food Log Entries and Workouts across several dates (and in phase 2 one Pro user).
- **NFR-5 Replaceable external services:** Open Food Facts and (phase 2) the image model are called through separate modules that can be replaced by mocks in tests. Automated tests never call a real external service.
- **NFR-6 Open Food Facts rules:** the app sends its own User-Agent, stays under 15 product lookups a minute, caches every product it has looked up, and shows the ODbL attribution.
- **NFR-7 Secrets:** passwords, API keys and database connection strings are never committed. They live only in `.env` (git-ignored) and in the hosting provider's environment variables.
- **NFR-8 Testability:** calorie calculation (FR-6), Exercise Suggestions (FR-19, FR-20), kcal sums (FR-13, FR-26), access control (FR-3) and the not-found barcode path (FR-10) have automated tests.
- **NFR-9 Responsiveness:** a saved Food Log Entry or Set appears in the Daily Overview without a manual page reload.
- **NFR-10 Accessibility:** form fields have labels, buttons are large enough to tap on a phone, and text has sufficient contrast (WCAG 2.1 AA basics, not a full audit).
- **NFR-11 Simple front page:** the front page (Daily Overview) has at most two primary actions (log food, start a workout) and favours few, clear actions over many buttons, so new and returning Users immediately see what is logged for today and where to go next (Food or Training). Detailed visual design is worked out in the UX phase (`DESIGN.md` / `EXPERIENCE.md`), not in this PRD.

## 6. Constraints and Guardrails

### 6.1 Privacy

- Weight, food and training logs tied to a person are treated as health data (GDPR art. 9) and handled with explicit consent (FR-2), data minimisation and deletion (FR-4).
- Only the fields the features need are stored. No location, contacts, photos (except phase 2, not stored after estimation) or birth date (age is enough).
- All data in the repo and in Seed Data is fictional.
- User tests with people outside the group (SM-7) use fictional profiles that the test person is given; real personal data is only tested after the Sikt question (§11 Q1) is answered.
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
- The Calorie Target has a safety floor of 1 200 / 1 500 kcal (see FR-6). Accepted by the group on 2026-11-12 `[NOTE FOR PM: find a cited source before implementation]`.

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

**Priority.** Each FR heading states its priority. All are **Must** except the **Should** items, which are cut first if time runs out: FR-8 (camera scanning), FR-20 (filters by Muscle Group and Level; name search stays Must) and FR-27 (move between dates). FR-14 (recent foods) and FR-24 (show last time) are **Must**, because they carry the product's thesis (fast logging, «what did I lift last time»), UJ-3 and SM-6. Changed 2026-11-13 after the lecturer's feedback. FR-9 and FR-11 are the main food-logging path.


- Account, consent and deletion (FR-1 – FR-4)
- Profile and Calorie Target with Goal (FR-5 – FR-7)
- Food logging: scan, type barcode, search, manual, Meals, recent foods (FR-8 – FR-16)
- Fixed exercise list, Equipment Profiles, Exercise Suggestions, videos (FR-17 – FR-21)
- Workout logging with last-time values (FR-22 – FR-25)
- Daily Overview and history (FR-26 – FR-28)
- Chrome on PC as primary device and usable at 360 px, Norwegian UI, runnable from the README with Seed Data (NFR-1 – NFR-11)

### 9.2 Phase 2 (only when v1 is stable)

- Photo-based calorie estimate with Mock Mode (FR-29)
- Pro Flag (FR-30)

### 9.3 Vision (not planned)

Recovery score from wearables, AI form-checking, adaptive training programmes, payment, native app. Also from the original concept pitch: an anatomical-figure exercise picker (click a muscle group to jump to suggestions — a more visual version of FR-20), a curated list of free training programmes found online (shown as inspiration, not auto-generated — the non-goal on training-programme generation in §8 stays in place for v1), and a curated list of free recipes found online. See the brief's Vision section and addendum for the reasons and the conditions to revisit.

## 10. Success Metrics

This is a course project, so success is measured on the finished prototype, not on real users.

**Primary**
- **SM-1: The core loop works end to end.** A seeded test user can complete UJ-1 to UJ-4 in Chrome on a PC, using Seed Data, without errors. Validates FR-1 – FR-28.
- **SM-2: The Calorie Target is correct.** All four test profiles in FR-6 pass as automated tests. Validates FR-6.
- **SM-3: The examiner can run it.** A team member who did not set up the project runs the app from the README on a clean machine in under 20 minutes. Validates NFR-3, NFR-4.

**Secondary**
- **SM-4: Barcode lookup works.** At least 8 of 10 common Norwegian products are found when their barcode is typed in (or scanned, if FR-8 is built); the rest end in the manual path (FR-10). Validates FR-8 – FR-10.
- **SM-5: Suggestions are correct.** Automated tests for each Equipment Profile in the research coverage table give exactly the expected Exercises. Validates FR-19.
- **SM-6: Fast logging.** Logging a recently used food takes at most 3 taps from the Daily Overview. Validates FR-14.
- **SM-7: Beginners understand it.** 3–5 beginners outside the group complete UJ-1 to UJ-3 in Chrome on a PC, with a fictional profile they are given (§6.1), without help, and can explain their Calorie Target in their own words. Validates the beginner focus in §1 and §2.1.

**Counter-metrics (do not optimise)**
- **SM-C1: Number of features.** More features do not improve the grade if the core loop is unstable; do not start phase 2 to raise feature count. Counterbalances SM-1.
- **SM-C2: Number of Exercises.** Do not grow the list beyond 50; a small, checked list with good videos beats a long one. Counterbalances SM-5.
- **SM-C3: Test count.** Many shallow tests are worth less than tests of the rules in NFR-8. Counterbalances SM-2, SM-5.

## 11. Open Questions

Status 2026-11-13.

1. Does a course project storing health-like data need to be reported to Sikt? **Open.** Ask the course coordinator (issue #5). Until answered, user tests use fictional profiles (§6.1).
2. Which barcode library should camera scanning use? **Settled:** Quagga2, and only if FR-8 (Should) is built.
3. How well does Open Food Facts cover Norwegian products? **Answered 2026-11-10/11:** 9 of 15 common products found with kcal by name; barcode lookup works (about 120–320 ms, HTTP 404 when not found). Test with 10 physical products still to do (issue #14). See `research/off-dekning-og-acsm-2026-11-10.md`.
4. Should an Exercise have more than one Muscle Group? **Decided 2026-11-13:** one primary and 0–2 secondary (glossary, FR-17). Which 3–6 Exercises close the Shoulder/Arm gaps is proposed in `ovelsesliste-gjennomgang-2026-11-11.md` and awaits group approval (issue #8).
5. Is the ACSM range of 8–12 reps for beginners confirmed? **Answered 2026-11-11:** yes, verified against the 2009 position stand.
6. What happens when a User does not want to give their sex? **Decided 2026-11-12:** sex is required in v1, with an explanation (FR-6).
7. Tech stack and who works on what? **Open.** Decided in the architecture phase; see `research/teknologivalg-forslag-2026-11-11.md` and `architecture/technology.md`.
8. Have all exercise videos been watched and approved? **Open.** Review sheet ready, split in four (issue #6).

## 12. Assumptions Index

All earlier assumptions were reviewed by the group on 2026-11-12 and accepted (see `gjennomgang-torsdag-2026-11-12.md`). They are now requirements, and their `[ASSUMPTION]` tags are removed. Remaining:

- §4.3 FR-13 — Upper limit of 5 000 g per Food Log Entry `[ASSUMPTION]`, added 2026-11-13 with the testable consequences.
- §6.4 / FR-6 — Calorie floor 1 200 / 1 500 kcal is accepted, but a cited source is still needed `[NOTE FOR PM]`.

Confirmed by Osman Khalid on 2026-11-02 (no longer assumptions): Goal adjustment (−500 / 0 / +300), Meals with grams, saved Equipment Profiles, Norwegian UI, minimum age 16.

Changed by Gustav Reehorst on 2026-11-03: the FR-8 assumption (scanning works on iPhone Safari and Android Chrome) is removed. The submission requires that the app runs in a browser and the examiner runs it on a PC, so camera scanning is now a Should, and typing the barcode (FR-9) and search (FR-11) are the main path. Updated in §1, UJ-2, FR-8, NFR-1, §7, §9.1, SM-4 and §11 Q2.

Changed by Karianne Bjølstad on 2026-11-10: added details from the original concept pitch. Exercise name search added to FR-20; a dismissible first-run introduction added to FR-28; a new NFR-11 on keeping the front page simple with few buttons; three new Vision ideas added to §9.3 (anatomical-figure exercise picker, curated free training programmes, curated free recipes). The confirmed minimum age of 16 (§8.1) is unchanged — the pitch's "18 years or older" framing is descriptive only.

Changed by Osman Khalid on 2026-11-13 (`bmad-prd` update): the group accepted all assumptions on 2026-11-12, and the lecturer's feedback was applied. FR-14 and FR-24 moved from Should to Must, and every FR heading states its priority (lecturer 4.1). Testable consequences added to FR-1, FR-7, FR-11, FR-13, FR-14, FR-15, FR-17, FR-22, FR-24, FR-25 and FR-27 (4.2). Chrome on PC is the primary test device, usable at 360 px; SM-1 and SM-7 reworded (4.3). User tests use fictional profiles until the Sikt question is answered (4.4). FR-29 got rules for failure, timeout, cost and third-party notice (4.5). Small fixes: §9.1 NFR range, UJ-3 «Home» profile, «examiner/sensor» in the glossary, NFR-11 limit. Sex stays required (Q6), an Exercise has one primary and 0–2 secondary Muscle Groups (Q4), and recipes and training programmes stay in Vision. Status set to final.

Changed by Osman Khalid on 2026-11-13: NFR-3 now states that the examiner runs the app with Docker and that the repo includes a Docker Compose setup (from the lecture 2026-11-12).
