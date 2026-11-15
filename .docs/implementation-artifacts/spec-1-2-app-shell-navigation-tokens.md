---
title: 'Story 1.2: App shell with navigation and design tokens'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '81886483db81934373abca27f6e924cc6c87ce59'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend is a single health-check page with no navigation, no design tokens and no theme, so every later story would invent its own layout and colours.

**Approach:** Build the app shell (sidebar ≥ 1024 px, icon rail 768–1023 px, bottom tab bar < 768 px, top bar with page title and a light/dark toggle) around placeholder pages for I dag, Mat, Trening, Historikk and Profil, styled only from one token file with a light and a dark variant (NFR-12). Token values are placeholders from the merged design on `ux/felles-design` until the group finalises PR #17.

## Boundaries & Constraints

**Always:** All colours, fonts, radii, spacing and shadows come from CSS variables in one file (`src/styles/tokens.css`), exposed to Tailwind via `@theme inline` and named so shadcn/ui components can use them (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--card`, `--border`, `--ring`, `--muted-foreground`, …). Components never use raw hex values. Light is the default; the choice is stored in `localStorage` under `pf-theme` and applied before first paint (no flash). Icons come from one outline set (lucide-react). All shell text is Norwegian bokmål. Focus ring is 2 px with offset. Tab title is `"<side> · Prompt Force"`.

**Never:** No backend changes. No real page content (Daily Overview, food, training are later stories). No emoji icons. No new colour roles beyond those in DESIGN.md. No `prefers-color-scheme` auto-switch (light is the default regardless of OS). Do not install the full shadcn CLI or components yet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop | width ≥ 1024 | Sidebar with 5 labelled items; active item marked (`aria-current="page"`) | N/A |
| Tablet | 768–1023 | Icon rail; each item has an accessible name | N/A |
| Mobile | < 768, down to 360 | Bottom tab bar with I dag, Mat, Trening, Profil; no horizontal scroll | N/A |
| First visit | no `pf-theme` | Light mode | N/A |
| Toggle | click theme button | Mode switches without reload; button label states the next action ("Bytt til mørk modus") | N/A |
| Reopen | `pf-theme=dark` stored | Dark mode on first paint | Invalid stored value → light |
| Storage blocked | `localStorage` throws | Toggle still works for the session | Errors caught, no crash |

</frozen-after-approval>

## Code Map

- `frontend/src/app/layout.tsx` -- root layout; add theme bootstrap script, font, metadata `title.template = "%s · Prompt Force"`, and wrap children in the shell.
- `frontend/src/app/globals.css` -- import Tailwind and `src/styles/tokens.css`; remove the Arial body rule.
- `frontend/src/app/page.tsx` -- current health check; move it to the I dag page and keep the "Backend: ok" status line (story 1.1 verification depends on it).
- `frontend/src/app/providers.tsx` -- TanStack provider; keep.
- `frontend/vitest.config.ts` -- `environment: "node"`; component tests need jsdom.
- Placeholder token values: `git show origin/ux/felles-design:.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/DESIGN.md` (colours, Inter, radii, spacing, shadows). Dark values are not in DESIGN.md; derive them (warm dark surfaces, lighter plum accent) and check contrast.
- Do not touch `backend/`, `.docs/planning-artifacts/`, `_bmad/`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/package.json` -- add `lucide-react@1.66.0`; dev `jsdom@30.1.3`, `@testing-library/react@16.3.3`, `@testing-library/jest-dom@7.0.1` (all ≥ 2 weeks old) -- icons and component tests.
- [x] `frontend/src/styles/tokens.css` -- light tokens on `:root`, dark on `[data-theme="dark"]`, `@theme inline` mapping -- single swap point.
- [x] `frontend/src/styles/CONTRAST.md` -- table of every text/background pair with ratio for both modes; body ≥ 4.5:1 -- AC.
- [x] `frontend/src/lib/theme.ts` (+ test) -- read/write/apply theme with try/catch and validation; inline bootstrap script string -- I/O rows 4–7.
- [x] `frontend/src/components/shell/{nav-items.ts,app-shell.tsx,sidebar.tsx,tab-bar.tsx,top-bar.tsx,theme-toggle.tsx}` -- shell components; active item from `usePathname()`.
- [x] `frontend/src/app/{page.tsx,mat,trening,historikk,profil}/page.tsx` -- I dag at `/`, others at Norwegian routes, each with `metadata.title` and a short placeholder sentence.
- [x] `frontend/src/components/shell/*.test.tsx`, `frontend/vitest.config.ts` -- jsdom tests: nav items and `aria-current`, toggle switches `data-theme` and persists.
- [x] `frontend/VOICE.md` -- short voice guide (du-form, verbs on buttons, no BMR/TDEE jargon, no streaks or shaming) -- UX-DR18.

**Acceptance Criteria:**
- Given the running stack, when a user tabs through the shell, then focus is visible on every control and order follows reading order.
- Given any shell page, when `npm run build` and `npm run lint` run, then both pass with no raw hex colours outside `tokens.css` (`grep -rE "#[0-9a-fA-F]{3,6}" src --include=*.tsx` is empty).

## Implementation Notes

- **Tokens:** raw radius/shadow tokens are named `--rounded-*` and `--elevation-*`; same names as Tailwind theme variables would refer to themselves. Dark values are derived (DESIGN.md has none) and listed in `frontend/src/styles/CONTRAST.md`.
- **Contrast fix:** light `--training-text` darkened from DESIGN.md's `#B9471F` to `#B4451E` so it passes 4.5:1 on `--training-tint`; the group sets final values in PR #17.
- **Theme:** `ThemeScript` renders `text/javascript` on the server and `text/plain` on the client so React does not warn; `ThemeToggle` reads the theme via `useSyncExternalStore` and re-applies it in a layout effect, because React's dev Strict Mode clears `<html>` attributes.
- **I dag title:** the root page uses `{ absolute: "I dag · Prompt Force" }`, since the layout's title template does not apply to a page in the same segment.
- **Extra:** a "Hopp til innhold" skip link was added. The help button ("?") is not built; the spec asks only for the title and the theme toggle.
- **Breakpoints:** sidebar/rail/tab bar visibility is CSS-only and was checked manually in Chrome at 1280, 900 and 360 px (no horizontal scroll); jsdom tests cover links, names and `aria-current`.
- **Fonts:** `next/font/google` downloads Inter at build or dev time, so it needs network access then.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC, BH | Historikk unreachable below 768 px | low | Tab bar holds I dag, Mat, Trening, Profil as the frozen intent and UX-DR2 require; Historikk is a placeholder, and the week strip's calendar (story 6.3) is the planned mobile entry | defer |
| EC | Tab bar grid hardcodes 4 columns | low | Only changes if `inTabBar` flags change, which a developer sees at once; fix adds dynamic styling | rejected |
| EC, BH | No cross-tab `storage` sync for theme | low | Other tabs update on reload; adding a listener is extra surface for a rare case | rejected |
| EC, BH | Tab bar ignores iOS safe-area inset | false | No `viewportFit: "cover"` is set, so `env(safe-area-inset-bottom)` is 0 and the browser keeps the bar above the home indicator | rejected |
| EC, BH, VG | Light `--training-text` on `--training-tint` is 4.35:1 | medium | CONTRAST.md row; spec task requires body ≥ 4.5:1 | patch |
| BH | `main` bottom padding `pb-28` not tied to `--tab-bar-height` | low | Changing the token leaves content under the tab bar; direct correction | patch |
| BH | Sidebar hover uses the same classes as the active item | low | `hover:bg-accent hover:text-accent-foreground` equals the active style, so hover looks like the current page | patch |
| BH | Health line uses "backend" jargon on I dag | low | Temporary line kept for story 1.1 verification; replaced by the Daily Overview in story 6.1 | defer |
| BH | CONTRAST.md has no automated check | low | Fix adds a token parser and test; table is reviewed when tokens change | rejected |
| BH | ThemeScript relies on server/client type difference | maybe-false | Works in manual Chrome check with no hydration warning; would need a production build check in Safari/Firefox | rejected |
| BH | Missing tests for TopBar title per route | low | `pageTitle` is unit-tested; TopBar only renders it | rejected |
| BH | No per-theme `theme-color` meta; VOICE.md lacks number/date rules | low | Cosmetic; number and date rules belong with the first story that formats them | rejected |
| VG | ThemeScript server render untested (no-flash path) | medium | No test renders `ThemeScript`; swapping the ternary breaks first-paint dark mode silently | patch |
| VG | "Backend: ok" health line untested | medium | No test covers `HealthStatus`; story 1.1 verification relies on it | patch |
| VG | Skip link target untested | low | Static `href`/`id` pair; covered by the manual tab-through check | defer |

## Design Notes

Theme bootstrap: a tiny inline `<script>` in `<head>` reads `pf-theme` and sets `document.documentElement.dataset.theme` before paint; `<html suppressHydrationWarning>` avoids the attribute mismatch. Tailwind 4 dark variant: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`.

## Verification

**Commands:**
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
- `docker compose up --build -d` then open http://localhost:3000 -- expected: shell with I dag active and "Backend: ok"

**Manual checks (if no CLI):**
- Resize to 1280, 900 and 360 px; toggle dark mode and reload; tab through the shell.
