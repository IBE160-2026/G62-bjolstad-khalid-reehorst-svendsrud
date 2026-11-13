---
title: 'Story 1.1: Run the app with one command'
type: 'feature'
created: '2026-11-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '31be5d4de03ec20d0a7208569e7369706d1fca68'
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-prompt-force-2026-11-13/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has only planning documents. Nobody, including the examiner, can run anything, and every later story needs a working backend, frontend, database and API contract to build on.

**Approach:** Scaffold the monorepo from the architecture spine: a FastAPI backend and a Next.js frontend with official generators, PostgreSQL, all started by one `docker compose up`, with a health endpoint reached through the Next.js `/api` rewrite, the shared error envelope, Alembic, settings safeguards, generated API types, and a "Kom i gang" section in the README.

## Boundaries & Constraints

**Always:** pinned versions from the spine (FastAPI 0.162.5, Uvicorn 0.54.0, SQLAlchemy 2.1.8, Alembic 1.20.1, psycopg 3.3.9, pydantic 2.14.3, pydantic-settings 2.16.2, pytest 9.2.0, httpx 0.28.1; Next.js 16.4.6, React 19.3.1, Tailwind 4.3.5, TanStack Query 5.107.1, openapi-typescript 7.13.0, openapi-fetch 0.17.0, Vitest 5.1.0; images `postgres:18`, `python:3.14-slim`, `node:24`). Backend reachable only inside the Docker network; port 3000 is the only published port. Sync SQLAlchemy, plain `def` endpoints. Every error, including unknown routes and validation errors, uses `{"error": {"code", "message"}}` with Norwegian messages. Code in English; README and user-facing text in Norwegian bokmål.

**Never:** no domain tables or business features (users, sessions and the shell are stories 1.2–1.3); no shadcn/ui components or design tokens yet (story 1.2); no CORS; no secrets or `.env` committed; no `NEXT_PUBLIC_` secrets; no real external calls in tests; no Caddy, Redis or other services from the lecturer's reference stack.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Health via frontend | `GET http://localhost:3000/api/health` | 200 `{"status":"ok"}` | N/A |
| Unknown API route | `GET /api/nope` | 404 `{"error":{"code":"not_found","message":"Fant ikke siden."}}` | envelope, never HTML |
| Validation error | malformed request to any endpoint | 422 `{"error":{"code":"validation_error","message":"…"}}` | envelope |
| Unsafe production | `APP_ENV=production`, empty or default `SESSION_SECRET` | backend exits non-zero at startup with a clear log line | no server started |
| Local default | `.env` copied from `.env.example` | everything starts; migrations run | N/A |

</frozen-after-approval>

## Code Map

- Repository has no application code; root holds `.docs/`, `.logs/`, `_bmad/`, `.claude/`, `README.md`, `CLAUDE.md`, `PRODUCT.md`, `.gitignore` (already ignores `.env`, `.next/`, `node_modules/`, `.venv/`, `__pycache__/`).
- `README.md` -- has Status/Dokumentasjon/Mappestruktur sections; add "Kom i gang" and "Tester" sections, keep the rest.
- `.docs/implementation-artifacts/epic-1-context.md` -- distilled Epic 1 rules; follow it.
- Do not touch `_bmad/`, `.claude/`, `.docs/planning-artifacts/`, `.logs/` (except the session log at the end).

## Tasks & Acceptance

**Execution:**
- [x] `docker-compose.yml` -- services `db` (postgres:18, named volume, healthcheck), `backend` (build `backend/`, depends on healthy db, no published port), `frontend` (build `frontend/`, port 3000, `API_INTERNAL_URL=http://backend:8000`) -- one-command start (NFR-3).
- [x] `.env.example` -- `APP_ENV=local`, `SESSION_SECRET=change-me-local-only`, `POSTGRES_*`, `DATABASE_URL`, `TEST_DATABASE_URL`, `APP_URL=http://localhost:3000`, `OFF_MODE=mock`, with comments -- safe defaults (AD-16).
- [x] `backend/pyproject.toml`, `backend/uv.lock`, `backend/Dockerfile` -- uv-managed project with pinned deps; image runs `alembic upgrade head` then Uvicorn.
- [x] `backend/app/main.py`, `backend/app/core/{settings,db,errors}.py` -- app factory, pydantic-settings with production guard, one-session-per-request dependency, exception handlers for 404/422/HTTPException/unhandled producing the envelope.
- [x] `backend/app/modules/health/router.py` -- `GET /api/health` (public).
- [x] `backend/app/{modules,ports,seed}/__init__.py`, `backend/app/seed/seed.py` (`seed_if_empty` no-op stub, runs only when `APP_ENV=local`), `backend/app/cli.py` -- skeleton per spine source tree.
- [x] `backend/migrations/` + `backend/alembic.ini` -- Alembic initialised against settings, empty baseline revision.
- [x] `backend/scripts/export_openapi.py` -- writes `openapi.json` without starting a server.
- [x] `backend/tests/{conftest.py,test_health.py,test_errors.py,test_settings.py}` -- cover every I/O-matrix row except the frontend proxy.
- [x] `frontend/` -- `create-next-app` 16.4.6 (TypeScript, App Router, `src/`, Tailwind, ESLint); `next.config.ts` rewrite `/api/:path*` → `${API_INTERNAL_URL}/api/:path*`; `Dockerfile`; folders `src/modules/`, `src/lib/api/`, `e2e/`.
- [x] `frontend/src/lib/api/{schema.d.ts,client.ts}` + `package.json` script `gen:api` -- generated from `backend/openapi.json` with openapi-typescript; `openapi-fetch` client with base `/api`; committed.
- [x] `frontend/src/app/page.tsx` -- minimal Norwegian page "Prompt Force" that calls `/api/health` via the generated client and shows "Backend: ok" -- proves the rewrite end to end.
- [x] `frontend/vitest.config.ts`, `frontend/src/lib/api/client.test.ts` -- Vitest runs one test.
- [x] `README.md` -- "Kom i gang" (Docker version, `cp .env.example .env`, `docker compose up`, open http://localhost:3000), "Tester" (backend and frontend commands), "Utvikling" (`npm run gen:api`).

**Acceptance Criteria:**
- Given a clean clone with Docker, when `cp .env.example .env && docker compose up --build` runs, then all three services become healthy and http://localhost:3000 shows "Backend: ok".
- Given the running stack, when the backend tests run via the documented command, then all pass against a separate test database.
- Given the repo, when `git status` runs after a full start, then no generated build output, `.env` or caches are untracked or committed.
- Given the spine source tree, when the repo is opened, then every listed folder exists.

## Implementation Notes

- **API client base URL:** the generated paths already include `/api` (`/api/health`), so `createApiClient()` uses same-origin `baseUrl: ""`; a literal base of `/api` would produce `/api/api/health`. All calls still go through the `/api` rewrite.
- **Production guard:** lives in `Settings` (pydantic model validator, `SESSION_SECRET` is a `SecretStr`). The image `ENTRYPOINT` (`docker-entrypoint.sh`) runs `python -m app.cli check-config` before any command, so `docker compose run --rm backend true` also exits 1 with `CRITICAL app.cli: Startup refused: ...`. Compose passes `SESSION_SECRET` with `${SESSION_SECRET-...}` so an explicitly empty value reaches the guard.
- **Test database:** `db/init/01-create-test-db.sql` creates `promptforce_test` on first volume creation. `conftest.py` drops/recreates `public`, runs `alembic upgrade head` on `TEST_DATABASE_URL`, overrides `get_db`, and refuses to run if it equals `DATABASE_URL`. A volume created before this file existed needs `docker compose down -v`.
- **Validation/HTTP error tests** register throwaway routes on a fresh app instance, since `/api/health` takes no input.
- **`@types/node`** set to `^24` (matches the `node:24` image; Vitest 5.1.0 requires `^22 || >=24`, the generator's `^20` conflicted).
- **Generator output kept:** `cacheComponents`, `partialPrefetching` and the `@tailwindcss/turbopack` CSS rule from `create-next-app` 16.4.6; Geist fonts, dark-mode CSS and template SVGs removed (tokens/fonts are story 1.2). `frontend/AGENTS.md` is generator output and is re-added by `next dev`.
- **Known warning:** Starlette warns that `httpx` with `TestClient` is deprecated in favour of `httpx2`; the spine pins `httpx 0.28.1`, so it is left as is.
- **No bind mounts:** containers run the built image, so code changes need `docker compose up --build` (documented in README).

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| VG | Default `baseUrl: ""` of the shipped client untested | medium | Both client tests pass `baseUrl: "http://app.test"`; no test exercises the default that page.tsx uses | patch |
| VG | Real `get_db` commit/rollback never exercised (tests use a copy) | medium | conftest overrides `get_db` with a duplicate body; no endpoint uses a session yet | defer (with EC commit-after-response) |
| VG, EC | page.tsx throws TypeError on non-JSON error body | low | openapi-fetch 0.17.0 `index.mjs` keeps `error` as raw text when JSON.parse fails; `error?.error.message` then reads `.message` of undefined | patch |
| BH | Lockfiles missing from diff | false | `backend/uv.lock` (55 kB) and `frontend/package-lock.json` (273 kB) exist; they were only excluded from the review diff on purpose | rejected |
| BH | README says only Docker needed, tests need Node/uv on host | medium | "Tester" section requires local Node 24; frontend container already has dev dependencies | patch |
| BH, EC | Old db volume has no test database, README silent; raw traceback | low | init SQL runs only on first volume creation; note exists only in spec | patch (README note + friendly pytest exit) |
| BH, EC | Credentials and test DB name repeated/coupled without note | low | `.env.example`, compose and init SQL repeat values; changing one breaks others | patch (comments only) |
| BH | Health endpoint does not touch the database | low | backend runs `alembic upgrade head` before Uvicorn, so a healthy backend reached Postgres at start; a readiness probe adds code | rejected |
| BH | OpenAPI schema public in production | low | production is not deployed yet; schema exposure is harmless metadata | rejected |
| BH | Generated 422 schema will not match the envelope | medium | FastAPI adds `HTTPValidationError` for endpoints with inputs; none exist yet | defer |
| BH | Validation envelope lacks field details for inline errors | medium | UX needs per-field errors; contract decision belongs to story 1.3 | defer |
| BH, EC | Test-DB guard compares strings before `DROP SCHEMA ... CASCADE` | medium | equivalent URLs to the app DB pass the guard and the fixture drops the schema | patch |
| BH | Backend image runs as root and ships dev deps | low | relevant only for a production target, which the spine defers | defer |
| BH | Unhandled errors may be logged twice with exception message | maybe-false | needs a check of Uvicorn's log output after ServerErrorMiddleware re-raise | defer |
| BH | `.env.example` lacks API_INTERNAL_URL | low | set in compose, read by next.config.ts, undocumented | patch (comment) |
| BH | `frontend/README.md` is English generator boilerplate | low | wrong paths, Geist/Vercel text; conflicts with Norwegian-README rule | patch |
| BH | Playwright not installed though `e2e/` exists | low | story 1.1 only requires the folder; Playwright arrives with story 6.4 | rejected |
| BH | Misc test gaps (default secret via CLI, seed with APP_ENV=test, page states) | low | default secret covered by parametrized unit test; others add little | rejected |
| EC | `get_db` commits after the response is sent | medium | FastAPI 0.162.5 `Depends` has `scope` (default request), so yield-exit runs after the response; no endpoint writes yet | defer (same root as VG get_db) |
| EC | Windows CRLF breaks `docker-entrypoint.sh` shebang | medium | examiner may clone on Windows with autocrlf; no `.gitattributes` | patch |
| EC | CLI log omits which setting is invalid | low | message printed without `loc` | patch |
| EC | Short production secret accepted | low | spec requires only non-empty and non-default; length rule adds policy | rejected |
| EC | Production falls back to localhost DATABASE_URL | low | compose always sets DATABASE_URL; extra guard adds complexity | rejected |
| EC | Traceback on import may print raw SESSION_SECRET | false | `session_secret` is `SecretStr`; pydantic shows it masked in `input_value` | rejected |
| EC | `test_local_defaults_are_safe` depends on env vars | low | Settings reads OFF_MODE/APP_URL from env; trivial to isolate | patch |
| EC | Envelope body on 204/304 HTTPException | low | no endpoint raises those statuses | rejected |
| EC | Trailing slash in API_INTERNAL_URL | low | value is hardcoded in compose without slash | rejected |
| EC | Tasks list says client base `/api` | low | fix would edit this spec; deviation documented in Implementation Notes | rejected |

## Design Notes

The production guard lives in settings validation so it fails before the app binds a port. Test database: `conftest.py` creates/drops the schema on `TEST_DATABASE_URL` (a second database on the same Postgres, created by an init SQL file mounted into `db`). The frontend container runs `next dev` for now; a production build target is deferred until hosting is decided (spine Deferred).

## Verification

**Commands:**
- `docker compose up --build -d && curl -s localhost:3000/api/health` -- expected: `{"status":"ok"}`
- `curl -s localhost:3000/api/nope` -- expected: envelope with `not_found`
- `docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint` -- expected: pass
- `APP_ENV=production SESSION_SECRET= docker compose run --rm backend true` -- expected: non-zero exit with the guard message
