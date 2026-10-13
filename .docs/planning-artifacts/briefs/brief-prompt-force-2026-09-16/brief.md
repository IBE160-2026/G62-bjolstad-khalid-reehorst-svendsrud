---
title: "Product Brief: Prompt Force"
status: draft
created: 2026-09-16
updated: 2026-10-13
---

# Product Brief: Prompt Force

> **Revision 2026-10-13:** Updated after course feedback (IBE160, 2026-10-06). Primary user changed to beginners, v1 scope narrowed to the core flow, image estimation and free/pro moved to phase 2, external services and local running described, calorie test cases added, all `[ASSUMPTION]` markers resolved.

## Executive Summary

Prompt Force is a web app that brings training and nutrition into one place, so people can get better health results without juggling separate tools. It takes direct inspiration from two category leaders — Hevy for workout tracking and Lifesum for nutrition tracking — and combines what each does well into a single, simpler experience aimed at people who are new to structured training.

The core loop: set up a profile and get a calorie target, log what you eat (manually or by barcode scan), log what you train, and get exercise suggestions that fit the equipment you actually have — at home or at the gym. A daily overview ties it together.

This is a course project for IBE160 (Programming with AI, Høgskolen i Molde), built by a four-person team over one semester. V1 is scoped to the core flow, which must be finished and stable. Photo-based calorie estimation and a free/pro split are planned as phase 2, added only once the core flow is stable. The more ambitious ideas from the original concept — recovery scoring, AI form-checking on video and auto-adaptive programs — are vision, not baseline.

## The Problem

People trying to improve their health are stuck assembling their own toolkit: one app to log workouts (like Hevy), a separate one to track food (like Lifesum), and often a wearable app on top. None of these talk to each other, so nobody has a single view connecting training and diet.

On top of that fragmentation, two everyday frictions make the habit hard to sustain, especially for beginners: logging food accurately is tedious (searching databases, estimating portions), and knowing which exercises to do — particularly with limited or unfamiliar equipment — requires experience or research most beginners don't have.

## The Solution

Prompt Force combines training and nutrition tracking into one web app, with equipment-aware exercise guidance layered on top.

**A typical day in the app:**

1. **Morning:** The user opens the app and sees today's overview: calorie target, calories eaten so far, and whether a workout is planned.
2. **Meals:** The user scans the barcode on a yoghurt with the phone camera. The product and its calories are fetched automatically. For food without a barcode, the user searches or enters it manually.
3. **Training:** At the gym, the user selects the equipment available (e.g. dumbbells and a bench) and gets a list of suitable exercises, each with a link to an instructional video. The user logs sets, reps and weight as they go.
4. **Evening:** The overview shows calories eaten versus target, and today's completed workout.

**The daily overview shows:** calorie target, calories eaten, calories remaining, today's food log, and today's workout (exercises, sets, reps, weight).

**Main features in v1:**

- **Profile and calorie target** — weight, height, age, sex and activity level give a daily calorie target using the Mifflin-St Jeor formula.
- **Food logging** — barcode scanning (via Open Food Facts) and manual entry.
- **Workout logging** — exercises, sets, reps and weight over time.
- **Equipment-aware suggestions** — based on a fixed exercise database of 30–50 exercises, each tagged with required equipment, muscle group and level. Suggestions are rule-based: an exercise is shown only if the user has all the equipment it requires.
- **Exercise guidance** — each exercise in the database links to an existing instructional video (embedded or linked), so this is not a separate content-production task.

## What Makes This Different

Prompt Force draws its inspiration from two apps that each do one half of the job well: Hevy's focused workout logging and Lifesum's approachable nutrition tracking. The core bet is that combining what makes each good — in one simple web experience — removes the friction of learning and maintaining two separate tools.

Prompt Force isn't first to combine training and nutrition — platforms like Bevel and Cora already exist in that space (see addendum). For a course-scoped v1, the realistic differentiation is being simpler and more approachable than those broader platforms, and being useful for beginners through equipment-aware exercise suggestions — not claiming an unfounded moat.

## Who This Serves

**Primary user: beginners and lightly experienced exercisers.** People who have started or want to start training regularly, but don't yet know which exercises to do with the equipment they have, and who want an easy way to keep track of what they eat. A typical situation: someone with a few dumbbells at home, or a new gym membership, who doesn't know where to start and finds calorie tracking tedious.

What they need: clear exercise suggestions for their equipment, simple instructions on how to perform each exercise, a calorie target they understand, and food logging that is quick.

**Secondary users:** more experienced exercisers who want training and nutrition in one place. They benefit from the workout log and food logging, but v1 is not designed around their needs (e.g. advanced programming).

## Success Criteria

For a course deliverable, success means a working, tested prototype that closes the core loop:

1. A user can set up a profile (weight, height, age, sex, activity level) and get a calorie target.
2. The calorie target is calculated correctly. The following test profiles must give the expected target within ± 1 %:

   | Profile | Sex | Weight | Height | Age | Activity factor | BMR | Calorie target |
   |---|---|---|---|---|---|---|---|
   | 1 | Male | 80 kg | 180 cm | 25 | Moderate (1.55) | 1805 | 2798 kcal |
   | 2 | Female | 65 kg | 165 cm | 30 | Light (1.375) | 1370.25 | 1884 kcal |
   | 3 | Male | 95 kg | 178 cm | 50 | Sedentary (1.2) | 1817.5 | 2181 kcal |
   | 4 | Female | 55 kg | 160 cm | 22 | Very active (1.725) | 1279 | 2206 kcal |

3. A user can log food by scanning a barcode and by manual entry.
4. When a barcode is not found in the food database, the user gets a clear message and can register the food manually instead. The app does not crash or show an empty result.
5. A user can log a workout (exercises, sets, reps, weight) and see it in the daily overview.
6. A user can select available equipment and only gets suggested exercises whose equipment requirements are met.
7. The daily overview shows calorie target, calories eaten and today's workout.
8. The app can be run locally by following the README, without the team's API keys or paid accounts.

These criteria are checked against the course's assessment criteria for part 1: process and AI management, functionality and scope, quality assurance and testing, design and user experience, code quality and architecture, README and runnability, and repository tidiness.

## Scope

**In v1 (core flow — must be finished and stable):**

- User profile and calorie target calculation
- Food logging: barcode scanning and manual entry
- Workout logging (exercises, sets, reps, weight)
- Equipment-aware exercise suggestions from a fixed exercise database (30–50 exercises)
- Instructional videos as links/embeds on each exercise in the database
- Daily overview
- Mobile-friendly design (barcode scanning is mainly used on a phone)

**Phase 2 (only after the core flow is stable):**

- Photo-based calorie estimation — limited to single, clearly photographed food items. Results are always shown as an estimate, and the user can correct them before saving.
- Free/pro split — pro is a flag on the user account, with no payment. Pro unlocks photo-based estimation.

**Out of scope — moved to Vision:**

- Phone/wearable integration for a Body Battery-style recovery score. True Body Battery relies on continuous HRV measurement that phones can't replicate, so if attempted at all this becomes a simplified self-reported readiness score (sleep, soreness, training load).
- AI-based video form-checking
- Auto-adaptive training programs (automatic weight/rep progression)
- Payment

## External Services and Running Locally

| Service | Used for | Cost | Without key / offline |
|---|---|---|---|
| Open Food Facts | Barcode lookup (v1) | Free, no API key | Manual entry always available |
| Image-capable language model (chosen in the architecture phase) | Photo-based calorie estimation (phase 2) | Paid per call | **Mock mode is the default**: returns a fixed test answer, so the app works without a key |
| Video platform (e.g. YouTube) | Exercise videos (links/embeds) | Free | Exercise text and data still shown |

External calls (food database, image API) are wrapped in separate modules so they can be replaced with mocks in tests.

**How an examiner runs the app:**

- Copy `.env.example` to `.env`. No keys are required for v1. The image API key is optional, and mock mode is used when it is missing.
- Seed data provides fictional test users (one free user, and one pro user in phase 2) with sample food and workout logs.
- API keys live only in `.env`, which is never committed. Test profiles and test images are kept in a separate folder in the repo.

## Data and Privacy

Weight, diet and training data are health information. The app stores only what the features need: profile data (weight, height, age, sex, activity level), food logs and workout logs. Users can delete their own data. All test data in the repository is fictional.

## Vision

Over time, Prompt Force could grow from a course prototype into the tool the original concept described: a phone/wearable-connected recovery signal that earns the Body Battery comparison, AI-driven form-checking on self-recorded lifts, and training programs that adapt automatically as the user gets stronger. Longer-term, this could extend into a native mobile app, positioning Prompt Force as a single home for training, nutrition and recovery.
