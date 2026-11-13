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
