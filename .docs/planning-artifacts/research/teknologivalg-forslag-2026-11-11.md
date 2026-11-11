# Teknologivalg: forslag til arkitekturmøtet

**Dato:** 2026-11-11 · **Av:** Osman Khalid med Claude Code · **Status:** forslag. Gruppen bestemmer på torsdag (`bmad-architecture`).

Notatet bygger på det vi allerede har: PRD-en, PRD-tillegget (datamodell, Open Food Facts, Matvaretabellen) og Kariannes research om [innlogging](technical-login-authentication-approach-selection-2026-10-28/research.md) og [strekkode](technical-barcode-scanning-library-selection-2026-10-28/research.md). Det gjentar ikke de valgene, men viser hvordan de passer inn i hvert alternativ.

## Krav som styrer valget

| Krav | Kilde | Betyr for teknologien |
|---|---|---|
| Sensor kjører appen lokalt fra README, uten våre nøkler eller kontoer, på under 20 min | NFR-3, SM-3 | Databasen må kunne kjøre lokalt uten oppsett (helst en fil). Ingen Docker-krav. |
| Appen publiseres på Vercel | README, vercel-oppsett | Bør passe Vercel uten triks. En lokal databasefil lagres ikke på Vercel, så produksjon trenger en database på nett. |
| Seed-data med testbrukere | NFR-4 | Et seed-skript som kjøres med én kommando. |
| Automatiske tester av kalorier, forslag, tilgang og «ikke funnet» | NFR-8 | Testverktøy for logikk, og gjerne ende-til-ende. |
| Open Food Facts bak en egen modul som kan byttes med mock | NFR-5, NFR-6 | Kall til OFF går via serveren, med cache i databasen. |
| Egen innlogging med e-post og passord, sesjon i HttpOnly-cookie | FR-1, Kariannes research | Trenger server-side kode og en database for brukere og sesjoner. |
| Design med egne tokens og komponenter | DESIGN.md, EXPERIENCE.md, issue #12 | Et komponentbibliotek vi kan style med våre farger, eller egne komponenter. |

## Tre alternativer

### A. Next.js (fullstack) · anbefalt

- **Hva:** Next.js med TypeScript. Sider og server-kode i samme prosjekt. Tailwind CSS og shadcn/ui for komponenter. Drizzle ORM mot SQLite: en lokal fil for utvikling og sensor, og Turso (SQLite på nett, gratisnivå) på Vercel. Vitest for logikk og Playwright for ende-til-ende.
- **Innlogging:** egen implementasjon etter Kariannes OWASP-sjekkliste (Argon2id, sesjon i HttpOnly-cookie, rate limiting).
- **Fordeler:** laget av Vercel, så publisering er enklest. Ett prosjekt og ett språk. Mye dokumentasjon og eksempler, så KI-en er god på det. shadcn/ui kan styles direkte med tokenene i DESIGN.md.
- **Ulemper:** Next.js har en læringskurve (server- og klientkomponenter). Turso trengs bare for Vercel, men er en ekstra tjeneste å sette opp.

### B. SvelteKit (fullstack)

- **Hva:** SvelteKit med TypeScript, Drizzle og SQLite/Turso som i A. Komponenter enten egne eller fra et Svelte-bibliotek. Vitest og Playwright.
- **Fordeler:** enklere og kortere kode enn Next.js. Ett prosjekt. Fungerer på Vercel med en adapter.
- **Ulemper:** mindre økosystem og færre eksempler, så KI-en treffer sjeldnere første gang. Ingen i gruppen har brukt det (`[ASSUMPTION]`, sjekk på torsdag).

### C. React (Vite) + Express API (to deler)

- **Hva:** frontend i React med Vite, og et eget API i Node/Express med SQLite.
- **Fordeler:** klassisk og lett å forstå: klient og server er tydelig delt. Mye læringsstoff.
- **Ulemper:** to prosjekter å sette opp, kjøre og teste. Express passer dårlig på Vercel (må gjøres om til serverless-funksjoner), og SQLite-filen lagres ikke der.

## Sammenligning

| | A. Next.js | B. SvelteKit | C. React + Express |
|---|---|---|---|
| Kjøre lokalt for sensor | ✅ én kommando | ✅ én kommando | ⚠️ to prosesser |
| Publisering på Vercel | ✅ innebygd | ✅ med adapter | ⚠️ krever omskriving |
| KI-støtte og eksempler | ✅ svært god | ⚠️ middels | ✅ god |
| Læringskurve | ⚠️ middels | ✅ lav | ✅ lav |
| Passer DESIGN.md | ✅ shadcn/ui + Tailwind | ⚠️ egne komponenter | ✅ shadcn/ui + Tailwind |

## Felles for alle tre

- **Database:** SQLite via Drizzle lokalt (ingen installasjon), Turso i produksjon. Datamodellen fra PRD-tillegget, del A, kan brukes direkte.
- **Open Food Facts:** én servermodul for oppslag på strekkode, med cache i `FoodItem` og en mock til tester. Testen 11.11 viste at oppslaget er raskt, at «ikke funnet» kommer som HTTP 404, og at vi selv må validere EAN-koden ([detaljer](off-dekning-og-acsm-2026-11-10.md)).
- **Kamera:** Quagga2, bare hvis FR-8 bygges (issue #4).
- **Hemmeligheter:** bare i `.env` (git-ignorert) og i Vercel sine miljøvariabler, med `.env.example` i repoet.

## Spørsmål til torsdag

1. Har noen i gruppen erfaring med React, Next.js eller Svelte? Det kan veie tyngre enn tabellen over.
2. Godtar vi Turso som database på nett, eller vil vi bare kjøre lokalt og la Vercel vente?
3. Komponentbibliotek (issue #12): shadcn/ui, eller egne komponenter?
