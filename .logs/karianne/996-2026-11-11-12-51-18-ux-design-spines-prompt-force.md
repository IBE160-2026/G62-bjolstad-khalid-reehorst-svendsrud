# UX-design-spines for Prompt Force

## 2026-11-11 kl. 12:51 — Karianne

### Oppgave
Kjøre `bmad-ux`-skillen for å lage DESIGN.md og EXPERIENCE.md for Prompt Force (treningslogg + kostholdslogg-nettapp), basert på product brief og PRD, slik at UX-visjonen stemmer overens med det som allerede er planlagt. Coaching path, med svg-baserte mockups (impeccable-skillen) og bred kreativ utforskning av visuell identitet.

### Plan
- Discovery: trakk ut UX-relevant innhold fra brief/PRD (målgruppe, MoSCoW-scope, plattform, a11y-krav, personvern), supplert med brukerens egen brain dump (stemning, IA-idé med dashboard + Trening/Mat-seksjoner, onboarding-mønster).
- Avklarte et scope-avvik mot PRD (gratis oppskrifter + gratis treningsprogram) — bruker bekreftet utvidelse, men PRD-dokumentet er bevisst IKKE endret av UX-sesjonen (eget oppfølgingspunkt, se under).
- Kreativ utforskning: 6 fargetema-varianter → 3 typografiretninger (for like, bruker ba om bredere variasjon) → 10 vidt forskjellige designretninger (ulike merkevareregistre) → bruker valgte retning "lys/luftig journal" (nr. 2) + 5 nye fargepar-varianter på den retningen → valgte "plomme/bær + teal" (2c, foreløpig).
- Kroppsmodell-skjermen (øvelsesvalg via anatomisk figur) gikk gjennom mange runder: håndtegnet skisse → ren croquis → kontur-følgende highlights → unifisert én-path-kontur (avvist, gjenopprettet) → nytt forsøk mot et brukerdelt referansebilde → til slutt bestemte bruker seg for å droppe figuren helt og bruke ren tekstliste for muskelgruppevalg i stedet (figuren var vanskelig å få til å se riktig ut).
- Finalize (første runde): samlet alt fra memlog + kilder + valgt mockup til DESIGN.md/EXPERIENCE.md (8 seksjoner hver), kjørte rubric-walker-coverage proaktivt, løste en lys/mørk-modus-konflikt fra tidligere i sesjonen, rendret key-screen-mockups (dashboard + kroppsmodell), promoterte dem til `mockups/`, kjørte `bmad-review` (structure + prose) og rettet funnene, satte `status: final` på begge spines.
- Fortsettelse samme dag: bygde ut Mat-siden (metodevalg + mengdefelt), søkte + skrev om reelle gratis oppskrifter (matoppskrift.no, TINE, bramat.no, klikk.no) for Oppskrifter-fanen, utvidet den til 4 kategorier (Frokost/Lunsj/Middag/Mellommåltid) med flere fulle retter per kategori, og delte til slutt Oppskrifter opp i en hub-side + 4 egne kategorisider etter ønske om bedre oversikt.
- **Git-konflikt oppdaget ved `git pull`:** Osman Khalid hadde samtidig lagt sin egen DESIGN.md/EXPERIENCE.md på nøyaktig samme sti, basert på valgt konsept "A1 · Sidemeny" fra `ux/konsepter/`-rundene hans. Løst ved å flytte hele mitt bidrag (DESIGN.md, EXPERIENCE.md, .memlog.md, mockups/, .working/) til `.docs/planning-artifacts/ux/runde-3/` som et parallelt forslag, og la Osmans versjon beholde originalstien. Merget og committet lokalt.
- Ingen formell plan-fil — hele forløpet er ført fortløpende i `.docs/planning-artifacts/ux/runde-3/.memlog.md` (85 entries), som er den kanoniske kilden til alle enkeltbeslutninger.

### Resultat
- `.docs/planning-artifacts/ux/runde-3/DESIGN.md` og `EXPERIENCE.md` — begge `status: final`, med en "Design runde 3"-merknad øverst som forklarer både figur-droppen og hvorfor dette ligger i en egen mappe (parallelt forslag, ikke Osmans).
- `.docs/planning-artifacts/ux/runde-3/mockups/`: `dashboard.html`, `kroppsmodell.html` (tekstbasert muskelgruppevalg), `mat.html`, `oppskrifter.html` (hub) + `oppskrifter-frokost.html`/`-lunsj.html`/`-middag.html`/`-mellommaltid.html`.
- `.docs/planning-artifacts/ux/runde-3/.working/` — 26 utforskningsartefakter fra Discovery, beholdt som historikk.
- `.impeccable/config.json` — mange sanksjonerte unntak (cream-palette, design-system-font, undersized-ui-text) for mockup-filer, alle med begrunnelse, pga. kjente miljøbegrensninger (ingen nettverkstilgang i disse HTML-filene).
- Git: committet lokalt i to commits — `09d883b` (design runde 3-innholdet) og `0474f65` (merge med Osmans branch + flytting til `ux/runde-3/`). **Ikke pushet ennå** — avventer brukers bekreftelse.
- Oppdaget og rettet en reell feil fra en tidligere subagent-runde: en sanksjonert impeccable-unntak var registrert under feil regelnavn og virket ikke (rettet med riktig filliste).

### Åpne punkter
- **Push gjenstår** — bruker har ikke bekreftet om/når commitene skal pushes til `origin/main`. To grupperinger av UX-forslag (Osmans på `ux-designs/`, mitt på `ux/runde-3/`) må sammenlignes og én retning velges (eller slås sammen) før arkitekturfasen.
- **Viktigst:** PRD-en (`prd-prompt-force-2026-11-02`) er ikke oppdatert til å dekke scope-utvidelsen (gratis oppskrifter + gratis treningsprogram i v1) som UX-spinen nå bygger IA rundt — kjør `bmad-prd` (update) for å holde PRD og UX-spines konsistente.
- Fargeparet plomme/bær + teal er markert "foreløpig" av bruker selv — bør bekreftes som endelig før arkitektur/utvikling låser disse som faste CSS-variabler.
- Mindre antagelser flagget i dokumentene (`[ASSUMPTION]`): redigerbare historiske treningslogger, reduced-motion-oppførsel, 360px-responsiv nedbrytning, plassering av kontomeny/avatar-ikon.
- En tidligere subagent kjørte `sesjonslogg` og en git-commit (88982d9) midt i en deloppgave (kun loggfiler, ikke designfiler) uten at jeg ba om det — ikke skadelig, men verdt å være klar over.
