# Øvelseslista: gjennomgang og nye øvelser

## 2026-11-11 kl. 17:19 — Osman Khalid

### Oppgave
Forberede issue #6 (se gjennom øvelsesvideoene) og issue #8 (tette hullene for skulder og armer) før torsdag.

### Plan
- #6: selve gjennomgangen må gjøres av mennesker, så det ble laget et skjema delt i fire bolker i stedet for at KI-en vurderer videoene.
- #8: fant kandidatvideoer med websøk, sjekket dem med YouTubes oEmbed-API og valgte én per øvelse.
- `ovelsesliste.md` ble ikke endret, fordi gruppen må godkjenne forslaget først.

### Resultat
- Commit 1b9b079: `.docs/planning-artifacts/ovelsesliste-gjennomgang-2026-11-11.md`.
- Del A: sjekkliste for alle 34 videoene, kontrollert mot lenkene i `ovelsesliste.md` (alle stemmer).
- Del B: fem nye øvelser (#35–39). Pike push-up og diamantarmhevinger tetter hullet for alle tre profilene, fordi kroppsvekt alltid er med.
- Første oEmbed-kjøring feilet for alle videoer på grunn av en feil i skriptet (lesing av svaret), ikke i videoene. Rettet og kjørt på nytt.

### Åpne punkter
- Gruppen fordeler de fire bolkene og ser gjennom videoene (issue #6).
- Gruppen godkjenner de fem nye øvelsene før de legges inn i `ovelsesliste.md` (issue #8).
