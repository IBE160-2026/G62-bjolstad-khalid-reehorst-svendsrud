# Deferred work

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Make `get_db` commit before the response is sent and test the real dependency, not a copy.
  evidence: FastAPI 0.162.5 runs yield-dependency exit code after the response by default (`Depends(scope=...)` exists), so a failed commit would still return 2xx; conftest overrides `get_db` with a duplicate. Fix with the first writing endpoint (story 1.3).
  status: resolved 2026-11-18 — `DbSession` uses `Depends(get_db, scope="function")` (`backend/app/core/db.py`).

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Make the generated OpenAPI 422 response match the error envelope.
  evidence: FastAPI adds an `HTTPValidationError` (`detail: [...]`) 422 schema to endpoints with inputs, but the handler returns `{"error": {...}}`; generated frontend types would be wrong from story 1.3 on.
  status: resolved 2026-11-18 — no `HTTPValidationError` left in `backend/openapi.json`.

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Decide whether the validation envelope carries per-field errors for inline form messages.
  evidence: The UX requires inline errors under each field and focus on the first invalid field; the current envelope only has one generic message. Decide in story 1.3.
  status: resolved 2026-11-18 — the envelope has `fields` (`backend/app/core/errors.py`), used by every form.

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Run the backend image as a non-root user without dev dependencies once a production target exists.
  evidence: The Dockerfile has no USER and `uv sync --frozen` installs pytest/httpx; acceptable for local use only.
  status: open — local-only setup; not needed for the delivery.

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Check whether unhandled errors are logged twice with the exception message (unverified, medium if true).
  evidence: Starlette's ServerErrorMiddleware re-raises after the handler, so Uvicorn may log a second traceback; settle by triggering a 500 in the running stack and reading the backend logs.
  status: open — unverified; low impact for local use.

- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Give mobile users a way to reach Historikk (not in the bottom tab bar).
  evidence: Below 768 px the sidebar is hidden and the tab bar has only I dag, Mat, Trening and Profil; plan the entry with the week strip calendar in story 6.3.
  status: resolved 2026-11-18 — the week strip with «Velg dato» (story 6.3) reaches earlier days on every screen size.

- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Replace the temporary "Backend: ok" health line on I dag with the Daily Overview.
  evidence: The line uses developer wording ("backend") that VOICE.md forbids; it stays only for story 1.1 verification until story 6.1.
  status: resolved 2026-11-18 — replaced by the Daily Overview in story 6.1.

- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Add an AppShell render test that the skip link targets the main landmark.
  evidence: Renaming `#innhold` or the `main` id would silently break the skip link; no test renders AppShell.
  status: open — still no test; low risk.

- source_spec: `.docs/implementation-artifacts/spec-1-3-create-an-account.md`
  summary: Add a Playwright smoke test that registers through the Next.js proxy and checks the `pf_session` cookie and redirect.
  evidence: Backend tests use TestClient and Vitest mocks the API client, so a proxy that drops `Origin` or `Set-Cookie` would pass every test; fits story 1.4 when logged-in routing exists.
  status: resolved 2026-11-18 — the Playwright suite registers and logs in through the proxy on :3000 (story 6.4 part 2).

- source_spec: `.docs/implementation-artifacts/spec-1-3-create-an-account.md`
  summary: Check that Safari keeps the `Secure` session cookie on `http://localhost` (unverified, medium if true).
  evidence: Verified in Chrome only; if Safari drops it, registration succeeds but the user is not logged in. Settle by registering in current Safari; fix by tying `secure` to the `APP_URL` scheme.
  status: resolved 2026-11-18 — Karianne logged in on Safari and Chrome on Mac; it works.

- source_spec: `.docs/implementation-artifacts/spec-1-6-delete-my-account.md`
  summary: Add page-level render tests for `/logg-inn` (deleted-account status line) and Profil (delete button), or cover them in the first Playwright smoke test.
  evidence: Removing either component from its page passes every Vitest suite and the build; only the manual check covers it.
  status: partly resolved — Profil → Konto is exercised by the story 1.8 Playwright test; the deleted-account status line on `/logg-inn` is still untested.

- source_spec: `.docs/implementation-artifacts/spec-1-6-delete-my-account.md`
  summary: Test Alembic downgrades with an upgrade → downgrade → upgrade round trip.
  evidence: No migration's downgrade is ever run; 0005's downgrade now deletes soft-deleted users and must stay correct.
  status: open — not needed for the delivery.

- source_spec: `.docs/implementation-artifacts/spec-3-3-type-a-barcode.md`
  summary: Test that a found OFF barcode lookup invalidates cached food searches.
  evidence: Removing the `onSuccess` invalidation in `useLookupBarcode` passes every test; a just-cached item can be missing from search for up to 60 s.
  status: open — low risk.

- source_spec: `.docs/implementation-artifacts/spec-3-4-log-a-recent-food-with-one-tap.md`
  summary: Story 3.6 edit/delete mutations must also invalidate `["food-recent"]`.
  evidence: Only `useAddFoodEntry` invalidates the recent list; editing or deleting an entry changes `last_grams`, `last_meal` and membership.
  status: resolved 2026-11-18 — add, edit, delete and restore all call `invalidateEntry`, which invalidates `["food-recent"]` (`frontend/src/modules/food/api.ts`).

- source_spec: `.docs/implementation-artifacts/spec-4-2-save-my-equipment.md`
  summary: Add a concurrency test for the per-user advisory lock (two simultaneous deletes of a two-profile user).
  evidence: Removing `lock_user_profiles` passes every sequential test; a user could end with zero or 11 profiles.
  status: open — no concurrency harness.

- source_spec: `.docs/implementation-artifacts/spec-4-2-save-my-equipment.md`
  summary: Seed read-only reference data (equipment, muscle groups, exercises) outside `APP_ENV=local` before any deployment.
  evidence: `seed_if_empty` only runs locally; without equipment, default profiles start empty (repaired on read once seeded).
  status: open — not needed for local delivery; known limitation.

- source_spec: `.docs/implementation-artifacts/spec-6-4a-demo-data-for-the-examiner.md`
  summary: The "Sist" demo API test uses a fixed date (2026-11-17); it fails once the real date is more than a year later (workout date window).
  evidence: Workout dates must be within 366 days of the real server date.
  status: open — accepted for the delivery.

- source_spec: `.docs/implementation-artifacts/spec-6-4c-help-button-and-sheet-focus.md`
  summary: Check sheet focus, Esc (including a second Esc) and return focus in a real browser with Playwright (6.4 part 2); the jsdom dialog polyfill cannot prove native behaviour.
  evidence: Polyfilled showModal only sets `open`; Esc helper fires `cancel` itself.
  status: resolved 2026-11-18 — Playwright checks the add-food and help sheets in Chromium (story 6.4 part 2).
- source_spec: `.docs/implementation-artifacts/spec-5-2-log-my-sets.md`
  summary: Focus drops to `<body>` after "Legg til sett".
  evidence: Found by Karianne when testing PR #43 (comment on #57).
  status: resolved 2026-11-18 — fixed in the focus/docstring PR.
- source_spec: `.docs/implementation-artifacts/spec-5-2-log-my-sets.md`
  summary: Exercises added to a workout before migration 0015 have 0 sets (no backfill).
  evidence: Found by Karianne when testing PR #43 (comment on #57); only affects databases with workouts from before story 5.2.
  status: open — low; new databases are not affected.
- source_spec: `.docs/implementation-artifacts/spec-6-1-see-my-day-at-a-glance.md`
  summary: The docstring in `backend/app/modules/overview/router.py` and the spec's "Always" line say "more than one day after today", but the code (on purpose) rejects any date after today.
  evidence: Found by Karianne (comment on #57).
  status: resolved 2026-11-18 — fixed in the focus/docstring PR.
- source_spec: `.docs/implementation-artifacts/spec-1-8-deactivate-my-account.md`
  summary: Focus drops to `<body>` after "Lukk" on the "Velkommen tilbake!" message.
  evidence: Found by Karianne when testing PR #55 (comment on #57).
  status: resolved 2026-11-18 — fixed in the focus/docstring PR.


- source_spec: `.docs/implementation-artifacts/spec-1-7-reset-a-forgotten-password.md`
  summary: Used and expired `password_resets` rows are never purged.
  evidence: No delete path for the table besides user deletion (cascade); growth is at most 3 rows per account per hour, so a cleanup in the purge job can wait.
  status: open
