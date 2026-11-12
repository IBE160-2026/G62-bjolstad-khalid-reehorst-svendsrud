# PRD-gjennomgang torsdag 12. november

**Forberedt:** 2026-11-11 av Osman Khalid med Claude Code · **Gjelder:** issue #2 (godkjenne antakelsene og sette PRD-en til «final»)

Dette er et forslag til møtet, ikke en beslutning. Gruppen går gjennom lista, krysser av «Godta» eller skriver hva som skal endres. Etterpå oppdateres [`prd.md`](prd.md), og `status` settes til `final`. Mål: ferdig på 10–15 minutter.

## Del 1: de 12 antakelsene i §12

| # | Antakelse | Hvor | Forslag | Begrunnelse | Gruppens svar |
|---|---|---|---|---|---|
| 1 | Konto slettes «mykt» med en gang, og helt (hard delete) med et skript innen 30 dager | FR-4 | **Godta** | Samme mønster som GDPR-researchen anbefaler. | |
| 2 | Gyldige verdier: vekt 30–300 kg, høyde 100–250 cm (alder 16–100 er allerede bekreftet) | FR-5 | **Godta** | Vide nok for alle reelle brukere, og stopper tastefeil. | |
| 3 | Protein, karbohydrater og fett lagres, men bare kcal vises i v1 | §4.3 | **Godta** | Holder v1 enkel. Ingen ekstra skjermer. | |
| 4 | Nye brukere får to utstyrsprofiler: «Hjemme» (bare kroppsvekt) og «Treningssenter» (alt utstyr) | FR-18 | **Godta** | Brukeren kommer i gang uten oppsett og kan endre profilene etterpå. | |
| 5 | Ny øvelse starter med 3 sett × 10 reps | FR-23 | **Godta** | ACSM sier 8–12 reps for nybegynnere; **bekreftet mot originalkilden 11.11**. Antall sett står ikke i sammendraget, men 3 er et vanlig startpunkt. Fjern «to verify» fra teksten. | |
| 6 | Trening legger ikke til kcal i dagens mål | FR-26 | **Godta** | Aktivitetsnivået dekker allerede treningen. Unngår dobbelttelling. | |
| 7 | Tilgjengelighet: WCAG 2.1 AA på grunnleggende nivå, ikke full revisjon | NFR-10 | **Godta** | Kontrasten i DESIGN.md er allerede målt mot AA. | |
| 8 | Bilder i fase 2 lagres ikke etter estimering | §6.1 | **Godta** | Gjelder bare fase 2, og er best for personvernet. | |
| 9 | Kalorimålet er aldri under 1 200 kcal (kvinner) eller 1 500 kcal (menn) | FR-6, §6.4 | **Godta, men finn en kilde** | En vanlig sikkerhetsgrense, men den er ikke kildebelagt i researchen vår. Noen bør finne en kilde før koden skrives. | |
| 10 | Kjønn er påkrevd i v1 | FR-6 | **Diskuter** | Se issue #3. Formelen trenger det, men CarryOn har foreslått et alternativ. | |
| 11 | 16–17-åringer får beskjed om at kalorimålet er et grovt anslag | FR-6 | **Godta** | Formelen er laget for voksne. | |
| 12 | Kort, valgfri intro første gang appen åpnes | FR-28 | **Godta** | Lagt til av Karianne 10.11 fra den opprinnelige pitchen. | |

## Del 2: andre punkter som må avklares samtidig

| Punkt | Forslag | Issue |
|---|---|---|
| Kameraskanning er «Should», og å skrive inn strekkoden er hovedveien | **Godta** (Gustavs endring 3.11) | #4 |
| Oppskrifter og treningsprogram i v1? Runde 3 bygger på det, men PRD-en har det under «Vision», og «ikke treningsprogram» står som eksplisitt ikke-mål (§8) | **Diskuter.** Forslag: vent til kjernen er ferdig. Hvis gruppen vil ha det med, må PRD-en oppdateres med `bmad-prd` først. | (nytt) |
| Hvilket UX-design gjelder: A1, runde 3, eller en blanding? | **Avgjøres av avstemningen** | #9 |

## Del 3: status for de åpne spørsmålene i §11

| Spørsmål | Status |
|---|---|
| Q1 Sikt-melding | Åpent, må spørre faglærer (#5) |
| Q2 Strekkodebibliotek | Avklart: Quagga2, og bare hvis FR-8 bygges |
| Q3 Open Food Facts-dekning | **Besvart 11.11:** 9 av 15 norske varer med kcal; strekkodeoppslag fungerer ([test](../../research/off-dekning-og-acsm-2026-11-10.md)). Ekte test med fysiske varer gjenstår (#14). |
| Q4 Skulder/arm-hull og flere muskelgrupper | Forslag klart: fem nye øvelser ([forslag](../../ovelsesliste-gjennomgang-2026-11-11.md)), godkjennes i #8. Flere muskelgrupper: #7 |
| Q5 ACSM-tallet | **Besvart 11.11:** 8–12 reps bekreftet |
| Q6 Kjønn | Åpent (#3) |
| Q7 Teknologi og arbeidsfordeling | Torsdag, se [teknologinotatet](../../research/teknologivalg-forslag-2026-11-11.md) |
| Q8 Videoene gjennomgått | Skjema klart, fordeles på fire (#6) |

## Del 4: faglærers tilbakemelding (12.11)

Faglærer la inn [tilbakemelding på PRD-en](tilbakemelding-prd.md) samme morgen. Samlet inntrykk: «en sterk PRD». Forslagene under er våre, ikke faglærers.

| # | Faglærer peker på | Alvor | Forslag til hva vi gjør | Gruppens svar |
|---|---|---|---|---|
| 4.1 | «Should»-lista kutter det som bærer idéen: FR-14 (nylig brukt) og FR-24 (sist gang) | Høy | **Flytt FR-14 og FR-24 til Must.** La FR-20 (filter, ikke navnesøk), FR-27 og FR-8 være kuttkandidater. Sett prioritet på hver FR. | |
| 4.2 | Mange FR-er mangler testbare konsekvenser (FR-7, 13, 14, 15, 17, 22, 24, 25, 27, og tall i FR-1 og FR-11) | Høy | **Godta faglærers eksempler** (5 forsøk / 15 min for FR-1, minst 100 matvarer i FR-11, «Første gang» i FR-24) og skriv konsekvenser for resten med `bmad-prd` (update). | |
| 4.3 | Plattform beskrevet ulikt: SM-1 og SM-7 sier telefon, §7 sier PC | Medium | **Godta:** «Primær testenhet er Chrome på PC. Alle skjermer brukbare på 360 px uten horisontal scrolling.» Omformuler SM-1 og SM-7. Stemmer med begge UX-forslagene. | |
| 4.4 | Brukertester med utenforstående gir ekte helsedata | Medium | **Godta:** testpersoner får en oppdiktet profil. Ekte data først etter svar om Sikt (#5). | |
| 4.5 | Fase 2-bildefunksjonen mangler regler for feil, tidsavbrudd, kostnad og tredjepart | Medium | **Godta faglærers tekst** som konsekvenser i FR-29 (mock-svar, 15 sek grense, 20 kall per dag, varsel før sending). Lav risiko, fordi det er fase 2. | |
| 5 | Småfeil: §9.1 sier «NFR-1 – NFR-10» (NFR-11 finnes); UJ-3 bruker «Home (dumbbells)», men FR-18 sier Home = bare kroppsvekt; «examiner» og «sensor» står ikke i glossaret | Lav | **Rett alle** i samme oppdatering. | |

**Refleksjonsspørsmål 1** (hvilke antakelser er kontrollert, og hvordan): vi kan svare konkret. FR-6-tallene er kontrollert to ganger (Karianne 28.10 og Gustav 3.11), ACSM 8–12 reps mot originalkilden (11.11), og Open Food Facts-dekningen med test (10.–11.11). Se KI-loggen.

## Etter møtet

1. Oppdater `prd.md` med `bmad-prd` (update): fjern `[ASSUMPTION]` fra det som er godtatt, endre det som ble endret, legg inn svarene på faglærers punkter (del 4), og oppdater §11 og §12.
2. Sett `status: final` og legg til en linje i endringsloggen nederst.
3. Lukk issue #2 med «Fixes #2» i commit-meldingen.
