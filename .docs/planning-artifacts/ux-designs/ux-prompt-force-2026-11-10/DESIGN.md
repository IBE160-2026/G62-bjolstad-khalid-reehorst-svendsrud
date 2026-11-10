---
name: Prompt Force
description: Calm, app-like web app for beginners that puts training and food in one place. Visual world from the chosen concept A1 "Sidemeny" (the fridge planner board). Light mode only in v1.
status: final
updated: 2026-11-10
sources:
  - ../../prds/prd-prompt-force-2026-11-02/prd.md
  - ../../briefs/brief-prompt-force-2026-09-16/brief.md
  - ../../../../PRODUCT.md
  - ../../ux/valgt-konsept/README.md
colors:
  ink: '#1E2A2F'
  muted: '#5B6B70'
  board: '#F7F8F6'
  card: '#FFFFFF'
  line: '#DCE2E0'
  nav-active: '#E8EFEC'
  food: '#2F7D55'
  food-tint: '#E6F1EA'
  training: '#D9542B'
  training-text: '#B9471F'
  training-tint: '#FBEAE3'
  note: '#F2C14E'
  note-paper: '#FFFBEA'
  note-edge: '#EFE3B5'
  error: '#B42318'
  error-tint: '#FDECEA'
  focus-ring: '#1E2A2F'
typography:
  display:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.01em
  display-sm:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 38px
    fontWeight: '700'
    lineHeight: '1.1'
  title:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  heading:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.3'
  body:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-strong:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.5'
  small:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.45'
  label:
    fontFamily: 'Atkinson Hyperlegible'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.3'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 18px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
  sidebar-width: 230px
  tab-bar-height: 72px
  content-max: 1040px
  margin-mobile: 16px
components:
  sidebar:
    background: '{colors.card}'
    width: '{spacing.sidebar-width}'
    border-right: '1px solid {colors.line}'
  sidebar-item-active:
    background: '{colors.nav-active}'
    foreground: '{colors.ink}'
    radius: '{rounded.md}'
  tab-bar:
    background: '{colors.card}'
    height: '{spacing.tab-bar-height}'
    border-top: '1px solid {colors.line}'
  week-strip-day-active:
    background: '{colors.card}'
    border: '2px solid {colors.ink}'
    radius: '{rounded.md}'
  magnet-food:
    background: '{colors.food}'
    size: 9px
    radius: '{rounded.full}'
  magnet-training:
    background: '{colors.training}'
    size: 9px
    radius: '{rounded.full}'
  day-note:
    background: '{colors.note-paper}'
    border: '1px solid {colors.note-edge}'
    radius: '{rounded.md}'
    pin: '{colors.note}'
  section-card:
    background: '{colors.card}'
    border: '1px solid {colors.line}'
    radius: '{rounded.lg}'
  button-primary:
    background: '{colors.ink}'
    foreground: '{colors.card}'
    radius: '{rounded.full}'
    height: 54px
  button-secondary:
    background: '{colors.card}'
    foreground: '{colors.ink}'
    border: '2px solid {colors.ink}'
    radius: '{rounded.full}'
    height: 54px
  text-action-food:
    foreground: '{colors.food}'
  input:
    background: '{colors.card}'
    border: '1px solid {colors.muted}'
    radius: '{rounded.sm}'
    height: 48px
  input-error:
    border: '2px solid {colors.error}'
    message: '{colors.error}'
---

## Brand & Style

Prompt Force should feel like the planning board on a family fridge: a calm white surface where the week is laid out, small coloured magnets show what is done, and a yellow note says the one thing that matters today. It is motivating without being loud, and it never overwhelms a beginner (PRODUCT.md, principle 1: fewer, clearer actions).

It is a web app in the browser, but it behaves and looks like an app, with persistent navigation, authored icons and tappable cards, not like a document or a marketing page. There is no hero imagery, no gradients and no glass effects. Brand lives in three details: the week strip with its magnets, the pinned yellow day note, and the green and orange that always mean Food and Training.

Chosen through two concept rounds (see `../../ux/konsepter/decisions.md`). Reference layout: `imports/valgt-konsept-a1-dagsoversikt.svg`. This file wins on conflict with the sketch.

## Colors

The palette is restrained: tinted neutrals for the board, plus two category colours and one note colour, each with exactly one job.

- **Ink (`#1E2A2F`)** is all primary text, the primary button fill, the active day outline and the focus ring. 13.8:1 on `{colors.board}`.
- **Muted (`#5B6B70`)** is secondary text: dates, "Sist: 8 kg", item lists under a meal, attribution. At least 5.2:1 on every surface. Never used for anything the user must read to act.
- **Board (`#F7F8F6`)** is the page background. **Card (`#FFFFFF`)** is cards, the sidebar and the tab bar. **Line (`#DCE2E0`)** is hairline dividers only, never text.
- **Food green (`#2F7D55`)** means food, everywhere: the food magnet, the Mat card's icon disc, "+ Legg til" text actions in food lists. 5.0:1 on white, so it can carry text. **Food tint (`#E6F1EA`)** is selected rows and chips in the food flow.
- **Training orange (`#D9542B`)** means training: the training magnet and the Trening icon disc. It is 4.0:1 on white, so it is **never used for text**. Orange text uses **training-text (`#B9471F`, 5.3:1)**. **Training tint (`#FBEAE3`)** is selected rows in the training flow.
- **Note yellow (`#F2C14E`)** is only the pin on the day note. **Note paper (`#FFFBEA`)** with **note edge (`#EFE3B5`)** is the note itself. Yellow is never a button or a status.
- **Error (`#B42318`)** is reserved for validation errors and destructive confirmations (delete account). Being over the calorie target is **not** an error and is not red (see EXPERIENCE.md, State Patterns).

Avoid: more category colours, coloured page backgrounds, green or orange as large fills behind text, and red for anything that is not an error.

## Typography

One family throughout: **Atkinson Hyperlegible** (free, self-hosted), chosen for legibility for beginners and readers of every level. Use tabular numerals (`font-variant-numeric: tabular-nums`) wherever kcal, grams, sets, reps or weights line up in columns. `[ASSUMPTION: confirm the typeface with the group]`

| Role | Size / weight | Use |
|---|---|---|
| `{typography.display}` | 48 / 700 | Only the "kcal igjen" number on the day note (desktop) |
| `{typography.display-sm}` | 38 / 700 | The same number on mobile |
| `{typography.title}` | 30 / 700 | Page title: "I dag", "Mat", "Trening" |
| `{typography.heading}` | 20 / 700 | Card titles |
| `{typography.body}` / `body-strong` | 16 / 400·700 | Rows; bold for meal and exercise names |
| `{typography.small}` | 14 / 400 | Secondary lines, dates |
| `{typography.label}` | 12 / 400 | Tab-bar labels, week-strip weekday names, attribution |

Never set body text below 14 px. Headings are sentence case. No italics and no all-caps labels.

## Layout & Spacing

4-based scale (`{spacing.1}` to `{spacing.12}`). Groups are tight (8 to 12 px inside a row) and separated generously (24 to 32 px between cards).

- **Desktop (≥ 1024 px):** fixed sidebar (`{spacing.sidebar-width}`) on the left; content to the right with a max width of `{spacing.content-max}`. On "I dag" the order is page title and date, then the week strip across the full width, then a three-column row: the day note with the two primary buttons under it, the Mat card and the Trening card.
- **Tablet (768 to 1023 px):** the sidebar collapses to icons only (72 px); the Mat and Trening cards stack under the note.
- **Mobile (< 768 px, down to 360 px):** no sidebar; the bottom tab bar (`{spacing.tab-bar-height}`) holds I dag, Mat, Trening and Profil. Single column: week strip, note, Mat card, Trening card. Side margin `{spacing.margin-mobile}`.

## Elevation & Depth

Almost flat. Cards sit on the board with a 1 px `{colors.line}` border plus one soft shadow (`0 3px 8px rgba(30, 42, 47, 0.06)`). Bottom sheets and dialogs use one stronger shadow (`0 12px 32px rgba(30, 42, 47, 0.18)`) over a 40% ink scrim. No other shadow levels and no hard offset shadows.

## Shapes

Soft and friendly, but not bubbly: `{rounded.sm}` (8 px) for inputs, `{rounded.md}` (12 px) for the active day, the sidebar item and the day note, `{rounded.lg}` (16 px) for cards and sheets, and `{rounded.full}` for buttons, magnets and icon discs. The phone-frame radius in the concept sketch is presentation only and is not a token.

## Components

- **Sidebar / tab bar:** icon (24 px, 2 px stroke, round caps) plus label. The active item is ink and bold on `{colors.nav-active}`; inactive items are muted. Icons are drawn from one outline set (house, bowl, dumbbell, calendar, person). No emoji.
- **Week strip:** seven equal cells, Monday to Sunday. Each has a weekday label (`label`) over the date (`body`). The active day has a white fill with a 2 px ink outline. Under each past or current day sit up to two magnets: green if food was logged, orange if a workout was logged. Future days are muted with no magnets.
- **Day note:** note paper with the yellow pin circle centred on the top edge. Contents: the date (`small`, muted), the number in `display`, one sentence in `body` ("igjen av dagens mål på 1 640"), and one optional supporting line in `small`. Exactly one note per screen.
- **Section card (Mat / Trening):** white card with a header row (36 px icon disc in the category colour with a white icon, title in `heading`, summary on the right in `small` muted, chevron). Rows are separated by `{colors.line}`: name in `body-strong`, value right-aligned with tabular numerals, secondary line in `small` muted. An empty row shows a green "+ Legg til" text action.
- **Buttons:** primary is an ink pill with white text and an optional leading icon; secondary is a white pill with a 2 px ink outline. Height 54 px desktop and 52 px mobile; minimum tap target 44 × 44 px. At most one primary button per view.
- **Inputs:** 48 px high, 1 px muted border, a label above (never placeholder-only). Error: 2 px `{colors.error}` border and the message below in error colour, starting with what to fix.
- **Attribution line:** `label`, muted, at the bottom of every screen that shows food data: "Data fra Open Food Facts og Matvaretabellen 2026".

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use green only for food and orange only for training | Use green or orange for success, warning or decoration |
| Use `{colors.training-text}` for any orange text | Put text in `#D9542B` |
| Show one big number (the day note) per screen | Stack several big stat numbers or progress rings |
| Keep one primary button per view | Put two filled pill buttons side by side |
| Draw icons from one outline set | Use emoji or mixed icon styles |
| Keep cards flat with one soft shadow | Nest cards inside cards |
| Keep the board light and calm | Add dark mode, gradients or coloured page backgrounds in v1 |
