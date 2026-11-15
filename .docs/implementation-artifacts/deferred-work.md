# Deferred work

- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Make `get_db` commit before the response is sent and test the real dependency, not a copy.
  evidence: FastAPI 0.162.5 runs yield-dependency exit code after the response by default (`Depends(scope=...)` exists), so a failed commit would still return 2xx; conftest overrides `get_db` with a duplicate. Fix with the first writing endpoint (story 1.3).
- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Make the generated OpenAPI 422 response match the error envelope.
  evidence: FastAPI adds an `HTTPValidationError` (`detail: [...]`) 422 schema to endpoints with inputs, but the handler returns `{"error": {...}}`; generated frontend types would be wrong from story 1.3 on.
- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Decide whether the validation envelope carries per-field errors for inline form messages.
  evidence: The UX requires inline errors under each field and focus on the first invalid field; the current envelope only has one generic message. Decide in story 1.3.
- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Run the backend image as a non-root user without dev dependencies once a production target exists.
  evidence: The Dockerfile has no USER and `uv sync --frozen` installs pytest/httpx; acceptable for local use only.
- source_spec: `.docs/implementation-artifacts/spec-1-1-run-app-one-command.md`
  summary: Check whether unhandled errors are logged twice with the exception message (unverified, medium if true).
  evidence: Starlette's ServerErrorMiddleware re-raises after the handler, so Uvicorn may log a second traceback; settle by triggering a 500 in the running stack and reading the backend logs.
- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Give mobile users a way to reach Historikk (not in the bottom tab bar).
  evidence: Below 768 px the sidebar is hidden and the tab bar has only I dag, Mat, Trening and Profil; plan the entry with the week strip calendar in story 6.3.
- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Replace the temporary "Backend: ok" health line on I dag with the Daily Overview.
  evidence: The line uses developer wording ("backend") that VOICE.md forbids; it stays only for story 1.1 verification until story 6.1.
- source_spec: `.docs/implementation-artifacts/spec-1-2-app-shell-navigation-tokens.md`
  summary: Add an AppShell render test that the skip link targets the main landmark.
  evidence: Renaming `#innhold` or the `main` id would silently break the skip link; no test renders AppShell.
- source_spec: `.docs/implementation-artifacts/spec-1-3-create-an-account.md`
  summary: Add a Playwright smoke test that registers through the Next.js proxy and checks the `pf_session` cookie and redirect.
  evidence: Backend tests use TestClient and Vitest mocks the API client, so a proxy that drops `Origin` or `Set-Cookie` would pass every test; fits story 1.4 when logged-in routing exists.
- source_spec: `.docs/implementation-artifacts/spec-1-3-create-an-account.md`
  summary: Check that Safari keeps the `Secure` session cookie on `http://localhost` (unverified, medium if true).
  evidence: Verified in Chrome only; if Safari drops it, registration succeeds but the user is not logged in. Settle by registering in current Safari; fix by tying `secure` to the `APP_URL` scheme.
