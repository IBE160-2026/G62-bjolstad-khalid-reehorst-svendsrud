---
status: final
updated: 2026-11-11
name: Prompt Force
description: >-
  Lys, luftig trenings- og kostholdsjournal for nybegynnere. Varmt papir
  i stedet for klinisk hvitt, serif-overskrifter mot human-sans brødtekst,
  og to blekk-aksenter (plomme/bær + teal) i stedet for en kald "appfarge".
colors:
  paper: '#F7F2E9'
  surface: '#FFFDF7'
  ink: '#3A322B'
  ink-secondary: '#6B6056'
  rule: '#E4D9C6'
  accent-primary: '#7A3B69'
  accent-primary-tint: 'rgba(122,59,105,0.10)'
  accent-complete: '#347774'
  accent-complete-tint: 'rgba(52,119,116,0.14)'
  on-accent: '#FFF9F0'
typography:
  display:
    fontFamily: Fraunces
    fontSize: '1.9rem'
    fontWeight: '600'
    lineHeight: '1.2'
    note: 'Sidetitler (f.eks. "Dagens side"). Fallback: Georgia, "Iowan Old Style", "Times New Roman", serif.'
  heading:
    fontFamily: Fraunces
    fontSize: '1.15rem'
    fontWeight: '600'
    lineHeight: '1.3'
    note: 'Seksjonstitler (f.eks. "Utforsk"). Samme fallback-stack som display.'
  stat-display:
    fontFamily: Fraunces
    fontSize: '26px'
    fontWeight: '700'
    lineHeight: '1'
    note: 'Store tallverdier som kaloriringens sentrum (f.eks. "1 420").'
  body:
    fontFamily: Inter
    fontSize: '16px'
    fontWeight: '400'
    lineHeight: '1.7'
    note: 'Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif.'
  body-sm:
    fontFamily: Inter
    fontSize: '0.95rem'
    fontWeight: '400'
    lineHeight: '1.7'
  caption:
    fontFamily: Inter
    fontSize: '0.86rem'
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: Inter
    fontSize: '0.85rem'
    fontWeight: '700'
    note: 'Statusetiketter, kaloriring-undertekst, "fullført"-tekst.'
  nav-label:
    fontFamily: Inter
    fontSize: '0.9rem'
    fontWeight: '600'
  button-label:
    fontFamily: Inter
    fontSize: '0.95rem'
    fontWeight: '700'
rounded:
  md: '20px'
  lg: '22px'
  full: '9999px'
spacing:
  xs: '6px'
  sm: '14px'
  md: '20px'
  lg: '28px'
  xl: '44px'
  gutter: '20px'
  card-padding: '24px'
  screen-padding: '40px 48px 56px'
components:
  button-primary:
    background: '{colors.accent-primary}'
    text: '{colors.on-accent}'
    radius: '{rounded.full}'
    padding: '15px 26px'
    typography: '{typography.button-label}'
    shadow: '0 10px 20px -8px rgba(122,59,105,0.45)'
  button-secondary:
    background: '{colors.surface}'
    text: '{colors.ink}'
    border: '1.5px solid {colors.rule}'
    radius: '{rounded.full}'
    padding: '15px 26px'
    typography: '{typography.button-label}'
  nav-pill:
    background: '{colors.surface}'
    border: '1px solid {colors.rule}'
    radius: '{rounded.full}'
    active-background: '{colors.accent-primary}'
    active-text: '{colors.on-accent}'
    inactive-text: '{colors.ink-secondary}'
    typography: '{typography.nav-label}'
  card:
    background: '{colors.surface}'
    border: '1px solid {colors.rule}'
    radius: '{rounded.lg}'
    padding: '{spacing.card-padding}'
    shadow: '0 12px 26px -18px rgba(120,90,50,0.22)'
    tape-accent: '{colors.accent-complete-tint}'
  entry-card:
    background: '{colors.surface}'
    border: '1px solid {colors.rule}'
    radius: '{rounded.md}'
    padding: '{spacing.md}'
    shadow: '0 8px 20px -16px rgba(120,90,50,0.2)'
    icon-background: '{colors.accent-primary-tint}'
    icon-stroke: '{colors.accent-primary}'
    title-typography: '{typography.body}'
    body-typography: '{typography.caption}'
  icon-button-help:
    background: '{colors.accent-complete-tint}'
    border: '1px solid {colors.rule}'
    text: '{colors.accent-complete}'
    radius: '{rounded.full}'
    size: '40px'
  calorie-ring:
    track: '{colors.rule}'
    progress: '{colors.accent-primary}'
    stroke-width: '12px'
    value-typography: '{typography.stat-display}'
    label-typography: '{typography.caption}'
  status-complete:
    icon-background: '{colors.accent-complete}'
    icon-stroke: '{colors.on-accent}'
    label-typography: '{typography.label}'
    label-color: '{colors.accent-complete}'
---

# DESIGN.md — Prompt Force

> **Design runde 3** (2026-11-11). Jeg har valgt å gå bort fra den anatomiske kroppsfiguren for øvelsesvalg (utforsket i tidligere runder) fordi det var vanskelig å få den til å se slik ut som jeg ønsket — muskelgruppevalg skjer nå via en enkel tekstliste i stedet (se `## Components` → Muskelgruppe-liste).

> Visuelt grunnlag (promoterte mockuper): [mockups/dashboard.html](mockups/dashboard.html) (forsiden/dashbordet — låst layout/typografi/papirbakgrunn + valgt, foreløpig, aksentfargepar) og [mockups/kroppsmodell.html](mockups/kroppsmodell.html) (kroppsmodell-øvelsesvalget). Der dette dokumentet og mockupene skulle avvike, vinner dette dokumentet. `.working/` beholder alle mellomtrinnene i utforskningen (fargetema-sammenligning, 10+5+3 designretninger) som historikk, ikke gjeldende referanse (se `.memlog.md`). `imports/` er tom. Appnavnet "Prompt Force" er en plassholder (se `.memlog.md`, entry 21) og blokkerer ikke dette dokumentet.

## Brand & Style

Prompt Force skal føles som en varm, personlig dagbok — ikke et kommersielt treningsdashbord. Målgruppen er nybegynnere (18+) som lett blir overveldet av tekniske fitness-apper; formspråket svarer med en "skrevet for hånd, lest komfortabelt"-følelse: en redaksjonell serif i overskrifter møter en nøytral, human sans i brødtekst, på en varmt papirfarget bunn i stedet for klinisk hvitt.

Dette er den uttalte brand-inputen fra brukeren (motiverende, stilren, funksjonell, enkel å bruke) realisert visuelt: få, tydelige handlinger per skjerm, generøs luft, og en bevegelse-personlighet som er vennlig og lett fjærende (en 2px "løft" med mykt overshoot ved hover, ~180ms) — aldri lekent eller spillifisert. Kaloriringen fylles med en avtagende ease-out-kurve, ikke en brå eller "poppete" animasjon. Fulle detaljer om interaksjon og bevegelse som *oppførsel* ligger i `EXPERIENCE.md.Interaction Primitives`; dette avsnittet beskriver bare bevegelsens *personlighet*.

**Supersedert tidligere beslutning:** et tidligere punkt i `.memlog.md` (entry 22) satte mørk modus som primær. Den valgte visuelle retningen (entry 33, 37) er eksplisitt lys/papirbasert (`color-scheme: light` i mockupen), og overstyrer dette. Brukeren har bekreftet (entry 38): lys modus er nå den offisielle/primære modusen for v1. Mørk modus er ikke i scope nå, men kan vurderes som et senere tillegg.

En liten signaturdetalj går gjennom hele skjermen: primærkort har et dekorativt "tape"-hint øverst (en liten rotert rektangulær flate i `{colors.accent-complete-tint}`), som en washi-tape-lapp i en fysisk dagbok. Se `Components.card`.

## Colors

To varme, nøytrale blekk-aksenter — **ingen** av dem rød eller grønn — i stedet for én kald "appfarge". Dette var et eksplisitt brukerkrav etter at tidligere retninger brukte terrakotta (rødlig) og salvie (grønn) for CTA/fullført (se `.memlog.md` entry 33, 36).

- **`{colors.paper}` (#F7F2E9)** — appens bunnflate. Varmt, nær-hvitt papir, ikke klinisk `#FFFFFF`. Kontrast mot `{colors.ink}`: 11.3:1.
- **`{colors.surface}` (#FFFDF7)** — kort og paneler, svakt lysere enn papiret, for å skille innhold fra bakgrunn uten en hard kant.
- **`{colors.ink}` (#3A322B)** — primær tekstfarge. Varm mørkebrun, ikke svart.
- **`{colors.ink-secondary}` (#6B6056)** — sekundær tekst (undertekster, bildetekster). Kontrast mot papir: 5.5:1.
- **`{colors.rule}` (#E4D9C6)** — papirlinjal-linjer og lav-kontrast kant/divider-farge. Brukes også som bakgrunnstekstur (se Layout & Spacing).
- **`{colors.accent-primary}` (#7A3B69)** — plomme/bær. Eneste CTA-/handlingsfarge (primærknapp, aktiv nav-pille, kaloriringens fremdriftsstrøk). Kontrast mot papir: 7.1:1.
- **`{colors.accent-complete}` (#347774)** — dempet teal. "Fullført"-tilstand (treningsøkt fullført, hjelpeknapp-flate). Kontrast mot papir: 4.7:1 — tilstrekkelig for normal brødtekst-størrelse (AA-krav 4.5:1), men skal **ikke** brukes i mindre bildetekst-størrelser (`{typography.caption}` og mindre) uten ny kontrollsjekk. Se `[ASSUMPTION]` under Do's and Don'ts.
- **`{colors.on-accent}` (#FFF9F0)** — tekst/ikon-farge på fylte aksentflater (knapptekst, logomerke).

**Regel uten unntak:** ingen aksentfarge brukes som løpende brødtekst-farge — kun som flater, ikoner og strøk. Det er slik kontrastkravet holder uansett hvor aksenten dukker opp (prinsipp hentet direkte fra mockup-rasjonalen).

**Status:** fargeparet er av brukeren selv merket "foreløpig" (`.memlog.md` entry 37) — behandles her som arbeidsgrunnlag for v1, ikke en låst identitet. Se Open Questions.

## Typography

Produksjonsfonter: **Fraunces** (overskrift, serif) + **Inter** (brødtekst, humanistisk sans) — begge gratis/Google Fonts-tilgjengelige, oppgitt eksplisitt i mockupens rasjonale-boks.

- `{typography.display}` — sidetitler ("Dagens side"). Fraunces, 600, 1.9rem.
- `{typography.heading}` — seksjonstitler ("Utforsk"). Fraunces, 600, 1.15rem.
- `{typography.stat-display}` — store tallverdier (kaloriringens sentrum). Fraunces, 700, 26px — tallet skal "eie" skjermen som en overskrift, ikke en teknisk metrikk.
- `{typography.body}` — standard brødtekst, 16px / linjehøyde 1.7. Den generøse linjehøyden er en del av journal-følelsen (luft mellom linjene, ikke tett app-tekst).
- `{typography.body-sm}` / `{typography.caption}` — undertekster og kortbrødtekst.
- `{typography.label}` — statusetiketter ("Fullført").
- `{typography.nav-label}` / `{typography.button-label}` — navigasjon og knappetekst, 600–700 vekt for tydelig affordance.

Ingen dekorative display-størrelser utover `{typography.display}`; ingen store bokstaver/letter-spacing-trikk i produktteksten (kun i interne dokumentasjons-rasjonaler, som ikke er del av selve produktet). Minste funksjonelle tekststørrelse er 12px — gå aldri under dette, selv i bildetekster.

## Layout & Spacing

Hoveddesignen er for nettleser på PC/laptop (jf. PRD §7, NFR-1) — mockupen viser en ca. 1180px bred skjerm. Innhold sentreres med `{spacing.gutter}` sidemarg; skjermens innvendige padding er `{spacing.screen-padding}`.

- `{spacing.xs}` (6px) — tette gap (f.eks. nav-pille-indre-gap).
- `{spacing.sm}` (14px) — gap mellom primærhandlinger (knapperad).
- `{spacing.md}` (20px) — standard kort-indre-padding og grid-gap.
- `{spacing.lg}` (28px) — avstand mellom hovedblokker (f.eks. mellom oversikts-grid og "Utforsk"-seksjonen).
- `{spacing.xl}` (44px) — luft før en ny hovedseksjon starter.
- `{spacing.card-padding}` (24px) — indre padding i de to store oversiktskortene (kaloriring, status).

**Bakgrunnstekstur:** app-skjermens bunn har et subtilt linjert mønster (horisontale linjer hver 38px, i `{colors.rule}`) som forsterker dagbok-metaforen. Dette er en dekorativ tekstur, ikke et strukturelt grid — innhold justeres ikke etter linjene.

**Grid:** oversikten bruker en 2-kolonne (kaloriring + statuskort) layout som går over i et 2-kolonne-grid for "Utforsk"-kortene (Trening/Mat). `[ASSUMPTION: oppskriften for hvordan dette gridet brytes ned til 360px (NFR-1) er ikke vist i den godkjente mockupen — se Open Questions. Rimelig standardantagelse til videre avklaring: begge grid gjøres til én kolonne under et mobilbrudd, og nav-pillen beholder alle tre lenker men med redusert indre padding.]`

## Elevation & Depth

Alle skygger er diffuse og varmt tonet — ingen glow/neon, ingen gradient-fyll.

- Standardkort: `0 12px 26px -18px rgba(120,90,50,0.22)` — en mørk, varm, lav-metning skygge.
- Entry-kort (mindre): `0 8px 20px -16px rgba(120,90,50,0.2)`.
- Primærknapp: `0 10px 20px -8px rgba(122,59,105,0.45)` — den eneste skyggen som er tonet i aksentfargen (plomme) i stedet for nøytral varm grå. Dette gir CTA-knappen litt ekstra "energi" uten å bryte med journal-registeret.

Hierarki kommer primært fra overflatetone (`{colors.paper}` vs. `{colors.surface}`) og luft, ikke fra tung skygge-stabling.

## Shapes

- `{rounded.md}` (20px) — entry-kort ("Utforsk"-kortene for Trening/Mat).
- `{rounded.lg}` (22px) — de to store oversiktskortene (kaloriring, status).
- `{rounded.full}` (9999px / sirkel) — alle knapper, nav-pillen og runde ikonknapper (hjelpeikon, "Utforsk"-ikonsirkler).

Ingen skarpe (0px) hjørner noe sted i produktet — det bryter med papir/håndskrift-metaforen. Ingen mellomting mellom `md` og `lg` er nødvendig; de to verdiene er nær hverandre med vilje (store og små kort skal lese som samme familie).

## Components

- **Primærknapp** (`button-primary`) — f.eks. "Logg måltid". Fylt `{colors.accent-primary}`, tekst `{colors.on-accent}`, pille-form, aksent-tonet skygge. Alltid den primære handlingen på en skjerm, maks én per visning.
- **Sekundærknapp** (`button-secondary`) — f.eks. "Logg trening" på dagens side. Overflate-farget med kant, samme form/størrelse som primærknappen slik at de to leser som et par.
- **Nav-pille** (`nav-pill`) — "Forside / Trening / Mat". Aktiv side vises med fylt plomme-flate; inaktive lenker i `{colors.ink-secondary}`.
- **Oversiktskort** (`card`) — kaloriring-kortet og status-kortet ("Benøvelser — Fullført"). Bærer tape-aksent-motivet.
- **Entry-kort** (`entry-card`) — navigasjonskortene under "Utforsk" (Trening, Mat). Rund ikonflate i aksent-primær-tint, pil til høyre, hele kortet er klikkbart.
- **Hjelpeknapp** (`icon-button-help`) — rundt "?"-ikon i toppnavigasjonen. Teal-tint-flate, teal tekst. Åpner kontekstuell hjelp for den aktuelle skjermen (se `EXPERIENCE.md.Component Patterns`).
- **Kaloriring** (`calorie-ring`) — SVG-ring, spor i `{colors.rule}`, fremdrift i `{colors.accent-primary}`, 12px strøkbredde. Senterverdi i `{typography.stat-display}`, undertekst ("/ X kcal") i `{typography.caption}`.
- **Fullført-status** (`status-complete`) — sirkulær hake-ikon i `{colors.accent-complete}` med `{colors.on-accent}`-strøk, etikett i samme fargefamilie.

Visuelle spesifikasjoner her; oppførsel (hva som skjer ved klikk, tastatur, tomme tilstander) er dokumentert i `EXPERIENCE.md.Component Patterns` og `.State Patterns` — ikke duplisert her.

**Muskelgruppe-liste** (`muscle-pill`) — mocket i [mockups/kroppsmodell.html](mockups/kroppsmodell.html). Vertikal stack av fulle, pilleformede knapper (`{rounded.full}`), én per muskelgruppe (Skuldre, Bryst, Mage/kjerne, Armer, Ben) — dette ER grensesnittet for muskelgruppevalg, ikke et supplement til noe visuelt (ingen anatomisk figur). Hvile: `{colors.surface}`-flate, kant i `{colors.rule}`, tekst i `{colors.ink-secondary}`. Valgt tilstand (`aria-pressed="true"`): fylt `{colors.accent-primary}`, tekst `{colors.on-accent}`, med et lite hake-ikon. Generøs padding (16px/22px) for et tydelig touch-mål. Synlig fokusring (2px solid `{colors.accent-primary}`, 2px offset) på hver knapp.

**Video-knapp** (`video-btn`) — liten pille på det loggførte øvelseskortet, samme teal-tint-mønster som hjelpeknappen (`{colors.accent-complete}`-tekst på tint-flate), avplayer-ikon + "Se video". Supplerende, ikke en primær handling — bruker derfor aksent-complete (teal), ikke aksent-primary (plomme/CTA-fargen).

**Øvelsessøk** (`search-field`) — mocket i [mockups/kroppsmodell.html](mockups/kroppsmodell.html), øverst i samme kort som `muscle-pill`-listen. Samme felt-stil som tallfeltene i `Mengde-/porsjonsfelt` (`{colors.paper}`-bakgrunn, kant i `{colors.rule}`), men pilleformet (`{rounded.full}`) med et søkeforstørrelsesglass-ikon (`{colors.ink-secondary}`) innfelt til venstre. Søketreff vises som en forenklet `exercise-row`-liste rett under feltet — samme flate/kant/skygge som den ordinære øvelseslisten. En likeverdig, parallell inngang til samme øvelsesvalg/logging som `muscle-pill`-listen, ikke en erstatning for den; en liten tekstlinje mellom de to ("… eller velg muskelgruppe") i `{typography.caption}`/`{colors.ink-secondary}` gjør dette tydelig.

**Metodevalg (`method-card`)** — mocket i [mockups/mat.html](mockups/mat.html). Vertikal stack av fire likeverdige, pilleformede knapper (`{rounded.full}`), én per metode (Søk, Skriv strekkode, Nylig brukt, Manuelt). Hver knapp har en liten rund ikonflate (38px, `{colors.accent-primary-tint}` med `{colors.accent-primary}`-strøk) foran teksten. Hvile: `{colors.surface}`-flate, kant i `{colors.rule}`, tekst i `{colors.ink-secondary}`. Valgt tilstand (`aria-pressed="true"`): fylt `{colors.accent-primary}`, tekst `{colors.on-accent}`, ikonflaten inverteres (on-accent-bakgrunn), med et lite hake-ikon til høyre — samme valgt-mønster som `muscle-pill`.

**Mengde-/porsjonsfelt** — mocket i [mockups/mat.html](mockups/mat.html), som en liten "valgt fra Nylig brukt"-kort-seksjon (samme kortoppbygning som `entry-card`/det loggførte øvelseskortet): et tallfelt (`{colors.surface}`-bakgrunn-stil, kant `{colors.rule}`) forhåndsutfylt med forrige mengde, ved siden av en kcal-beregningsflate i `{colors.accent-complete-tint}` (teal-tint, samme flate-logikk som hjelpeknappen — ingen ny fargebetydning). `[ASSUMPTION]` Selve live-oppdateringen er oppførsel (se `EXPERIENCE.md.Component Patterns`), ikke vist i den statiske mockupen utover en forklarende bildetekst.

**Oppskrifter — hub + fire kategorisider.** Oppskrifter er restrukturert fra én lang side med fane-bytte til en **hub-side** ([mockups/oppskrifter.html](mockups/oppskrifter.html)) som lenker videre til **fire egne kategorisider**, én per måltidskategori: [mockups/oppskrifter-frokost.html](mockups/oppskrifter-frokost.html), [mockups/oppskrifter-lunsj.html](mockups/oppskrifter-lunsj.html), [mockups/oppskrifter-middag.html](mockups/oppskrifter-middag.html) og [mockups/oppskrifter-mellommaltid.html](mockups/oppskrifter-mellommaltid.html). Den gamle `category-tabs`-fane-raden (ett IA-nivå under `page-tab`-raden) er fjernet — den styrte en IA-dybde som nå er løst opp i egne sider i stedet for faner. Hver kategoriside har en liten **"← Alle oppskrifter"**-tilbakelenke rett under header, som peker tilbake til hub-siden.

**Kategori-inngangskort (på hub-siden)** — gjenbruker den eksisterende `entry-card`-komponenten (samme flate/kant/`{rounded.md}`-hjørner/skygge/rund ikonflate i `{colors.accent-primary-tint}`/pil-til-høyre/hele-kortet-klikkbart-mønster som `entry-card` på dashbordets "Utforsk"-rad) ordrett, kun utvidet med to ekstra tekstlinjer under kategorinavnet: antall oppskrifter (f.eks. "4 oppskrifter") og navnet på én eksempel-oppskrift i kategorien, i `{typography.caption}`/`{colors.ink-secondary}` kursiv (f.eks. "bl.a. Proteinrik yoghurtbowl"). Ingen ny farge eller flate-type — samme komponent, mer tekst per kort.

**Oppskrift-kort (`recipe-card`, på kategorisidene)** — gjenbruker eksisterende `card`/`entry-card`-tokens, ingen nye farger: `{colors.surface}`-flate, kant `{colors.rule}`, `{rounded.lg}`/`{rounded.md}`-hjørner, samme diffuse varme skygge som `entry-card`. Én tilstand på komponenten, brukt på alle fire kategorisidene: **utvidet** (alle oppskrifter på Frokost-/Lunsj-/Middag-/Mellommåltid-sidene — tittel i `{typography.heading}`, ingrediens- og fremgangsmåte-tekst i `{typography.body}`/`{typography.body-sm}`). Denne tilstanden bærer samme metadata-"chip"-rad (tid, nybegynner-nivå, kcal) i en nøytral `{colors.paper}`-flate med `{colors.rule}`-kant — bevisst **ikke** en aksentfarge, siden dette er informasjon, ikke en valgt/fullført-tilstand. Middag-siden viser fem slike utvidede `recipe-card`-kort i en vertikal stack (ikke "én utvidet + resten kollapset"); hvert kort har en liten **"Bytt ut proteinet"**-callout (ikon + kort tekst) som gjenbruker eksisterende `{colors.accent-complete-tint}` (teal-tint, samme hjelpsomme/informative register som `icon-button-help`/`video-btn`) — ingen ny farge. Frokost-siden vises på samme måte som en 4-korts vertikal stack av utvidede `recipe-card`-kort (proteinrike/mettende frokoster), med én ekstra metadata-chip (protein, f.eks. "ca. 26 g protein") lagt til i samme chip-rad — samme nøytrale chip-stil som tid/nivå/kcal, ingen ny chip-type eller farge. Lunsj-siden vises på samme måte som en 3-korts vertikal stack av utvidede `recipe-card`-kort, samme mønster som Middag/Frokost, men uten protein-metadata-chip (den var spesifikk for Frokost). Mellommåltid-siden er nå på samme måte en 4-korts vertikal stack av utvidede `recipe-card`-kort (raske mellommåltider: smoothie, skyr-skål, hummus med grønnsaker, knekkebrød med makrell), med protein-metadata-chip i samme chip-rad — samme mønster som Frokost, ikke lenger ett kollapset forhåndsvisningskort.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Varmt papir (`{colors.paper}`) som bunnflate | Klinisk/rent hvit (`#FFFFFF`) bunnflate |
| Aksentfarge kun på flater, ikoner, strøk | Aksentfarge som løpende brødtekst-farge |
| Diffuse, varmt tonede skygger | Glow/neon-skygger, gradient-tekst |
| Serif (`Fraunces`) til overskrift, human sans (`Inter`) til brødtekst | Samme font-familie for overskrift og brødtekst |
| Myk, fjærende hover (2px løft, ~180ms overshoot) og avtagende ease-out på kaloriringen | Rask/"poppete" eller spillifisert bevegelse, konfetti, badges |
| Pille- eller rundform på alle interaktive elementer | Skarpe (0px) hjørner |
| Minste tekststørrelse 12px | Tekst under 12px, selv i bildetekster |
| `[ASSUMPTION]` Teal (`{colors.accent-complete}`) kun i tekst ≥ `{typography.caption}`-størrelse eller som ikon/flate | Teal som finskrift/liten bildetekst uten ny kontrollsjekk (4.7:1 er AA for normal tekst, ikke nødvendigvis trygt i enda mindre størrelser) |
| Rødt og grønt er utelukket fra hele aksent-paletten (eksplisitt brukervalg) | Rødt eller grønt noe sted i UI-aksentene, inkl. feil-/suksess-tilstander |

## Open Questions

- Fargeparet plomme/teal er merket "foreløpig" av brukeren selv (`.memlog.md` entry 37) — bør bekreftes som endelig før arkitektur/utvikling låser disse som faste CSS-variabler.
- Responsiv nedbrytning til 360px (PRD NFR-1) er ikke vist i noen av de godkjente mockupene (kun en ~1180px laptop-visning finnes). En egen mobil-/smal-skjerm-gjennomgang av dette formspråket bør gjøres før implementasjon — se `[ASSUMPTION]` under Layout & Spacing for en foreløpig fallback-antagelse.
