---
title: "Product Brief: Prompt Force"
status: draft
created: 2026-09-16
updated: 2026-09-16
---

# Product Brief: Prompt Force

## Executive Summary

Prompt Force is a web app that brings training and nutrition into one place, so people can get better health results without juggling separate tools. It takes direct inspiration from two category leaders used today — Hevy for workout tracking and Lifesum for nutrition tracking — and combines what each does well into a single, simpler experience.

The core loop: log what you eat (barcode scan or photo), log what you train, and get exercise suggestions that fit the equipment you actually have available — at home or at the gym. A free tier covers calorie calculation and barcode scanning; a pro tier adds photo-based calorie estimation and training programs that adapt over time.

This is a course project for IBE160 (Programming with AI, Høgskolen i Molde), built by a four-person team over one semester. `[ASSUMPTION]` The brief scopes v1 to what's realistically buildable in that window, and treats the more ambitious ideas from the original concept — recovery scoring, AI form-checking on self-recorded video, auto-adaptive programs — as vision, not baseline.

## The Problem

People trying to improve their health today are stuck assembling their own toolkit: one app to log workouts (like Hevy), a separate one to track food (like Lifesum), and often a wearable app on top for recovery signals. None of these talk to each other, so nobody has a single view connecting training load, diet, and recovery — the three things that actually determine whether someone is making progress or heading toward a plateau or injury.

On top of that fragmentation, two everyday frictions make the habit harder to sustain: logging food accurately is tedious (searching databases, estimating portions), and knowing *what exercise to actually do* — especially with limited or unfamiliar equipment — requires either experience or research most beginners and casual gym-goers don't have.

## The Solution

Prompt Force combines training and nutrition tracking into one web app, with equipment-aware exercise guidance layered on top:

- **Food logging** — barcode scanning (free) and photo-based calorie estimation (pro), combined with the user's weight, height, age, and activity level to calculate needs.
- **Workout logging** — log exercises, sets, reps, and weight over time.
- **Equipment-aware suggestions** — recommend exercises based on what's actually available, whether that's a home setup or a full gym.
- **Exercise guidance** — instructional videos showing how to perform movements safely.
- **Free / Pro split** — free covers calorie calculation and barcode scanning; pro adds photo-based calorie estimation and training programs that adjust weight and reps over time.

## What Makes This Different

Prompt Force draws its inspiration from two apps that each do one half of the job well: Hevy's focused approach to workout logging, and Lifesum's approachable, everyday nutrition tracking. The core bet is that combining what makes each of them good — in one simple web experience — removes the fragmentation of learning and maintaining two separate tools.

`[ASSUMPTION]` Worth being honest about: Prompt Force isn't first to attempt "training + nutrition + recovery in one app" — platforms like Bevel and Cora already exist in that combined space (see addendum for detail). For a course-scoped v1, the realistic differentiation is being simpler and more approachable than those broader platforms, and being genuinely useful for the specific combination of nutrition + equipment-aware training — not claiming an unfounded moat.

## Who This Serves

**Primary user:** Active fitness enthusiasts who already train regularly and are used to managing nutrition and workouts through separate apps — tools in the spirit of Hevy and Lifesum. They want one smarter tool instead of two disconnected ones, and they have enough training experience to value equipment-aware suggestions and progressive-overload programming.

`[ASSUMPTION]` Secondary beneficiaries: beginners get real value from the instructional exercise videos and equipment-aware suggestions too, even though the app isn't purpose-built around a beginner's onboarding needs in v1.

## Success Criteria

For a course deliverable, success means a working prototype that demonstrably closes the core loop:

- A user can set up a profile (weight, height, age, activity level) and get a calorie target.
- A user can log food via barcode scan (free tier) and, for pro, via photo-based estimation.
- A user can log a workout and receive exercise suggestions matched to their stated available equipment.
- The free/pro tier distinction is visibly implemented, not just described.

`[ASSUMPTION]` Grading-relevant success also includes code quality, use of AI tooling in the build process (central to the course), and a demoable end-to-end flow — these should be confirmed against course criteria once available, since no course spec was on hand for this brief.

## Scope

**In scope for v1:**
- User profile and calorie-need calculation (weight, height, age, activity level)
- Barcode scanning for food logging (free)
- Photo-based calorie estimation (pro) — scoped to single, clearly-photographed food items; mixed dishes are a known hard problem industry-wide, not a v1 accuracy target
- Manual food logging as a fallback
- Workout logging (exercises, sets, reps, weight)
- Equipment-aware exercise suggestion (home vs. gym equipment)
- Instructional exercise videos `[ASSUMPTION]` — treated as curated/embedded content rather than originally produced video, to keep this a content task rather than a build task
- Free / Pro tier gating

**Explicitly out of v1 — pushed to Vision:**
- Phone/wearable health-data integration for a Body Battery-style recovery score. `[ASSUMPTION]` Reframed: true Body Battery relies on continuous wrist HRV capture that phones can't replicate, so if attempted at all this becomes a simplified self-report readiness score (sleep + soreness + training load), not a continuous-recovery equivalent.
- AI-based video form-checking (user films themselves, gets feedback on technique)
- Auto-adaptive training programs (automatic weight/rep progression suggestions)

## Vision

Over time, Prompt Force grows from a course prototype into the tool the original concept described in full: a phone/wearable-connected recovery signal that actually earns the Body Battery comparison, AI-driven form-checking that gives real-time feedback on self-recorded lifts, and training programs that adapt automatically as the user gets stronger. `[ASSUMPTION]` Longer-term, this could extend beyond the web into a native mobile experience, positioning Prompt Force as a single, trustworthy home for training, nutrition, and recovery — instead of the fragmented toolkit people rely on today.
