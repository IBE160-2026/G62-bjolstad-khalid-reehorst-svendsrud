# Metodevalg: story for story med menneskelig kontroll

*Utkast til rapporten. Skrevet med KI (Claude Code) på grunnlag av prosjektets egne filer; tallene er hentet 18.11.2026.*

## Hva vi valgte

Vi bygde Prompt Force én story om gangen med BMAD-skillen `bmad-build`, i stedet for å la en agent kjøre alle epicene autonomt med goal-kommandoen. Hver story gikk gjennom de samme stegene:

1. **Spec.** KI skrev en kort spec med frossen intensjon, regler og en tabell med kanttilfeller (`.docs/implementation-artifacts/spec-*.md`).
2. **Godkjenning.** Et gruppemedlem leste spec-en og godkjente den før det ble skrevet kode.
3. **Bygging.** En subagent med eget kontekstvindu implementerte spec-en og skrev tester.
4. **Review.** Uavhengige KI-kontrollører gikk gjennom endringene. Hvert funn ble vurdert som «rett», «utsett» eller «avvis», med begrunnelse i spec-ens Review Triage Log.
5. **Verifisering.** Alle backend- og frontend-tester, lint og build ble kjørt. Mot slutten kom Playwright-testene i ekte nettleser i tillegg.
6. **Logg, commit og pull request.** Hver story ble en egen PR som en annen i gruppa godkjente og flettet.

## Hvorfor ikke autonom kjøring

Faglæreren viste at begge måtene kan fungere, og at autonom kjøring sparer tid. Den kan også gi et resultat som ikke blir som du vil, og som må rettes i etterkant. Vi valgte story for story av tre grunner:

- **Kontroll over innholdet.** Dokumentene våre var flere steder uenige med hverandre. Med en menneskelig godkjenning per story kunne vi avgjøre slike konflikter selv i stedet for å la KI gjette:
  - Dekningstabellen for øvelser (14 mot 16).
  - UX mot PRD for «Første gang».
  - Om hjelpemuskler skal telle i filteret.
- **Gruppa var med underveis.** Hver PR ble godkjent av en annen i gruppa. Det fanget feil KI ikke så:
  - En overskrift som sto to ganger.
  - En Playwright-test som antok feil varenavn (Karianne, #53).
  - Videoer som måtte velges og ses av et menneske (Fernando, #52).
- **Bruksgrensen.** Lange autonome kjøringer bruker mye av grensen på én gang. Ved å ta én story om gangen kunne vi stoppe midt i (story 5.4 ble stoppet ved 87 % og fortsatt senere) og gå over fra tre til én kontrollør per story da grensen ble trang.

## Hva det ga

- **Omfang:** 31 spec-er ferdige, 239 commits på `main` og 39 flettede pull requests.
- **Review-funn:** 402 registrert, 173 rettet før fletting, 17 utsatt med begrunnelse og resten avvist med begrunnelse (Review Triage Log i hver spec).
- **Eksempler på alvorlige feil som ble fanget før fletting:**
  - En avsluttet treningsøkt kunne komme tilbake som aktiv.
  - En deaktivert konto kunne i sjeldne tilfeller beholde en innlogging.
  - En «Prøv igjen»-knapp virket aldri etter at en profil var slettet.
- **Tester ved slutt:** 578 backend-tester, 477 frontend-tester og 10 Playwright-tester som går gjennom hele løkka i Chrome.

## Hva det kostet

- **Mer ventetid.** Hver story ventet på godkjenning, og noen PR-er måtte bygges oppå hverandre. Én stablet PR (#44) havnet i feil branch og måtte erstattes (#45).
- **Gjentatte flettekonflikter** i loggfilene, fordi hver story oppdaterte de samme filene.
- **Mer tid per story enn en autonom kjøring.** Til gjengjeld trengte vi lite opprydding i etterkant.

## Konklusjon

For et gruppeprosjekt der flere skal forstå og stå inne for koden, og der kravdokumentene ikke alltid var enige, ga story for story med menneskelig godkjenning bedre kontroll enn autonom kjøring. Til et prosjekt med stabile krav og god tid kunne vi vurdert goal-kommandoen, for eksempel for de gjenværende Should-storiene.

**Kilder:**
- `.docs/implementation-artifacts/prosjekt-retro-2026-11-18.md`
- `.docs/implementation-artifacts/spec-*.md`
- `.docs/ki-logg.md`
- `.logs/osman-khalid/`
- git-historikken
