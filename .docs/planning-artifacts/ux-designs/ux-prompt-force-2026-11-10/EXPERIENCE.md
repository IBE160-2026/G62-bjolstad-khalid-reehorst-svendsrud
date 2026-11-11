---
status: final
updated: 2026-11-11
sources:
  - .docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/brief.md
  - .docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/addendum.md
  - .docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md
  - .docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/addendum.md
  - .docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/.memlog.md
  - .docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/DESIGN.md
---

# Prompt Force — Experience Spine

> **Design runde 3** (2026-11-11). Jeg har valgt å gå bort fra den anatomiske kroppsfiguren for øvelsesvalg (utforsket i tidligere runder) fordi det var vanskelig å få den til å se slik ut som jeg ønsket — muskelgruppevalg skjer nå via en enkel tekstliste i stedet (se `Component Patterns` → Muskelgruppe-liste).

> **Kilder og konsistens.** Denne spine-dokumentasjonen bygger på product brief `brief-prompt-force-2026-09-16` og PRD `prd-prompt-force-2026-11-02` (begge i `.docs/planning-artifacts/`). Disse to dokumentene MÅ holdes konsistente med det som står her. **Åpent oppfølgingspunkt:** UX-sesjonen (`.memlog.md`, entry 19–20) utvider scope til å inkludere gratis matoppskrifter og et gratis treningsprogram i v1 — begge dekket i Information Architecture nedenfor — men PRD-en er **ikke** oppdatert av UX-sesjonen til å reflektere dette. Brukeren har selv sagt at PRD-en bør oppdateres separat (kjør `bmad-prd` update) for at PRD og UX-spines skal holdes konsistente. Dette er ikke noe denne UX-sesjonen fikser.
>
> Visuell identitet: se `DESIGN.md` i denne mappen. Token-referanser under bruker `{design.<path>}`-syntaks mot `DESIGN.md`s frontmatter.

## Foundation

Nettapp i nettleser, primært PC/laptop (eksamen krever at appen kjøres i en nettleser og at sensor kjører den lokalt på PC — PRD §7). Layouten er responsiv ned til 360px bredde, men det finnes ingen native app, PWA eller offline-modus i v1 (PRD NFR-1). Alt UI-språk er norsk bokmål (PRD NFR-2).

Visuell identitet (farger, typografi, formspråk, bevegelse-personlighet) er definert i `DESIGN.md` — denne spinen beskriver kun *oppførsel*. Lys modus (papir-journal) er den offisielle/primære modusen for v1; mørk modus er ikke i scope nå.

## Information Architecture

| Flate | Nås fra | Innhold / formål |
|---|---|---|
| Forside / Dagens side | Innlogging, nav-pille "Forside" | Dagens kaloriring, status for dagens trening, to primærhandlinger ("Logg måltid", "Logg trening"), "Utforsk"-kort til Trening og Mat. Realiserer UJ-1, UJ-4. |
| Trening | Nav-pille "Trening", "Utforsk"-kort, eller "Logg trening"-knapp | Øvelsesvalg skjer via en enkel **tekstliste** over muskelgrupper (Skuldre, Bryst, Mage/kjerne, Armer, Ben), eller via et **søkefelt** på tvers av muskelgrupper — to likeverdige innganger til samme øvelsesvalg/logging. Egen **treningsprogram-fane** (gratis, inspirasjon — scope-utvidelse, se varsel over) ligger parallelt, ikke blandet med øvelsesvalget. |
| Mat | Nav-pille "Mat", "Utforsk"-kort, eller "Logg måltid"-knapp | Metodevalg for logging (Søk / Skriv strekkode / Nylig brukt / Manuelt) → mengde/porsjon → lagre. Egen **oppskrifter-fane** (gratis, inspirasjon — scope-utvidelse) ligger parallelt, ikke blandet med matsøket. Oppskrifter er nå en **hub-side** + **fire egne kategorisider** (restrukturert fra én lang fane-side, `.memlog.md` entry 85): [mockups/oppskrifter.html](mockups/oppskrifter.html) (hub — fire kategori-inngangskort: Frokost/Lunsj/Middag/Mellommåltid, hver med antall oppskrifter + én eksempel-oppskrift, lenker videre), [mockups/oppskrifter-frokost.html](mockups/oppskrifter-frokost.html) (4 oppskrifter), [mockups/oppskrifter-lunsj.html](mockups/oppskrifter-lunsj.html) (3 oppskrifter), [mockups/oppskrifter-middag.html](mockups/oppskrifter-middag.html) (5 oppskrifter, hver med "bytt ut proteinet"-callout) og [mockups/oppskrifter-mellommaltid.html](mockups/oppskrifter-mellommaltid.html) (1 oppskrift, uendret forhåndsvisningskort). `[ASSUMPTION]` Fast, avgrenset utvalg i v1 (f.eks. 4–8 oppskrifter per kategori, lagt inn manuelt av gruppen) — **ikke** et voksende bibliotek eller et eksternt oppskrift-API/CMS (`.memlog.md` entry 72). Samme antakelse bør gjelde **gratis treningsprogram** under Trening, men det er ikke eksplisitt bekreftet ennå — se Open Questions. |
| Konto og samtykke | Registrering (først gang), kontomeny | Samtykkeskjerm før profil kan opprettes (FR-2), profilredigering (vekt/høyde/alder/kjønn/aktivitetsnivå/mål), kontosletting (FR-4). `[ASSUMPTION: plassering av en kontomeny/avatar-ikon i toppnavigasjonen er ikke vist i den godkjente mockupen (kun "Forside/Trening/Mat" + hjelpeikon er vist) — se Open Questions.]` |
| Historikk (tidligere datoer) | Datonavigering fra Forside | Samme oversikt som Forside, for en valgt tidligere dato (FR-27, **Should**). |

→ Komposisjonsreferanse: `.working/direction-02-lys-luftig.html` (låst layout/typografi) og `.working/direction-02c-plomme-teal.html` (låst layout + valgte aksentfarger), begge i denne mappen. Spine vinner ved konflikt med mockupene.

## Voice and Tone

Mikrotekst. Merkevarestemme og estetisk holdning ligger i `DESIGN.md.Brand & Style`. Norsk bokmål, enkelt språk, ingen fagtermer som "BMR" på hovedskjermen (PRD FR-7). Vennlig, varm journal-tone — ikke "appy", ikke teknisk, ikke spillifisert (ingen utropstegn, emoji, badges eller streak-telling; jf. `DESIGN.md`s avvisning av spillifisering).

| Gjør | Gjør ikke |
|---|---|
| "Fullført" | "Fullført! 🎉" |
| "220 kcal igjen" | "Bare 220 kcal igjen før du sprenger budsjettet!" |
| "Logg ditt første måltid" | "Kom igjen, logg noe mat! 💪" |
| "Vi fant ikke dette produktet" (strekkode, FR-10) | "Feil: produkt ikke funnet (404)" |
| "E-post eller passord er feil" (samme melding uansett årsak, FR-1 — ingen konto-enumerering) | "Denne e-posten finnes ikke" / "Feil passord" |
| Kort, fullstendige setninger | Fagtermer (BMR, makro) på hovedskjermen |

## Component Patterns

Oppførsel. Visuelle spesifikasjoner ligger i `DESIGN.md.Components`.

| Komponent | Bruk | Oppførselsregler |
|---|---|---|
| Muskelgruppe-liste | Trening, hovedinngang til øvelsesvalg | Trykk på en muskelgruppe i den enkle tekstlisten (Skuldre, Bryst, Mage/kjerne, Armer, Ben) viser øvelseslisten for den gruppen — listen ER grensesnittet, ikke et supplement til en figur (opprinnelig utforsket som en anatomisk figur, droppet til fordel for ren tekst, `.memlog.md` entry 62–63). Klikk på en øvelse i listen legger den **rett inn** i dagens treningslogg (med felt for sett/reps/vekt), uten en separat detaljvisning først — raskest mulig vei, færrest trykk (`.memlog.md` entry 34–35). Det loggførte kortet får i tillegg en liten, valgfri **"Se video"**-knapp (teknikkvideo, PRD FR-21) — supplerende, blokkerer ikke loggingen og krever ingen egen bekreftelse (`.memlog.md` entry 44). Rompeøvelser (populært, men anatomisk en baksidemuskel) ligger i **"Ben"**-øvelseslisten sammen med de fremre benøvelsene (`.memlog.md` entry 51). Et **øvelsessøk** øverst i samme kort (speiler Mat-sidens Søk-metode) er en likeverdig, parallell inngang på tvers av muskelgrupper til nøyaktig samme øvelsesvalg — et treff **legges rett inn** i dagens treningslogg på samme måte, ikke en ny logg-mekanisme (`.memlog.md` entry 73). |
| Kaloriring (`{design.components.calorie-ring}`) | Forside | Fylles med en avtagende ease-out-animasjon når verdien endres (ikke brå, ikke spillifisert — se `DESIGN.md.Brand & Style`). Oppdateres umiddelbart når et måltid logges, redigeres eller slettes, uten sideomlasting (PRD NFR-9, FR-15). |
| Metodevalg (mat) | Mat, inngang til matlogging | Fire likeverdige valg: Søk / Skriv strekkode / Nylig brukt / Manuelt (FR-9, FR-11, FR-14, FR-12). Ulikt treningsflyten, som går rett til muskelgruppe-listen uten et mellomliggende valgtrinn. Mocket i [mockups/mat.html](mockups/mat.html) med "Nylig brukt" forhåndsvalgt. Fanen "Oppskrifter" i samme fane-rad lenker til [mockups/oppskrifter.html](mockups/oppskrifter.html) — ren inspirasjon, kategorisert Frokost/Lunsj/Middag/Mellommåltid, ikke sammenblandet med dette metodevalget. Siden `oppskrifter.html` er nå en hub med fire kategori-inngangskort som hver lenker til sin egen side ([mockups/oppskrifter-frokost.html](mockups/oppskrifter-frokost.html), [mockups/oppskrifter-lunsj.html](mockups/oppskrifter-lunsj.html), [mockups/oppskrifter-middag.html](mockups/oppskrifter-middag.html), [mockups/oppskrifter-mellommaltid.html](mockups/oppskrifter-mellommaltid.html)) i stedet for én lang side med fane-bytte mellom kategoriene. |
| Mengde-/porsjonsfelt | Mat, etter valgt matvare | Vises **før** varen logges (siden kcal avhenger av mengde). Bruker velger gram, eller porsjoner hvis matvaren har en definert porsjonsstørrelse (konverteres til gram). Beregnet kcal vises live før lagring (FR-13). |
| Hjelpeknapp (`{design.components.icon-button-help}`) | Alle skjermer, toppnavigasjon | Trykk åpner en kort, kontekstuell forklaring av **den aktuelle skjermen** — ikke en obligatorisk rundtur. Ingen permanent synlig hjelpetekst på siden (fjernet — for påtrengende); discoverability via hover-tooltip (`title`) og `aria-label` ("Hjelp – forklar denne siden") på selve knappen (`.memlog.md` entry 52). |
| Entry-kort ("Utforsk") | Forside | Hele kortet er klikkbart/trykkbart (ikke bare pil-ikonet), navigerer til Trening eller Mat. |
| Fullført-status (`{design.components.status-complete}`) | Forside | Vises når minst én treningsøkt er fullført den aktuelle dagen; erstattes av en "ingen trening logget"-tilstand når det ikke finnes noen (se State Patterns). |

## State Patterns

| Tilstand | Flate | Behandling |
|---|---|---|
| Ingen måltider logget | Forside, Mat | "Logg ditt første måltid" i stedet for en tom tabell (FR-28). |
| Ingen trening logget i dag | Forside, Trening | "Start en treningsøkt" i stedet for et tomt statuskort (FR-28). |
| Første gang-bruker (aller første innlogging) | Forside (kaldstart) | Kort, valgfri, avviselig introduksjon til de tre stegene (profil → logg → trene) vises **én gang** før den tomme Forsiden. Lukkes og kommer ikke tilbake (FR-28, `[ASSUMPTION]`-merket i PRD). Dette er separat fra hjelpeknappen, som er tilgjengelig løpende etterpå (`.memlog.md` entry 23). |
| Strekkode ikke funnet | Mat | Tydelig melding + knapp for manuell registrering med strekkoden forhåndsutfylt. Aldri tomt resultat eller krasj (FR-10). |
| Ingen øvelser matcher filter/utstyr | Trening | Melding som forklarer hvorfor (f.eks. "Ingen skulderøvelser med dette utstyret") og hva som kan endres — aldri en tom liste uten forklaring (FR-20, PRD-eksempel: kun manualer + filter "Skuldre"). |
| Samtykkeskjerm | Konto (første profiloppretting) | Avkrysningsboks er **ikke** forhåndshuket; krever et aktivt valg + knappetrykk før profil kan opprettes (FR-2). Tidspunktet for samtykke lagres. |
| Innlogging feilet | Konto | Generisk feilmelding uansett om det er e-post eller passord som er feil (FR-1 — ingen konto-enumerering); gjentatte feilede forsøk rate-begrenses. |
| Historisk dato | Forside (datonavigering) | Samme oversikt-visning som i dag, for valgt dato. `[ASSUMPTION: loggføringer på tidligere datoer er redigerbare på samme måte som dagens logg (FR-15, FR-25 nevner ingen begrensning) — ikke eksplisitt bekreftet i PRD.]` |
| Kontosletting | Konto | Bekreftelse kreves før sletting; kontoen kan ikke logges inn på igjen etterpå (FR-4). |
| Henter data (kaldstart) | Forside, Trening, Mat | `[ASSUMPTION: ikke diskutert i UX-sesjonen. Et enkelt laste-hint (f.eks. en kort "Henter dagens oversikt…"-tekst eller et stille skjelett for kortene) bør vises mens data hentes, konsistent med NFR-9s krav om at endringer skal vises uten manuell sideomlasting.]` |
| Ingen nettforbindelse | Hele appen | Ikke relevant i v1 — appen har ingen offline-modus (PRD NFR-1, §7); det finnes derfor ingen offline-tilstand å designe for. |
| Tilgang nektet (en annen brukers data) | Alle flater, API-nivå | En forespørsel om en annen brukers data returnerer ingen data og avslører ikke at dataen finnes (FR-3). Dette er en sikkerhetsregel bak API-et, ikke en skjerm bruker selv ser i normal bruk — tas med her for fullstendighet. |

## Interaction Primitives

- **Klikk/tastatur på muskelgruppe-listen:** valg av muskelgruppe skjer via ordinære, ekte knapper (Tab-navigerbare) i tekstlisten.
- **Hover-bevegelse:** 2px løft med mykt overshoot (~180ms) på kort og knapper, og avtagende ease-out på kaloriringens fylling — personligheten er definert i `DESIGN.md.Brand & Style`; her gjelder regelen at ingen interaksjon er avhengig av hover alene (alt som kan hoveres, kan også trykkes/tabbes til direkte).
- **Reduced motion:** `[ASSUMPTION: alle mikroanimasjoner (hover-løft, kaloriring-fylling) skal hoppe rett til endetilstand når brukeren har skrudd på "reduser bevegelse" i operativsystemet/nettleseren — ikke eksplisitt diskutert i UX-sesjonen, men standard tilgjengelighetspraksis.]`
- **Ingen drag/swipe-kritiske gester** er dokumentert eller vist i mockupene; alle handlinger kan utføres med klikk/trykk eller tastatur.
- Knapper har generøs klikkflate (jf. `DESIGN.md`s knappe-padding) for å støtte store trykkmål på berøringsskjerm, selv om primærflaten er PC/laptop (NFR-10).

## Accessibility Floor

Oppførsel. Visuell kontrast ligger i `DESIGN.md.Colors`. Målet er WCAG 2.1 AA-basics, ikke en full audit (PRD NFR-10, `[ASSUMPTION]` i PRD).

- **Muskelgruppe-listen** for øvelsesvalg er en vanlig tekstliste av ekte `<button>`-elementer — den trenger ikke et eget a11y-mønster utover resten av Accessibility Floor.
- Alle interaktive elementer (nav-pille, knapper, entry-kort, muskelgruppe-listen, hjelpeknappen) skal være ekte `<button>`/`<a>`-elementer, nåbare med Tab, i leserekkefølge.
- `[ASSUMPTION: et synlig fokusmerke (f.eks. 2px kontur i {design.colors.accent-primary} eller {design.colors.ink}) er nødvendig på alle interaktive elementer — mockupen er en statisk visning og viser ingen :focus-tilstander.]`
- Formfelt har synlige labels (ikke bare placeholder-tekst), jf. NFR-10.
- Kontrastforhold fra `DESIGN.md.Colors`: `{design.colors.ink}` 11.3:1, `{design.colors.ink-secondary}` 5.5:1, `{design.colors.accent-primary}` 7.1:1, `{design.colors.accent-complete}` 4.7:1 — alle ≥ AA-kravet for normal tekst (4.5:1); se `DESIGN.md.Do's and Don'ts` for begrensningen på teal i små tekststørrelser.
- Samtykke-avkrysningsboksen har en programmatisk tilknyttet label (ikke bare visuell nærhet til tekst).
- Feilmeldinger (f.eks. innlogging) skal kunne annonseres av skjermleser (`aria-live` eller tilsvarende) — `[ASSUMPTION]`, ikke eksplisitt spesifisert i kildene.

## Inspiration & Anti-patterns

- **Hentet fra Hevy:** sett-for-sett treningslogging, og "sist gang"-visning mens man logger en øvelse (FR-24).
- **Hentet fra Lifesum:** tilgjengelig matlogging via strekkode + søk + manuelt, måltider gruppert (Frokost/Lunsj/Middag/Mellommåltid).
- **Avvist (eksplisitt brukervalg):** rødt og grønt i aksent-paletten — unngår en automatisk "dårlig/bra"-stoppslys-lesning som teamet ikke ønsket; løst med plomme/bær + teal i stedet (`.memlog.md` entry 33, 36).
- **Avvist:** spillifisert bevegelse, streak-tellere, badges, glow/neon-skygger, gradient-tekst — journal-registeret skal holde seg rolig og analogt, ikke "appy" (se `DESIGN.md.Brand & Style`).
- **Avvist:** klinisk ren hvit bunnflate — for sterilt/medisinsk for et produkt som håndterer helsenære data.
- **Non-goals videreført fra PRD §8** (relevant for hvilke mønstre denne spinen *ikke* trenger): ingen AI-formsjekk på video, ingen auto-progressive treningsprogram, ingen sosiale funksjoner/deling, ingen wearables, ingen varsler/påminnelser.

## Responsive & Platform

| Bruddpunkt | Oppførsel |
|---|---|
| Primærflate (mockup-bredde, ~1180px) | 2-kolonne oversikt (kaloriring + statuskort), 2-kolonne "Utforsk"-grid, full nav-pille med tre lenker. |
| Ned til 360px (PRD NFR-1) | `[ASSUMPTION: Se DESIGN.md → Layout & Spacing for fallback-antagelsen om nedbrytning til 360px.]` |

Prompt Force er en responsiv nettapp, ikke en native mobilapp — primærflaten er likevel PC/laptop, ikke telefon (PRD §7, i motsetning til brief-utkastets opprinnelige "strekkodeskanning brukes mest på telefon"-premiss, som PRD eksplisitt endret 2026-11-03).

## Key Flows

Personaen og UJ-strukturen er hentet verbatim fra PRD §2.3 (persona "Sara, 23"). De fem eksisterende reisene er omformet til Key Flow-skjema (nummererte steg + klimaks + feilvei) uten å endre innholdet i dem. To nye flyter (6–7) er lagt til for de nye UI-mønstrene fra denne UX-sesjonen (kroppsmodell, metodevalg) som PRD ikke selv beskriver i detalj.

### UJ-1 — Sara får sitt første kalorimål

1. Sara, 23, har nettopp kjøpt gymmedlemskap og har to manualer hjemme. Hun fant MyFitnessPal "for mye".
2. Hun oppretter en konto og godtar en kort samtykkeskjerm (FR-2).
3. Hun fyller inn vekt, høyde, alder, kjønn, aktivitetsnivå og mål ("gå ned i vekt").
4. **Klimaks:** appen viser ett tall, 1 640 kcal/dag, med én forklarende setning — ikke et fagord som "BMR" (FR-7). Hun lander på en tom Forside med en tydelig "logg ditt første måltid"-oppfordring.

**Feilvei:** hun er usikker på hva "moderat aktiv" betyr → hvert aktivitetsnivå har et konkret hverdagseksempel.

### UJ-2 — Sara logger frokostyoghurten

1. Innlogget på laptopen trykker hun "Legg til mat" under Frokost.
2. Hun skriver strekkoden fra yoghurtkoppen (FR-9 — hovedveien på PC, jf. PRD §11 Q2).
3. Produktet vises med kcal per 100 g.
4. Hun justerer mengden til 150 g og lagrer.
5. **Klimaks:** frokost-summen og dagens oversikt oppdateres med én gang, uten sideomlasting (NFR-9).

**Feilvei:** strekkoden finnes ikke → "Vi fant ikke dette produktet" + knapp for manuell registrering med strekkoden forhåndsutfylt. Appen viser aldri et tomt resultat eller krasjer (FR-10).

### UJ-3 — Sara trener hjemme med det hun har

1. Hun velger sin lagrede utstyrsprofil "Hjemme" (manualer).
2. Appen lister kun øvelser hun kan gjøre med manualer eller kroppsvekt, nybegynner-nivå først.
3. Hun åpner "Goblet squat", ser den innebygde videoen og legger den til dagens treningslogg.
4. Mens hun logger ser hun forrige ukes 8 kg × 10 (FR-24).
5. **Klimaks:** hun logger 3 sett à 10 på 10 kg og avslutter treningsøkten — statuskortet på Forsiden viser nå "Fullført".

**Feilvei:** på reise uten manualer velger hun en utstyrsprofil med kun kroppsvekt og filtrerer på "Skuldre" — ingen treff, og hun får en melding som sier dette, ikke en tom liste (FR-20).

### UJ-4 — Sara sjekker dagen sin om kvelden

1. Hun åpner dagens oversikt: mål 1 640 kcal, spist 1 420 kcal, 220 kcal igjen.
2. Dagens måltider og dagens treningsøkt (sett, reps, vekt) vises samlet.
3. **Klimaks:** hun kan trykke på gårsdagen og se historikken sin — ett sted som binder sammen mat og trening for hele dagen, uten å måtte bytte app.

### UJ-5 — Sensoren kjører appen

1. Sensoren kloner repoet, kopierer `.env.example` til `.env`.
2. Følger README og starter appen uten teamets API-nøkler eller betalte kontoer.
3. **Klimaks:** sensoren logger inn med en forhåndsseedet testbruker som allerede har mat- og treningslogger, og kan kjøre de automatiserte testene — alt lokalt, under 20 minutter.

### Flyt 6 — Sara velger en øvelse via muskelgruppe-listen (ny, detaljerer UJ-3 gjennom denne UX-sesjonens nye UI-mønster)

1. Sara trykker "Logg trening" på Forsiden.
2. En enkel tekstliste over muskelgrupper vises (Skuldre, Bryst, Mage/kjerne, Armer, Ben).
3. Hun trykker på "Ben" i listen.
4. En liste over benøvelser for hennes utstyrsprofil vises, nybegynner-nivå øverst.
5. Hun trykker på "Goblet squat" i listen.
6. **Klimaks:** øvelsen legges rett inn i dagens treningslogg med åpne sett/reps/vekt-felt — ingen separat detaljvisning underveis, raskeste vei fra "jeg vet ikke hva jeg skal gjøre" til "jeg logger nå".
7. Usikker på teknikken, trykker hun den lille "Se video"-knappen på det loggførte kortet og ser en kort instruksjonsvideo (PRD FR-21) — helt valgfritt, hun har allerede logget øvelsen.

**Feilvei:** se UJ-3s feilvei (ingen treff på filter/utstyr → forklarende melding, ikke tom liste).

### Flyt 7 — Sara logger en middag via metodevalg (ny, detaljerer UJ-2 gjennom denne UX-sesjonens metodevalg-mønster)

1. Sara trykker "Logg måltid" på Forsiden.
2. Et metodevalg vises: Søk / Skriv strekkode / Nylig brukt / Manuelt.
3. Hun velger "Nylig brukt" og ser kveldens vanlige middag ett trykk unna (FR-14).
4. Hun trykker på den — mengdefeltet vises med samme mengde som sist, redigerbart.
5. Hun justerer mengden litt og ser kcal-beregningen oppdateres live før hun lagrer.
6. **Klimaks:** måltidet lagres, og dagens oversikt + kaloriring oppdateres umiddelbart — fra trykk til loggført middag på et par trykk, i tråd med SM-6 (maks 3 trykk for nylig brukt mat).

**Feilvei:** hvis hun ikke har noen nylig brukte matvarer (f.eks. aller første gang), viser "Nylig brukt" i stedet en kort hint-tekst som peker videre til Søk eller Manuelt — ikke en tom liste (samme prinsipp som tom-tilstandene i State Patterns).

## Open Questions

- Kontomeny/avatar-ikon for innstillinger, profilredigering og kontosletting er ikke vist i noen godkjent mockup (kun toppnav "Forside/Trening/Mat" + hjelpeikon finnes) — plassering må avklares før implementasjon.
- Er loggføringer på tidligere datoer redigerbare på samme måte som dagens logg? PRD sier ikke dette eksplisitt (se State Patterns).
- Reduced-motion-oppførsel for mikroanimasjoner er ikke diskutert i UX-sesjonen — antagelsen i Interaction Primitives bør bekreftes.
- **Viktigst:** PRD-en er ikke oppdatert til scope-utvidelsen — se varselet øverst i dokumentet.
- Responsiv nedbrytning til 360px er ikke vist i noen mockup — se tilsvarende punkt i `DESIGN.md.Open Questions`.
- Oppskrifter er bekreftet som et fast, avgrenset utvalg i v1 (ikke et voksende bibliotek/API) — er **gratis treningsprogram** under Trening ment på samme måte, eller skal det vokse/oppdateres over tid? Ikke eksplisitt avklart.
