// Skjermbilder til README: logger inn som demobrukeren Sara og tar bilder på mobilbredde.
// Endrer ingen data (søker, men logger ikke noe). Krever at appen kjører:
//   docker compose up -d && cd frontend && node scripts/screenshots.mjs [YYYY-MM-DD]
// Datoen (valgfri) velger en dag med mat og trening for I dag og Mat; demodataene
// regnes fra dagen databasen ble laget, så «i dag» kan være tom.
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../../.docs/skjermbilder/", import.meta.url).pathname;

const DATO = process.argv[2];
const q = DATO ? `?dato=${DATO}` : "";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "nb-NO",
  timezoneId: "Europe/Oslo",
});
// Skjul Next.js-utviklermerket nede til venstre (dev-server).
await page.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.head.append(style);
  });
});

async function shot(name, { idle = true } = {}) {
  // YouTube-spilleren blir aldri «networkidle».
  if (idle) await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`${name}.png`);
}

await page.goto(`${BASE}/logg-inn`);
await page.getByLabel("E-post").fill("sara@demo.test");
await page.getByLabel("Passord").fill("Demo-passord-1");
await page.getByRole("button", { name: "Logg inn" }).click();
await page.waitForURL(/\/$/);
await page.goto(`${BASE}/${q}`);
await shot("1-i-dag");

await page.goto(`${BASE}/mat${q}`);
await shot("2-mat");

await page.getByRole("button", { name: "Legg til i Frokost" }).click();
const sheet = page.getByRole("dialog", { name: "Legg til mat" });
await sheet.getByRole("tab", { name: "Søk" }).click();
await sheet.getByLabel("Søk etter matvare").fill("havregryn");
await sheet.getByRole("option").first().waitFor();
await shot("3-sok-mat");

await page.goto(`${BASE}/trening`);
await shot("4-trening");

await page.getByLabel("Søk etter øvelse").fill("Armhevinger");
await page.getByRole("link").filter({ hasText: "Armhevinger" }).first().click();
await page.waitForURL(/\/trening\/ovelser\//);
await page.locator("iframe").first().waitFor();
await page.waitForTimeout(4000); // YouTube-spilleren trenger litt tid
await shot("5-ovelse", { idle: false });

await browser.close();
