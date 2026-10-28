# Pre-PRD research og verifisering

## 2026-10-28 kl. 19:20 — Karianne

### Oppgave
Oppdatere repoet mot GitHub, deretter kjøre grundig research (Deep Recon) på flere av de åpne punktene fra `.docs/planning-artifacts/research/research-prd-forberedelse-2026-10-27.md` før PRD-arbeidet torsdag, og til slutt kontrollere regneeksemplene for kaloriberegningen og oppdatere statusen i dokumentasjonen.

### Plan
- `git pull` for å hente nyeste endringer fra `main`.
- Fire separate `bmad-deep-recon`-runder, hver med egen plangodkjenning fra brukeren før oppstart:
  1. **Domain/explore:** lisensiering av Matvaretabellen, wger og free-exercise-db for seed-data.
  2. **Technical/select:** valg av strekkodebibliotek for EAN-13-skanning i nettleseren (4 kandidater + 1 wildcard screenet inn).
  3. **Domain/explore:** GDPR/helseopplysninger for et studentprosjekt (3 delspørsmål).
  4. **Technical/select:** innloggingstilnærming for v1 (3 tilnærmingskategorier, siden tech-stack ikke er valgt ennå).
  - Hver runde: fan-out av research-subagenter, digest-filer skrevet før syntese, mekanisk og semantisk sitatkontroll (fant og rettet flere mindre sitatfeil per runde), redaksjonell polering (structure+prose), og en HTML-briefing i tillegg til `research.md`.
- Uavhengig kontroll av de fire regneeksemplene for Mifflin-St Jeor-formelen i briefen (BMR og kaloriemål per testprofil), og oppdatering av KI-loggen og forberedelsesdokumentet med resultatet.

### Resultat
- `main` oppdatert (fast-forward `a338298` → `1f4157c`).
- Fire ferdige forskningsrapporter under `.docs/planning-artifacts/research/`, hver med `research.md`, `research-briefing.html`, `digests/` og `.memlog.md`:
  - `domain-matvaretabellen-wger-free-exercise-db-li-2026-10-28/` — Matvaretabellen trygt å bruke (gratis, attribusjonskrav); wger-data krever per-rad lisenssporing; free-exercise-db-tekst er fri (Unlicense), men **ikke** bildene (uavklart opphav).
  - `technical-barcode-scanning-library-selection-2026-10-28/` — anbefaling **Quagga2** (vektet 21/27), native `BarcodeDetector` kuttet (deaktivert i iOS Safari t.o.m. 27.2).
  - `domain-gdpr-helseopplysninger-studentprosjekt-2026-10-28/` — GDPR gjelder uansett prosjektstørrelse; **Sikts meldeplikt gjelder forsking, ikke nødvendigvis vanlige kursoppgaver** (institusjonsspesifikt, bekreftet direkte mot sikt.no).
  - `technical-login-authentication-approach-selection-2026-10-28/` — anbefaling **rull selv** (OWASP-sjekkliste) for v1 (vektet 23/25), bibliotekvalg utsatt til arkitekturfasen; Supabase/Firebase lokal-modus som nærmeste alternativ.
- Regneeksemplene for kaloriberegningen kontrollert uavhengig (Python): alle fire profiler i briefen stemmer eksakt med Mifflin-St Jeor-formelen og oppgitt avrunding.
- Oppdaterte filer:
  - `.docs/ki-logg.md` — fylt inn kontrollresultatet for regneeksemplene, huket av statuslinjen.
  - `.docs/planning-artifacts/research/research-prd-forberedelse-2026-10-27.md` — oppdatert status for punktene «Strekkodebibliotek», «Innlogging», «Personvernkrav» og «Regneeksemplene» i seksjon 6, med lenker til de nye forskningsrapportene.
- Ingen av disse endringene er committet i denne økten (kun loggfila committes her).

### Åpne punkter
- Mobilspike for strekkodeskanning (Quagga2 på ekte iPhone/Android) er ikke kjørt — det er selve testen av anbefalingen fra forskningen.
- Avklar med faglærer/institusjon om kursets Sikt-avtale dekker vanlige kursoppgaver eller bare forskningsprosjekter — kan ikke avklares videre med nettsøk.
- Avklar avrundingsregel for kaloriemålet (nærmeste heltall, ned eller opp) — gir ±1 kcal avvik i akseptansekriteriet for profil 2 og 4.
- OFF-dekning av norske varer er fortsatt ikke undersøkt med Deep Recon (nevnt som mulig neste tema, ikke bestilt av brukeren ennå).
- Øvelseslista og videolenkene er fortsatt ikke gjennomgått av gruppen (uendret fra tidligere KI-logg-oppføring).
