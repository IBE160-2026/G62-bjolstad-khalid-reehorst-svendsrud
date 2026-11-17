---
title: 'Story 6.4 (part 2 of 3): Playwright tests for the core loop'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'c3a52939a5e305bdd7c85be45ee3e0a3d604b5d4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-6-4a-demo-data-for-the-examiner.md'
  - '{project-root}/.docs/implementation-artifacts/spec-6-4c-help-button-and-sheet-focus.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing proves in a real browser that the whole core loop works, and the examiner has no single command for end-to-end tests (NFR1, NFR3, SM-1).

**Approach:** Add Playwright (`@playwright/test` as a frontend devDependency; Chromium installed with `npx playwright install chromium` — download approved by Osman 2026-11-18) with a small suite in `frontend/e2e/` that runs against the running Compose stack at `http://localhost:3000` and covers UJ-1 to UJ-4 on a desktop viewport, a 360 px no-horizontal-scroll check, and one real-browser sheet focus/Esc check. README documents one command for backend tests and one for Playwright.

## Boundaries & Constraints

**Always:** `frontend/playwright.config.ts`: `testDir: "e2e"`, `baseURL` from `E2E_BASE_URL` (default `http://localhost:3000`), Chromium only, desktop viewport 1280×800, retries 0, `reporter: "list"`, no `webServer` (the examiner starts Compose first). Script `"test:e2e": "playwright test"`. Each test registers its own fresh user (`e2e-{random}@demo.test`, password from a constant in the test file) so tests are independent and repeatable on a non-empty DB; demo users are only used read-only in one test. Tests use roles/labels/visible Norwegian text, never CSS classes. Suite: (1) UJ-1: register → consent → profile setup → I dag shows the target sentence; (2) UJ-2: log food by search ("havregryn") into Frokost and by barcode using the OFF mock adapter (a barcode the mock returns) → I dag remaining drops; (3) UJ-3: Trening with Hjemme → start workout → add Armhevinger → log a set → finish → I dag Trening card shows it; then as `sara@demo.test` adding Armhevinger shows "Sist: …"; (4) UJ-4: I dag shows meals and workout for the day; (5) at 360×800 on I dag, Mat and Trening, `document.documentElement.scrollWidth <= clientWidth`; (6) real-browser sheet: open the add-food sheet, focus is inside, Esc closes, focus returns to the opener; same for the help "?" sheet. Fix app bugs the suite finds only if small and in scope; otherwise record them. README "Tester": backend `docker compose exec backend pytest -q`; Playwright `cd frontend && npm ci && npx playwright install chromium && npm run test:e2e` (with the stack running). `frontend/e2e/` results/artifacts git-ignored. Not run by `npm run test` (Vitest) or `npm run build`.

**Never:** No other browsers, no visual snapshots, no CI changes, no test-only backend endpoints, no `OFF_MODE=live` in tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh run | stack up, empty or seeded DB | all tests pass | N/A |
| Rerun | same DB | passes again (new users each run) | N/A |
| Stack down | no server | clear connection error | N/A |
| 360 px | I dag, Mat, Trening | no horizontal scroll | N/A |
| Sheet | Esc | closes, focus back on opener | N/A |

</frozen-after-approval>

## Code Map

- `frontend/package.json` -- devDependency `@playwright/test`, script `test:e2e`.
- `frontend/playwright.config.ts`, `frontend/e2e/*.spec.ts` (new), `frontend/.gitignore` (test-results, playwright-report).
- `vitest.config` -- exclude `e2e/`; `eslint` covers `e2e/`.
- `README.md` -- "Tester".

## Tasks & Acceptance

**Execution:**
- [x] install Playwright and Chromium; config; script.
- [x] e2e suite (UJ-1–4, 360 px, sheets).
- [x] README commands.

**Acceptance Criteria:**
- Given `docker compose up --build -d`, when `cd frontend && npm run test:e2e` runs, then all tests pass, twice in a row.
- Given the change, when `npm run test -- --run`, `npm run lint`, `npm run build` and `docker compose exec backend pytest -q` run, then all pass.

## Implementation Notes

- `@playwright/test` pinned at 1.65.1 (like the other devDependencies). One spec file, `frontend/e2e/core-loop.spec.ts` (7 tests); `e2e/global-setup.ts` fails once with "Cannot reach … Start the stack first" when the stack is down. Artifacts go to `frontend/e2e/test-results/` (git- and docker-ignored); Vitest excludes `e2e/**` explicitly.
- The exercise is named "Armhevinger (Push-up)" in the list; the mock barcode is 7038010000980 ("TINE Lettmelk").
- "Sist" uses a fresh user: a finished workout dated yesterday (Oslo) with one done set of Armhevinger is created through the real API from the page's request context (same session cookie, Origin header), then today's workout is built in the UI. Sara is only read: one login, I dag shows her breakfast.
- I dag may show cached numbers for a moment after Mat while it refetches, so the remaining-kcal checks poll.
- No app bugs found. The set's "Ferdig" checkbox only shows as ticked once the server answers (controlled by the saved set), so the test clicks and waits instead of `check()`.

## Spec Change Log

## Review Triage Log

No separate reviewer subagent (test-only change; saved usage). Orchestrator checks:

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| Orchestrator | "Sist" test wrote to sara@demo.test (spec: read-only) | medium | Writes and cleanup on demo data | patch — fresh user + API setup; Sara read-only |
| Orchestrator | Parallel runs flaky against the dev server | medium | `--repeat-each 4` had timeouts | patch — `workers: 1`, expect timeout 10 s |
| Orchestrator | I dag briefly shows the old remaining kcal after leaving Mat | low | Cached value while refetching | rejected — not wrong data; tests wait for the new value |

## Verification

**Commands:**
- `docker compose up --build -d && cd frontend && npm run test:e2e` (twice) -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
