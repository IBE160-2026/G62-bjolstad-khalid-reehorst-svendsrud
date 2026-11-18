---
title: 'Retrospektiv: Prompt Force, epic 1–6 (samlet)'
date: '2026-11-18'
scope: 'Epic 1–6 og Should-stories 4.5, 6.3 og 1.8'
verdict: 'accepted-with-open-items'
---

# Retrospektiv: Prompt Force, epic 1–6

Samlet retrospektiv for hele prosjektet i stedet for én per epic (Osmans valg, for å spare bruksgrensen). Alle funn har en kilde.

## Sammendrag

- **Levert:** alle Must-stories i epic 1–6, pluss Should-stories 4.5 (filtre), 6.3 (ukestripe) og 1.8 (deaktivere konto). 31 spec-er har `status: 'done'` (`.docs/implementation-artifacts/spec-*.md`).
- **Ikke levert (Should):** 1.7 glemt passord, 3.8 kamera-skanning, 4.6 muskelfigur (`sprint-status.yaml`). Epic 7 (fase 2) er ikke startet.
- **Tester ved siste kjøring:** 578 backend, 477 frontend, Playwright 10/10 (`.logs/osman-khalid/941-2026-11-18-12-00-00-story-1-8-deaktiver.md`).
- **Review:** 402 funn registrert i spec-enes Review Triage Log: 173 rettet, 17 utsatt, resten avvist med begrunnelse (opptelling over alle `spec-*.md`).
- **Historikk:** 230 commits på `main`, 38 flettede PR-er (`git log`, `gh pr list --state merged`).

## Hva gikk bra

1. **Fast prosess per story.** Spec → godkjenning fra Osman → bygging → review → retting → logg. Hver spec har en frossen intensjon og en triage-tabell (alle `spec-*.md`, seksjonene «Review Triage Log»).
2. **Review fant ekte feil, ikke bare stil.** Eksempler:
   - Avsluttet økt kunne komme tilbake som aktiv (`spec-5-4-…md`, triage).
   - Deaktivert konto kunne beholde en innlogging (`spec-1-8-…md`, triage).
   - «Prøv igjen» som aldri virket etter slettet profil (`spec-4-3-…md`, triage).
3. **Uenige dokumenter ble oppdaget og avgjort av et menneske.** KI flagget motsetninger i stedet for å velge selv:
   - Dekningstabellen 14 → 16 (`spec-4-3`).
   - UX «skjul linja» mot PRD «Første gang» (`spec-5-3`).
   - Ventetid 300 mot 200 ms (`spec-4-4`, Spec Change Log).
   - Hjelpemuskler i filter, valg A (`spec-4-5`).
   - 6 mot 10 økter i demodata, valg A (`spec-6-4a`).
4. **Testdekning gjennom hele stacken.** Backend-tester per story, Vitest per komponent, og til slutt Playwright for hele løkka i ekte Chrome (`frontend/e2e/core-loop.spec.ts`).
5. **Sensor-vennlig.** Én kommando starter alt. Det finnes demobrukere med 14 dagers data (`backend/app/seed/demo.py`), «?»-hjelp på hver side, og README med «Prøv appen» og testkommandoer (`README.md`).

## Hva var vanskelig

1. **Stablede PR-er havnet i feil branch.** #44 ble flettet inn i 5.2-branchen i stedet for `main`, fordi den bygde på #43. Ny PR #45 rettet det (`.docs/ki-logg.md`, Story 5.1–5.4; `.logs/osman-khalid/issues.md`). Etterpå flyttet vi stablede PR-er til `main` før fletting (#47, #49).
2. **Konflikter i loggfiler ved nesten hver fletting.** `issues.md`, `ki-logg.md` og `sprint-status.yaml` konfliktet gjentatte ganger og måtte løses for hånd ved å beholde begge sider (`.logs/osman-khalid/issues.md`).
3. **Ekstern tjeneste var ustabil.** Open Food Facts svarte 503. Det ble løst med nye forsøk, færre sider og en side-cache som gjør importen gjenopptakbar (`spec-3-7-…md`, Spec Change Log).
4. **Bruksgrensen styrte tempoet.** Fra story 5.1 gikk vi fra tre til én kontrollør per story, og 6.4b ble kontrollert av orkestratoren alene (`spec-6-4b-…md`, Review Triage Log). 5.4 ble stoppet midt i ved 87 % og fortsatt senere (`.logs/osman-khalid/948-…-story-5-4-fullfor.md`).
5. **Testfeil som bare viste seg i ekte miljø.**
   - Strekkodetesten antok et navn som bare finnes i gamle databaser. Karianne rettet det i #53.
   - Sara-testen avhang av datoen demodataen ble laget (`spec-1-8-…md`, notater; `.logs/osman-khalid/941-…`).
   - Begge ble funnet først når andre kjørte testene.
6. **Gjentatte typer funn i review.** Fokus og skjermleser-beskjeder, cache-oppdatering etter endringer, og tester for brukerisolasjon gikk igjen i nesten alle frontend-stories (triage i `spec-3-6`, `spec-4-2`, `spec-5-1`, `spec-5-2`, `spec-6-1`, `spec-6-3`). Fellestesten i `frontend/src/test/sheet-a11y.ts` (6.4c) kom sent. Den kunne spart runder hvis den var laget tidlig.

## KI-bruk og kontroll

- KI skrev spec-utkast, kode, tester og review. Mennesker godkjente hver spec, tok alle avgjørelser der dokumentene var uenige, og godkjente hver push og fletting (`.docs/ki-logg.md`).
- Gruppen fanget feil KI ikke så:
  - «I dag» stod to ganger (Karianne).
  - Strekkodetesten (Karianne, #53).
  - Shorts-videoene ble valgt og sett av Fernando (#52).

## Funn og tiltak

| # | Funn | Kilde | Tiltak | Eier |
|---|---|---|---|---|
| 1 | 18 utsatte punkter står i `deferred-work.md`. Tre ser ut til å være løst senere: «Backend: ok» er erstattet (6.1), registrering gjennom proxy er dekket av Playwright, og ark testet i ekte nettleser (6.4b). | `deferred-work.md` | Gå gjennom lista, marker løste punkter og vurder resten før innlevering | Osman |
| 2 | Demotesten for «Sist» bruker fast dato 2026-11-17 og feiler om ett år | `deferred-work.md` (6.4a) | Godta for innleveringen; noter i rapporten | Osman |
| 3 | Referansedata (utstyr, øvelser) lastes bare lokalt | `deferred-work.md` (4.2) | Ikke nødvendig for lokal innlevering; nevn som kjent begrensning | Gruppen |
| 4 | KI-skrevne øvelsestekster er merket «utkast» | `backend/app/seed/data/exercises.json` (`review_status`) | Gruppen leser og godkjenner, eller sier det i rapporten | Gustav |
| 5 | Kilde for kaloribehov-gulvet 1200/1500 kcal mangler | `.logs/osman-khalid/issues.md` | Finn kilde eller beskriv som antakelse | Gustav |
| 6 | Shorts vises liggende (16:9) | PR #52, `video-embed.tsx` | Stående spiller når #52 er flettet | Osman |
| 7 | Gjenværende Should: 1.7, 3.8, 4.6 | `sprint-status.yaml` | Valgfritt; 3.8 og 4.6 trenger tegninger fra Karianne | Gruppen |

**Prosesslærdom til neste prosjekt**
- Flytt stablede PR-er til `main` før de godkjennes.
- Lag felles tester for tilgjengelighet tidlig.
- Kjør ende-til-ende-tester mot en fersk database før hver PR.

## Akseptvurdering

**accepted-with-open-items.** Alle Must-akseptkriterier er dekket av tester, og Playwright-løkka består (`frontend/e2e/core-loop.spec.ts`). De åpne punktene i tabellen over er dokumentasjon, innhold og valgfrie Should-stories. Ingen av dem blokkerer kjernen.

## Antakelser og avgrensning

- Samlet retrospektiv for epic 1–6 etter ønske fra Osman, ikke én per epic.
- `bmad-review` ble ikke kjørt på nytt over hele diffen. Hver story hadde allerede egen review (Review Triage Log). Det gjør at funn i grensene mellom stories bare er dekket av Playwright-testene.
- Ingen manuell gjennomkjøring i nettleser i denne retroen; atferd er sjekket med Playwright (10/10).
- Tallene for review-funn er telt automatisk fra triage-tabellene. Rader med flere funn telles som én.
