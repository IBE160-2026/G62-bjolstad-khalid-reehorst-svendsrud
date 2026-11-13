---
name: Prompt Force
description: Calm, app-like training and food journal for beginners. Merged design (2026-11-13) — the paper-journal look from UX round 3 with the category colours and structure of concept A1. Light mode only in v1.
status: final
updated: 2026-11-13
revision: 2 (Karianne's feedback 13.11: notebook lines, calmer colours, Inter only)
sources:
  - ../../prds/prd-prompt-force-2026-11-02/prd.md
  - ../../briefs/brief-prompt-force-2026-09-16/brief.md
  - ../../../../PRODUCT.md
  - ../../ux/valgt-konsept/README.md
  - ../../ux/runde-3/DESIGN.md
colors:
  paper: '#F7F2E9'
  surface: '#FFFDF7'
  ink: '#3A322B'
  ink-secondary: '#6B6056'
  rule: '#E4D9C6'
  accent: '#7A3B69'
  accent-tint: '#F1E7EE'
  on-accent: '#FFF9F0'
  food: '#2F7D55'
  food-text: '#2A7350'
  food-tint: '#E5EFE6'
  training: '#D9542B'
  training-text: '#B9471F'
  training-tint: '#F8E6DC'
  note: '#F2C14E'
  note-paper: '#FFF8E2'
  tape: '#E9DFC9'
  note-line: '#EADFBF'
  error: '#B42318'
  error-tint: '#FBE9E6'
  focus-ring: '#3A322B'
typography:
  display:
    fontFamily: 'Inter'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.05'
  title:
    fontFamily: 'Inter'
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
  heading:
    fontFamily: 'Inter'
    fontSize: 19px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'Inter'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-strong:
    fontFamily: 'Inter'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.6'
  small:
    fontFamily: 'Inter'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Inter'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
  button:
    fontFamily: 'Inter'
    fontSize: 15px
    fontWeight: '700'
    lineHeight: '1'
rounded:
  sm: 10px
  md: 14px
  lg: 20px
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
  sidebar-width: 232px
  tab-bar-height: 72px
  content-max: 1040px
  margin-mobile: 16px
components:
  sidebar:
    background: '{colors.surface}'
    width: '{spacing.sidebar-width}'
    border-right: '1px solid {colors.rule}'
  sidebar-item-active:
    background: '{colors.accent-tint}'
    foreground: '{colors.accent}'
    radius: '{rounded.full}'
  tab-bar:
    background: '{colors.surface}'
    height: '{spacing.tab-bar-height}'
    border-top: '1px solid {colors.rule}'
  week-strip-day-active:
    background: '{colors.surface}'
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
  page-background:
    background: '{colors.paper}'
    lines: 'repeating 1px {colors.rule} line every 38px'
  day-note:
    background: '{colors.note-paper}'
    lines: 'repeating 1px {colors.note-line} line every 26px, plum margin line at 30px (18 % opacity)'
    border: '1px solid {colors.rule}'
    radius: '{rounded.md}'
    pin: '{colors.note}'
  section-card:
    background: '{colors.surface}'
    border: '1px solid {colors.rule}'
    radius: '{rounded.lg}'
    tape: '{colors.tape}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.on-accent}'
    radius: '{rounded.full}'
    height: 52px
  button-secondary:
    background: '{colors.surface}'
    foreground: '{colors.ink}'
    border: '1.5px solid {colors.rule}'
    radius: '{rounded.full}'
    height: 52px
  method-option:
    background: '{colors.surface}'
    border: '1.5px solid {colors.rule}'
    radius: '{rounded.full}'
    selected-background: '{colors.accent}'
    selected-foreground: '{colors.on-accent}'
  status-complete-food:
    foreground: '{colors.food-text}'
  status-complete-training:
    foreground: '{colors.training-text}'
  input:
    background: '{colors.surface}'
    border: '1.5px solid {colors.rule}'
    radius: '{rounded.sm}'
    height: 48px
  input-error:
    border: '2px solid {colors.error}'
    message: '{colors.error}'
  help-button:
    background: '{colors.accent-tint}'
    foreground: '{colors.accent}'
    radius: '{rounded.full}'
    size: 40px
---

## Brand & Style

Prompt Force is a calm training and food journal that looks like a notebook: warm lined paper instead of clinical white, a day note like a sheet torn from a notepad, tape on the cards, and one clean sans (Inter) for everything. It motivates without shouting and never overwhelms a beginner (PRODUCT.md, principle 1).

This is the **merged design** the group voted for on 2026-11-12. It takes the look of UX round 3 (Karianne: lined paper, plum as the action colour, tape on cards) and the structure and colour meaning of concept A1 (Osman: sidebar, week strip with magnets, the day note with one number, green = food, orange = training). Round 3's teal was dropped because it is almost the same colour as food green (contrast 1.04 between them).

**Revision 2 (2026-11-13, Karianne's feedback on PR #17):** the notebook lines from round 3 are back on the page and on the day note; colours are calmer (plum is the only filled colour, green and orange only as magnets and icons, numbers in ink); and the type is Inter only, because Fraunces did not feel clean enough. Reference mockup: `imports/felles-design-v2-i-dag.html`. Karianne's recipe pages (`../../ux/runde-3/mockups/oppskrifter*.html`) are kept as the design for phase 2; recipes are out of scope for v1 (group decision 2026-11-12).

It is a web app that behaves like an app: persistent navigation, authored icons and tappable cards. No gradients, no glass, no hero images. Reference layouts: `imports/valgt-konsept-a1-dagsoversikt.svg` (structure) and `../../ux/runde-3/mockups/` (look of food logging and the muscle-group list). This file wins on conflict with either.

## Colors

Warm neutrals for the page, one action colour, two category colours and one note colour. Every colour has one job.

- **Paper (`#F7F2E9`)** is the page background, ruled with a 1 px `{colors.rule}` line every 38 px like a notebook. **Surface (`#FFFDF7`)** is cards, the sidebar, the tab bar and inputs. **Rule (`#E4D9C6`)** is hairlines and borders, never text.
- **Ink (`#3A322B`)** is all main text and the focus ring (11.3:1 on paper). **Ink-secondary (`#6B6056`)** is supporting text such as dates and "Sist: …" (5.5:1).
- **Plum (`#7A3B69`)** is the action colour: primary buttons, the active navigation item, the selected method in the food sheet and links (7.1:1 on paper; on-accent text 7.6:1). It never means a category.
- **Food green**: `#2F7D55` for the food magnet and the icon on the Mat card (on a food-tint disc, never a solid green disc); `#2A7350` for any green text, such as "+ Legg til" and "fullført" on the Mat card (5.1:1). **Food tint (`#E5EFE6`)** is selected rows in the food flow.
- **Training orange**: `#D9542B` for the training magnet and the icon on the Trening card only (on a training-tint disc) (3.6:1, enough for non-text); `#B9471F` for orange text, such as "Fullført" on the Trening card (4.7:1). **Training tint (`#F8E6DC`)** is selected rows in the training flow.
- **Note yellow (`#F2C14E`)** is only the pin on the day note; **note paper (`#FFF8E2`)** is the note itself, ruled every 26 px in `{colors.note-line}` with a faint plum margin line. **Tape (`#E6DCC4`)** is the small tape strip on section cards.
- **Error (`#B42318`)** is for validation errors and destructive confirmations only. Being over the calorie target is not an error and is never red.

**Balance rule:** at most one filled colour per screen (the plum primary button). Category colours appear only as small marks (magnets, icons, "+ Legg til"); values and numbers stay in ink.

Avoid: new category colours, coloured page backgrounds, green or orange as large fills behind text, plum on anything that is not an action.

## Typography

One family: **Inter** (Google Fonts, self-hosted in the app) for everything, from the day-note number to labels. Hierarchy comes from size and weight, not from a second typeface. Fallback: system-ui, -apple-system, "Segoe UI", sans-serif. Use tabular numerals (`font-variant-numeric: tabular-nums`) wherever kcal, grams, sets, reps or weights line up.

| Role | Size / weight | Use |
|---|---|---|
| `{typography.display}` | Inter 48 / 700 (38 on mobile) | Only the "kcal igjen" number on the day note |
| `{typography.title}` | Inter 30 / 600 | Page titles: "I dag", "Mat", "Trening" |
| `{typography.heading}` | Inter 19 / 600 | Card and section headings |
| `{typography.body}` / `body-strong` | Inter 16 / 400·600 | Rows; meal and exercise names in 600 |
| `{typography.small}` | Inter 14 / 400 | Dates, "Sist: …", attribution |
| `{typography.label}` | Inter 13 / 600 | Tab-bar labels, weekday names, status labels |
| `{typography.button}` | Inter 15 / 700 | Buttons and method options |

Never set text below 13 px. Sentence case everywhere; no all-caps labels.

## Layout & Spacing

4-based scale. Tight inside a row (8–12 px), generous between cards (24–32 px).

- **Desktop (≥ 1024 px):** fixed sidebar (`{spacing.sidebar-width}`) on the left, content up to `{spacing.content-max}`. On "I dag": page title and date, the week strip across the full width, then the day note with the two primary buttons under it next to the Mat and Trening cards.
- **Tablet (768–1023 px):** the sidebar collapses to icons; the cards stack under the note.
- **Mobile (< 768 px, down to 360 px):** no sidebar; bottom tab bar (`{spacing.tab-bar-height}`) with I dag, Mat, Trening and Profil; one column; side margin `{spacing.margin-mobile}`. A help button sits in the top bar on every size.

## Elevation & Depth

Almost flat, like paper on a desk. The day note is tilted −0.6° like a sheet pinned to the board. Cards have a 1 px `{colors.rule}` border and one soft shadow (`0 2px 6px rgba(58, 50, 43, 0.06)`). Sheets and dialogs use `0 12px 32px rgba(58, 50, 43, 0.18)` over a 35 % ink scrim. No other levels, no hard offset shadows.

## Shapes

Rounded and friendly: `{rounded.sm}` (10 px) for inputs, `{rounded.md}` (14 px) for the active day and the day note, `{rounded.lg}` (20 px) for cards and sheets, `{rounded.full}` for buttons, method options, the active navigation item, magnets and icon discs.

## Components

- **Sidebar / tab bar:** outline icons (24 px, 2 px stroke, round caps: house, bowl, dumbbell, calendar, person) plus a label. The active item is plum on `{colors.accent-tint}` in a pill; inactive items are ink-secondary. No emoji.
- **Week strip:** seven cells, Monday–Sunday, weekday (`label`) over date (`body`). The selected day has a surface fill and a 2 px ink outline. Past and current days carry up to two magnets: green when food is logged, orange when a workout is logged. Future days are ink-secondary with no magnets.
- **Day note:** a lined notepad sheet (note paper, `{colors.note-line}` lines, faint margin line) with the yellow pin centred on the top edge. Date (`small`), the number in `display`, one sentence in `body` ("igjen av dagens mål på 1 640"), and at most one supporting line. One per screen.
- **Section card (Mat / Trening):** surface card with a small tape strip on the top-left edge; header with a 36 px icon disc in the category tint with the icon in the category colour, title in `heading`, summary in `small`, chevron. Rows separated by rule lines; names in `body-strong`, values right-aligned in ink with tabular numerals. Completed status uses the category text colour.
- **Food method picker:** four pill options of equal size — Søk · Skriv strekkode · Nylig brukt · Manuelt — each with an outline icon; the selected one is plum with on-accent text and a check.
- **Muscle-group list:** a plain vertical list of pill rows (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg) on Trening, with the same selected style as the method picker; beside it the exercise search field and Level chips.
- **Buttons:** primary is a plum pill with on-accent text; secondary is a surface pill with a rule border and ink text. 52 px high, minimum tap target 44 × 44 px, at most one primary button per view.
- **Inputs:** 48 px, label above (never placeholder-only), 1.5 px rule border; error state 2 px `{colors.error}` border with the message below, starting with what to fix.
- **Help button:** a 40 px round "?" in the top bar, plum on accent-tint; opens a short explanation of the current screen.
- **Attribution line:** `small`, ink-secondary, at the bottom of every screen with food data: "Data fra Open Food Facts og Matvaretabellen 2026".

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep the lined paper on the page and the day note | Remove the notebook lines or put lines inside cards |
| Use green only for food and orange only for training | Bring back teal, or use green/orange for success or warnings |
| Use `#2A7350` for green text and `#B9471F` for orange text | Put text in `#2F7D55` or `#D9542B` |
| Use plum only for actions and the active navigation item | Use plum for a category or a status |
| Show one big number (the day note) per screen | Add a calorie ring or several big stat numbers |
| Use Inter for all text; build hierarchy with size and weight | Add a second typeface or a decorative serif |
| Keep one primary button per view | Put two plum buttons side by side |
| Draw icons from one outline set | Use emoji or mixed icon styles |
