# G62 — Prompt Force

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Applikasjon

Appen publiseres på Vercel: [https://g62promptforce.vercel.app](https://g62promptforce.vercel.app)

Siden viser 404 til den første versjonen av appen er pushet til `main`. Vercel-prosjektet ligger på kontoen til Muhammad O Khalid.

## Medlemmer

- Karianne A Bjolstad
- Muhammad O Khalid
- Gustav Åbyholm Reehorst
- Fernando A Svendsrud

## Status

Planleggingen (BMAD) er ferdig, og koden bygges én story om gangen. Grunnmuren (story 1.1) kan kjøres lokalt, se [Kom i gang](#kom-i-gang).

| Steg | Status |
|---|---|
| Product brief | Godkjent av faglærer |
| Research | Ferdig |
| PRD | Ferdig (final 13.11), med faglærers tilbakemelding innarbeidet |
| UX-design | To forslag; gruppen har valgt å slå dem sammen ([issue #9](https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud/issues/9)) |
| Arkitektur | Ferdig 13.11: Next.js + FastAPI + PostgreSQL i Docker Compose ([arkitektur](.docs/planning-artifacts/architecture/architecture-prompt-force-2026-11-13/ARCHITECTURE-SPINE.md)) |
| Epics og stories | Ferdig 13.11: 7 epics og 32 stories ([epics.md](.docs/planning-artifacts/epics.md)) |
| Kode og tester | Pågår: story 1.1 (kjør appen med én kommando). Én branch og pull request per story |

Oppgaver og åpne spørsmål følges opp i [GitHub Issues](https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud/issues).

## Kom i gang

Du trenger bare [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker 24 eller nyere med Docker Compose v2). Du trenger ingen nøkler, kontoer eller betalte tjenester.

```bash
git clone https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud.git
cd G62-bjolstad-khalid-reehorst-svendsrud
cp .env.example .env
docker compose up --build
```

Åpne <http://localhost:3000> når alle tre tjenestene kjører. Siden skal vise «Backend: ok».

- `db` (PostgreSQL), `backend` (FastAPI) og `frontend` (Next.js) starter med én kommando. Bare port 3000 er åpen; nettleseren når backenden via `/api` på samme adresse.
- Databasemigreringer kjøres automatisk når backenden starter.
- Første oppstart laster ned images og pakker og tar noen minutter.
- Stopp med `Ctrl+C` eller `docker compose down`. `docker compose down -v` sletter også databasen.
- `.env.example` har trygge standardverdier for lokal kjøring. `.env` skal aldri committes. Med `APP_ENV=production` nekter backenden å starte hvis `SESSION_SECRET` er tom eller standardverdien.

## Tester

Med appen i gang (`docker compose up`) kjører alle testene i containerne, så du trenger bare Docker:

```bash
# Backend (pytest mot en egen testdatabase, promptforce_test)
docker compose exec backend pytest -q

# Frontend (Vitest og ESLint)
docker compose exec frontend npm run test -- --run
docker compose exec frontend npm run lint
```

Finner ikke backend-testene `promptforce_test`, ble databasevolumet laget før story 1.1. Kjør `docker compose down -v` én gang (sletter lokale data) og start på nytt.

Alternativ uten Docker for frontend (krever Node.js 24): `cd frontend && npm install && npm run test -- --run && npm run lint`.

## Utvikling

API-typene i frontend genereres fra backendens OpenAPI-skjema og committes. Når API-et endres:

```bash
# 1. Skriv backend/openapi.json (krever uv: https://docs.astral.sh/uv/)
cd backend
uv run python scripts/export_openapi.py

# 2. Generer frontend/src/lib/api/schema.d.ts
cd ../frontend
npm run gen:api
```

Endringer i koden krever at containerne bygges på nytt: `docker compose up --build`.

## Dokumentasjon

**Planlegging (BMAD)**
- [Product brief](.docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/) med tilbakemelding fra faglærer
- [PRD](.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md), med [tillegg](.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/addendum.md) (datamodell og tekniske detaljer)
- [Research](.docs/planning-artifacts/research/): trening, GDPR, datalisenser, strekkode, innlogging, Open Food Facts-dekning, [strekkodetest med varer hjemme](.docs/planning-artifacts/research/strekkodetest-fysiske-varer-2026-11-13/research.md) og forslag til teknologivalg
- [Øvelsesliste](.docs/planning-artifacts/ovelsesliste.md) og [gjennomgang med forslag til nye øvelser](.docs/planning-artifacts/ovelsesliste-gjennomgang-2026-11-11.md)

**UX-design**
- [Produktbeskrivelse for design](PRODUCT.md)
- Forslag A1: [konseptrunder og beslutninger](.docs/planning-artifacts/ux/konsepter/decisions.md), [valgt konsept](.docs/planning-artifacts/ux/valgt-konsept/), [DESIGN.md og EXPERIENCE.md](.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/)
- Forslag runde 3: [DESIGN.md, EXPERIENCE.md og mockups](.docs/planning-artifacts/ux/runde-3/)

**Prosess og KI-bruk**
- [KI-logg](.docs/ki-logg.md): hva vi ba KI om, hva den laget, og hva vi selv kontrollerte og endret
- [Sesjonslogger](.logs/): én mappe per gruppemedlem, med åpne punkter i `issues.md`

**Emnet**
- [Sensorveiledning del 1 – applikasjon og prosess](.docs/course/sensorveiledning-del1-applikasjon-og-prosess.pdf): vurderingskriteriene repoet skal oppfylle

## Mappestruktur

| Mappe | Innhold |
|---|---|
| `backend/` | FastAPI-backend: `app/` (core, moduler, porter, seed), Alembic-migreringer og tester |
| `frontend/` | Next.js-frontend: `src/app/`, `src/modules/`, generert API-klient i `src/lib/api/` og `e2e/` |
| `db/init/` | Oppstartsskript for PostgreSQL (oppretter testdatabasen) |
| `.docs/planning-artifacts/` | Brief, PRD, research, UX-design og øvelsesliste |
| `.docs/course/` | Dokumenter fra emnet |
| `.logs/` | Sesjonslogger per gruppemedlem |
| `_bmad/`, `.claude/` | BMAD-rammeverket og KI-skills som brukes i prosjektet |
