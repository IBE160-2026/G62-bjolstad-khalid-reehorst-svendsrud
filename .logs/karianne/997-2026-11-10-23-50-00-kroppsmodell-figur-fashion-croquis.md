# Kroppsmodell-figur: fashion-croquis-stiloppgradering

## 2026-11-10 kl. 23:50 — Karianne

### Oppgave
Andre runde justering av kroppsfiguren i kroppsmodell-mockupen (øvelsesvalg via muskelgrupper). Bruker ga to tilbakemeldinger: (1) forrige "håndtegnet skisse"-figur (ekko-streker, skravering, -1.4° rotasjon, armer ut fra kroppen) skulle ERSTATTES med en ren, profesjonell "fashion croquis"-konturtegning etter et referansebilde brukeren beskrev (jevn glatt strek, avløngede idealiserte proporsjoner, armer rett ned, ben samlet); (2) synlig tekst inni de 5 region-knappene på figuren (Skuldre/Bryst/Mage-kjerne/Armer/Ben) skulle fjernes helt — teksten skal kun finnes i den allerede eksisterende tekstlisten ved siden av figuren.

### Plan
- Lest `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/.memlog.md` (spesielt entry 47–53), `.working/key-kroppsmodell.html` og `DESIGN.md` for å forstå historikk og tokens/fargepalett.
- Tegnet ny SVG-figur fra bunnen: ellipse-hode, torso-path (skulder→bryst→smal midje→antydet hofte), to arm-paths rett ned m/liten armhule-bue, korte fingerstrøk ved hendene, to ben-paths samlet m/tynn midtlinje og enkle flate føtter. Kun `stroke="var(--ink)"` (ingen fill, ingen rotasjon, ingen opacity-ekko, ingen skravering).
- Gjort de 5 `region-btn`-knappene tekstløse: fjernet synlig tekstnode, lagt til `aria-label`, beholdt `aria-pressed`. Ny CSS (`--region-tint` / `-hover` / `-active`, samme `--clay`-RGB ved ulik alpha) gir runde/ovale tint-overlegg i stedet for stiplet pille+tekst. Regionenes posisjon/størrelse (%) er regnet om til den nye figurens anatomi.
- Endringene ble gjort i `.working/key-kroppsmodell.html`, deretter kopiert 1:1 til `mockups/kroppsmodell.html` og verifisert med `diff`.
- Kjørt `impeccable detect --no-advisory` på begge filer.
- Åpnet begge filene med `open` (macOS).

### Resultat
- `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/.working/key-kroppsmodell.html` og `.../mockups/kroppsmodell.html`: identiske (`diff` ga ingen output). Kroppsfiguren er nå en ren konturtegning (ingen ansiktstrekk, ingen muskeldefinisjon utover to svake enkeltlinjer for nøkkelben og midje), ~9–10 hoder høy idealisert fashion-figur-proporsjon.
- Region-knappene (`region-shoulders/chest/core/arms/legs`) har ingen synlig tekst lenger; eksisterende `ul.muscle-list`/`muscle-pill` forblir eneste synlige tekst for muskelgruppene, urørt.
- `impeccable detect --no-advisory` på begge filer: ingen nye funn — kun et informasjonsnotat om at `ai-color-palette`s lilla/fiolett-sjekk er deaktivert pga. `DESIGN.md`s `colors.accent-primary` (#7a3b69), som ikke er en ny sanksjon.
- Ingen andre deler av filene (logg-kort, videoknapp, header, tekstliste, øvelsesliste, layout-grid, farger, typografi) ble rørt.
- Ikke committet av denne agenten (kodeendringer er utenfor denne logg-commiten, se regel om pathbegrenset commit).

### Åpne punkter
- `DESIGN.md` sin komponentbeskrivelse "Kroppsmodell-region" (under `## Components`) beskriver fortsatt DEN GAMLE stilen (stiplet kant + synlig tekst, "skisse-stil linjetegning... lett håndtegnet uregelmessighet"). Denne oppgaven var eksplisitt avgrenset til de to HTML-mockupene og rørte ikke `DESIGN.md` — beskrivelsen bør oppdateres ved neste DESIGN.md-runde for å unngå dokumentasjonsdrift i forhold til den nye, tekstløse konturtegning-stilen.
