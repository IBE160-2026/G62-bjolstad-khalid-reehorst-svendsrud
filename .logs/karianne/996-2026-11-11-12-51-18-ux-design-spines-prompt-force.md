# UX-design-spines for Prompt Force

## 2026-11-11 kl. 12:51 — Karianne

### Oppgave
Kjøre `bmad-ux`-skillen for å lage DESIGN.md og EXPERIENCE.md for Prompt Force (treningslogg + kostholdslogg-nettapp), basert på product brief og PRD, slik at UX-visjonen stemmer overens med det som allerede er planlagt. Coaching path, med svg-baserte mockups (impeccable-skillen) og bred kreativ utforskning av visuell identitet.

### Plan
- Discovery: trakk ut UX-relevant innhold fra brief/PRD (målgruppe, MoSCoW-scope, plattform, a11y-krav, personvern), supplert med brukerens egen brain dump (stemning, IA-idé med dashboard + Trening/Mat-seksjoner, onboarding-mønster).
- Avklarte et scope-avvik mot PRD (gratis oppskrifter + gratis treningsprogram) — bruker bekreftet utvidelse, men PRD-dokumentet er bevisst IKKE endret av UX-sesjonen (eget oppfølgingspunkt, se under).
- Kreativ utforskning: 6 fargetema-varianter → 3 typografiretninger (for like, bruker ba om bredere variasjon) → 10 vidt forskjellige designretninger (ulike merkevareregistre) → bruker valgte retning "lys/luftig journal" (nr. 2) + 5 nye fargepar-varianter på den retningen → valgte "plomme/bær + teal" (2c, foreløpig).
- Kroppsmodell-skjermen (øvelsesvalg via anatomisk figur) gikk gjennom mange runder: håndtegnet skisse → ren croquis → kontur-følgende highlights → unifisert én-path-kontur (avvist, gjenopprettet) → nytt forsøk mot et brukerdelt referansebilde → til slutt bestemte bruker seg for å droppe figuren helt og bruke ren tekstliste for muskelgruppevalg i stedet.
- Finalize: samlet alt fra memlog + kilder + valgt mockup til DESIGN.md/EXPERIENCE.md (8 seksjoner hver), kjørte rubric-walker-coverage proaktivt, løste en lys/mørk-modus-konflikt fra tidligere i sesjonen, rendret key-screen-mockups (dashboard + kroppsmodell), promoterte dem til `mockups/`, kjørte `bmad-review` (structure + prose) og rettet funnene, satte `status: final` på begge spines.
- Ingen formell plan-fil — hele forløpet er ført fortløpende i `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/.memlog.md` (65 entries), som er den kanoniske kilden til alle enkeltbeslutninger.

### Resultat
- `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/DESIGN.md` og `EXPERIENCE.md` — begge `status: final`, `updated: 2026-11-11`.
- `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/mockups/dashboard.html` og `kroppsmodell.html` — promoterte, kanoniske mockups lenket inn i spine-dokumentene.
- `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/.working/` — 20+ utforskningsartefakter fra Discovery, beholdt som historikk (ikke gjeldende referanse).
- `.impeccable/config.json` — flere sanksjonerte unntak (cream-palette, design-system-font, undersized-ui-text) for mockup-filer, alle med begrunnelse, pga. kjente miljøbegrensninger (ingen nettverkstilgang i disse HTML-filene).
- Ingenting er committet ennå (ukommitterte filer ligger i `.docs/planning-artifacts/ux-designs/` og `.impeccable/`).

### Åpne punkter
- **Viktigst:** PRD-en (`prd-prompt-force-2026-11-02`) er ikke oppdatert til å dekke scope-utvidelsen (gratis oppskrifter + gratis treningsprogram i v1) som UX-spinen nå bygger IA rundt — kjør `bmad-prd` (update) for å holde PRD og UX-spines konsistente.
- Fargeparet plomme/bær + teal er markert "foreløpig" av bruker selv — bør bekreftes som endelig før arkitektur/utvikling låser disse som faste CSS-variabler.
- To skjermer mangler fortsatt visuell mockup (bygges foreløpig kun fra spine-tabellene): metodevalg-skjermen for matlogging, og mengde-/porsjonsfeltet.
- Mindre antagelser flagget i dokumentene (`[ASSUMPTION]`): redigerbare historiske treningslogger, reduced-motion-oppførsel, 360px-responsiv nedbrytning, plassering av kontomeny/avatar-ikon.
- En tidligere subagent kjørte `sesjonslogg` og en git-commit (88982d9) midt i en deloppgave (kun loggfiler, ikke designfiler) uten at jeg ba om det — ikke skadelig, men verdt å være klar over.
- UX-mappen (`.docs/planning-artifacts/ux-designs/`) og `.impeccable/` er ikke lagt til i git ennå — vurder å committe disse slik at fremtidige endringer har en reell sikkerhetskopi (ble synlig som et problem da en figur-revertering ikke kunne gjøres byte-for-byte).
