# Felles design v2 — visuell mockup

## 2026-11-13 kl. 19:58 — Karianne

### Oppgave
Flere ting i samme økt: synke lokal main (git pull, inkl. løse en merge-konflikt i README.md), finne ut hvor i BMad-prosessen prosjektet står (`bmad-help`), lage visuelle mockuper av UX-designet (runde 3, og senere Osmans "felles design v2" etter min egen tilbakemelding på PR #17), og til slutt committe og pushe et par ventende endringer.

### Plan
- `git pull` to ganger i løpet av økten (story 1.1/app-skjelett landet på main; senere flere nye commits inkl. Osmans v2-revisjon på `ux/felles-design`). Løste en konflikt i README.md (behold "Status"-seksjonen fra upstream + mitt lenkeformat).
- Kjørte `bmad-help` for statusoversikt: planleggingsfasen nesten ferdig (brief/PRD/arkitektur/epics final), UX ventet på at PR #17 ble slått sammen, Sprint Planning ikke kjørt ennå.
- Bygde en Design-canvas («Prompt Force — Runde 3 (mobil)») med 8 mobilskjermer i runde-3-stil (kaloriring beholdt, Fraunces, full fargepalett) etter eksplisitt ønske om å beholde runde 3 og kaloriringen.
- Fant Osmans "UX-design revisjon 2" (commit 69ace97 på `ux/felles-design`, etter min tilbakemelding på PR #17: notatbok-linjer tilbake, plomme eneste fylte farge, Inter overalt, oppskrifter utsatt til fase 2). Bygde en ny, separat canvas («Prompt Force — Felles design v2 (Osman)») som gjenskaper hans ene statiske HTML-fil som ordentlige, klikkbare PC- og mobilskjermer.
- Iterert på v2-canvasen etter tilbakemeldinger:
  - La til Mat- og Trening-sidene (PC + mobil) i samme v2-stil (var opprinnelig bare "I dag").
  - Byttet grønn/oransje kategorifarge til én samlet mauve-tone (`#9C5E87`) hentet fra plomme-paletten.
  - Byttet font fra Inter → Helvetica Neue → **Manrope** (Google Fonts, "stilren" sans) etter to runder tilbakemelding.
  - La til Oppskrifter-hub-siden (PC + mobil), merket "Fase 2 — utenfor v1-omfang".
  - Fjernet magnet-prikkene i ukestripen på "I dag" (passet ikke lenger med ny fargepalett).
  - Byttet den gule nål-fargen på dagens-lapp til samme mauve-tone som resten.
  - La til "Skann med kamera" på mobil Mat-siden (FR-8-mønster), først som egen linje under strekkode-valget, deretter flyttet inn i selve boksen som en liten plomme-ikonknapp til høyre.

### Resultat
- **Canvas 1** (runde 3, mobil, kaloriring beholdt): https://claude.ai/artifact/CSCAJBt2Lq5eWG6d6VdR4X — 8 skjermer (Dashboard, Mat, Trening, Oppskrifter-hub + 4 kategorisider).
- **Canvas 2** (felles design v2, Osmans revisjon gjenskapt + videreutviklet): https://claude.ai/artifact/MHV9YS6r1wm3h8wF4qAjhz — privat (kun jeg kan åpne den foreløpig), 8 skjermer (I dag/Mat/Trening/Oppskrifter-hub × PC+mobil).
- Git: løst merge-konflikt i README.md under pull; senere committet og pushet `0a7bf5f` ("README: rett lenkeformatering; logg beslutning om å pushe begge UX-forslag") til `origin/main`.
- `bmad-help`-statusen er ikke lenger helt à jour etter at Osmans v2-revisjon landet — bør kjøres på nytt før Sprint Planning.

### Åpne punkter
- [ ] Canvas 2 er privat — må deles fra siden selv (Share-menyen) hvis resten av gruppen skal se den.
- [ ] Oppskrifter-kategorisidene (Frokost/Lunsj/Middag/Mellommåltid) er ikke bygget om til v2-stilen ennå — finnes bare i runde-3-stil i Canvas 1.
- [ ] Siden mat og trening nå deler samme markørfarge (ikke lenger grønn/oransje), skilles de kun på ikon og tekst — vurder om dette blir utydelig i praksis.
- [ ] PR #17 (felles UX-design) er fortsatt ikke godkjent/merget — Osmans v2-revisjon venter på min godkjenning der.
