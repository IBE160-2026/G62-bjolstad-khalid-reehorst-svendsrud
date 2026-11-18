import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The core loop in a real browser (story 6.4, part 2): UJ-1 to UJ-4, no horizontal scroll at
 * 360 px, and focus/Esc on real sheets. Runs against the Compose stack (OFF_MODE=mock).
 * Each test registers its own user, so the suite can run again on the same database; the
 * demo user Sara is only read (one login, no writes).
 */

const PASSWORD = "E2e-passord-1";
const SARA = { email: "sara@demo.test", password: "Demo-passord-1" };
/**
 * A barcode the mock Open Food Facts adapter knows (lettmelk, 42 kcal/100 g). The seeded
 * Norwegian brands (story 3.7) also hold it as "Tine Lettmelk 1,0 % fett", and a stored item
 * wins over the adapter, so the test reads the name from the sheet instead of assuming one.
 */
const MOCK_BARCODE = "7038010000980";

/** Text → a RegExp that matches it literally. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** The bodyweight exercise UJ-3 uses, as named in the exercise list. */
const PUSH_UP = "Armhevinger (Push-up)";

function newEmail(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@demo.test`;
}

/** "1 640 kcal" → 1640 (thousands separators may be any kind of space). */
function kcalNumber(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}

/** Focus is somewhere inside the open modal `<dialog>`. */
async function expectFocusInsideDialog(page: Page) {
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]"))))
    .toBe(true);
}

/** Close the first-run intro ("Hopp over"). */
async function skipIntro(page: Page) {
  const intro = page.getByRole("dialog", { name: "Slik kommer du i gang" });
  await expect(intro).toBeVisible();
  await intro.getByRole("button", { name: "Hopp over" }).click();
  await expect(intro).toBeHidden();
}

/**
 * UJ-1 up to the target: register, consent, skip the intro and fill in the profile.
 * Returns the daily target shown on Profiloppsett; the page is left there.
 */
async function registerWithProfile(page: Page): Promise<{ email: string; target: number }> {
  const email = newEmail();
  await page.goto("/opprett-konto");
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill(PASSWORD);
  await page.getByRole("button", { name: "Opprett konto" }).click();

  await expect(page).toHaveURL(/\/samtykke$/);
  await page
    .getByLabel("Jeg har lest dette og godtar at Prompt Force lagrer disse opplysningene.")
    .check();
  await page.getByRole("button", { name: "Godta og fortsett" }).click();

  await expect(page).toHaveURL(/\/profiloppsett$/);
  await skipIntro(page);

  await page.getByLabel("Kvinne").check();
  await page.getByLabel("Vekt (kg)").fill("70");
  await page.getByLabel("Høyde (cm)").fill("170");
  await page.getByLabel("Alder (år)").fill("30");
  await page.getByLabel("Moderat").check();
  await page.getByLabel("Holde vekten").check();
  await page.getByRole("button", { name: "Regn ut dagens mål" }).click();

  await expect(page.getByRole("heading", { name: "Dagens mål" })).toBeVisible();
  const targetText = await page.getByText(/kcal om dagen/).textContent();
  const target = kcalNumber(targetText ?? "");
  expect(target).toBeGreaterThan(0);
  return { email, target };
}

/** Register and land on I dag. */
async function registerAndGoHome(page: Page): Promise<{ email: string; target: number }> {
  const user = await registerWithProfile(page);
  await page.getByRole("link", { name: "Videre" }).click();
  await expect(page).toHaveURL(/\/$/);
  return user;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/logg-inn");
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill(password);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** The day note on I dag: remaining kcal and the target, as numbers. */
async function readDayNote(page: Page): Promise<{ remaining: number; target: number }> {
  const note = page.getByRole("region", { name: "Dagens mål" });
  const sentence = note.getByText(/igjen av dagens mål på/);
  await expect(sentence).toBeVisible();
  const remaining = kcalNumber((await note.getByText(/^[\d\s  ]+ kcal$/).textContent()) ?? "");
  const target = kcalNumber(((await sentence.textContent()) ?? "").split(" på ")[1] ?? "");
  return { remaining, target };
}

function addFoodSheet(page: Page): Locator {
  return page.getByRole("dialog", { name: "Legg til mat" });
}

/** On Mat: "+ Legg til" on Frokost, search "havregryn", log the first hit (100 g). */
async function logHavregrynToFrokost(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Legg til i Frokost" }).click();
  const sheet = addFoodSheet(page);
  await expect(sheet).toBeVisible();
  await sheet.getByRole("tab", { name: "Søk" }).click();
  await sheet.getByLabel("Søk etter matvare").fill("havregryn");
  const hit = sheet.getByRole("option").first();
  await expect(hit).toContainText(/havregryn/i);
  const name = ((await hit.locator("span").first().textContent()) ?? "").trim();
  await hit.click();
  await expect(sheet.getByLabel("Måltid")).toHaveValue("breakfast");
  await sheet.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(sheet).toBeHidden();
  return name;
}

/**
 * On Mat: "Logg mat" → Skriv strekkode with the mock barcode → Frokost. Returns the found
 * item's name as the sheet shows it (seeded or from the adapter, see MOCK_BARCODE).
 */
async function logBarcodeToFrokost(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Logg mat" }).click();
  const sheet = addFoodSheet(page);
  await expect(sheet).toBeVisible();
  await sheet.getByRole("tab", { name: "Skriv strekkode" }).click();
  await sheet.getByRole("textbox", { name: "Strekkode" }).fill(MOCK_BARCODE);
  await sheet.getByRole("button", { name: "Finn varen" }).click();
  const heading = sheet.getByRole("heading", { name: /lettmelk/i });
  await expect(heading).toBeVisible();
  const name = ((await heading.textContent()) ?? "").trim();
  await sheet.getByLabel("Mengde (g)").fill("200");
  await sheet.getByLabel("Måltid").selectOption("breakfast");
  await sheet.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(sheet).toBeHidden();
  return name;
}

/** The row link for an exercise in Trening's list or search results. */
function exerciseLink(page: Page, name: string): Locator {
  return page.getByRole("link").filter({ has: page.getByText(name, { exact: true }) }).first();
}

/** Trening: search for the exercise and open its page. */
async function openExercise(page: Page, name: string) {
  await page.getByLabel("Søk etter øvelse").fill(name);
  await exerciseLink(page, name).click();
  await expect(page).toHaveURL(/\/trening\/ovelser\//);
}

/** Choose the "Hjemme" equipment profile on Trening. */
async function chooseHjemme(page: Page) {
  const equipment = page.getByRole("group", { name: "Utstyr" });
  await equipment.getByText("Hjemme", { exact: true }).click();
  await expect(equipment.getByRole("radio", { name: "Hjemme" })).toBeChecked();
}

/**
 * UJ-3: Trening with Hjemme → Start økt → add Armhevinger → one set of 12, done →
 * Fullfør økt. Ends on I dag.
 */
async function doArmhevingerWorkout(page: Page) {
  await page.getByRole("link", { name: "Trening", exact: true }).first().click();
  await expect(page).toHaveURL(/\/trening$/);
  await chooseHjemme(page);
  await page.getByRole("button", { name: "Start økt" }).click();
  await expect(page).toHaveURL(/\/trening\/okt$/);

  await page.getByRole("link", { name: "Legg til øvelse" }).click();
  await expect(page).toHaveURL(/\/trening$/);
  await openExercise(page, PUSH_UP);
  await page.getByRole("button", { name: "Legg til i økt" }).click();
  await page.getByRole("link", { name: "Gå til økta" }).click();
  await expect(page).toHaveURL(/\/trening\/okt$/);

  await page.getByRole("button", { name: `Legg til sett, ${PUSH_UP}` }).click();
  const reps = page.getByLabel(`Repetisjoner, sett 1, ${PUSH_UP}`);
  await reps.fill("12");
  await reps.press("Enter");
  const done = page.getByLabel(`Ferdig, sett 1, ${PUSH_UP}`);
  // Controlled by the saved set: it shows as ticked once the server has answered.
  await done.click();
  await expect(done).toBeChecked();

  await page.getByRole("button", { name: "Fullfør økt" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function foodCard(page: Page): Locator {
  return page.getByRole("region", { name: "Mat" });
}

function trainingCard(page: Page): Locator {
  return page.getByRole("region", { name: "Trening" });
}

test("UJ-1: register, consent and profile give the target on I dag", async ({ page }) => {
  const { target } = await registerAndGoHome(page);

  const note = await readDayNote(page);
  expect(note.target).toBe(target);
  expect(note.remaining).toBe(target);
  await expect(page.getByRole("heading", { level: 1, name: "I dag" })).toBeVisible();
});

test("UJ-2: food by search and by barcode lowers the remaining kcal", async ({ page }) => {
  const { target } = await registerAndGoHome(page);
  expect((await readDayNote(page)).remaining).toBe(target);

  await page.getByRole("link", { name: "Logg mat" }).click();
  await expect(page).toHaveURL(/\/mat$/);
  const havregryn = await logHavregrynToFrokost(page);
  const melk = await logBarcodeToFrokost(page);

  const frokost = page.getByRole("region", { name: /^Frokost/ });
  await expect(frokost.getByRole("button", { name: new RegExp(`^Endre ${havregryn}`) })).toBeVisible();
  await expect(
    frokost.getByRole("button", { name: new RegExp(`^Endre ${escapeRegExp(melk)}, 200 g`) }),
  ).toBeVisible();
  const total = kcalNumber((await page.getByTestId("day-total").textContent()) ?? "");
  expect(total).toBeGreaterThan(0);

  await page.getByRole("link", { name: "I dag", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  // I dag may show its cached numbers for a moment while it refetches.
  await expect.poll(async () => (await readDayNote(page)).remaining).toBe(target - total);
  expect(target - total).toBeLessThan(target);
});

test("UJ-3: a home workout with Armhevinger shows on I dag", async ({ page }) => {
  await registerAndGoHome(page);
  await doArmhevingerWorkout(page);

  const card = trainingCard(page);
  await expect(card.getByRole("link", { name: "Økt", exact: true })).toBeVisible();
  await expect(card.getByText(`${PUSH_UP} 1 × 12`)).toBeVisible();
});

/** YYYY-MM-DD for today minus `days` in Europe/Oslo (AD-12). */
function osloDate(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Through the real API, with the browser's session cookie and the app's Origin: a finished
 * workout yesterday (Oslo) with one done set of Armhevinger, 10 reps.
 */
async function finishedPushUpYesterday(page: Page) {
  const origin = new URL(page.url()).origin;
  const headers = { Origin: origin };
  async function call<T>(method: "GET" | "POST" | "PATCH", path: string, data?: object) {
    const response = await page.request.fetch(`${origin}${path}`, { method, headers, data });
    expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
    return (await response.json()) as T;
  }
  type Workout = {
    id: string;
    exercises: { id: string; sets: { id: string; reps: number | null }[] }[];
  };

  const profiles = await call<{ id: string; name: string }[]>(
    "GET",
    "/api/exercises/equipment-profiles",
  );
  const home = profiles.find((profile) => profile.name === "Hjemme");
  expect(home).toBeDefined();
  const search = await call<{ exercises: { id: string; name: string }[] }>(
    "GET",
    `/api/exercises/search?profile_id=${home!.id}&q=${encodeURIComponent("Armhevinger")}`,
  );
  const pushUp = search.exercises.find((exercise) => exercise.name === PUSH_UP);
  expect(pushUp).toBeDefined();

  const workout = await call<Workout>("POST", "/api/workouts", { date: osloDate(1) });
  const added = await call<Workout>("POST", `/api/workouts/${workout.id}/exercises`, {
    exercise_id: pushUp!.id,
  });
  const exercise = added.exercises[0];
  // Fill in the exercise's first set (adding one if it starts with none) and tick it.
  let set = exercise.sets[0];
  if (!set) {
    const withSet = await call<Workout>(
      "POST",
      `/api/workouts/${workout.id}/exercises/${exercise.id}/sets`,
      {},
    );
    set = withSet.exercises[0].sets[0];
  }
  await call<Workout>("PATCH", `/api/workouts/${workout.id}/sets/${set.id}`, {
    reps: 10,
    done: true,
  });
  await call<Workout>("POST", `/api/workouts/${workout.id}/finish`);
}

test("UJ-3: «Sist» shows yesterday's Armhevinger in today's workout", async ({ page }) => {
  await registerAndGoHome(page);
  await finishedPushUpYesterday(page);

  await page.getByRole("link", { name: "Trening", exact: true }).first().click();
  await expect(page).toHaveURL(/\/trening$/);
  await chooseHjemme(page);
  await page.getByRole("button", { name: "Start økt" }).click();
  await expect(page).toHaveURL(/\/trening\/okt$/);
  await page.getByRole("link", { name: "Legg til øvelse" }).click();
  await openExercise(page, PUSH_UP);
  await page.getByRole("button", { name: "Legg til i økt" }).click();
  await page.getByRole("link", { name: "Gå til økta" }).click();
  await expect(page).toHaveURL(/\/trening\/okt$/);

  const row = page
    .getByRole("list", { name: "Øvelser i økta" })
    .getByRole("listitem")
    .filter({ has: page.getByText(PUSH_UP, { exact: true }) })
    .first();
  await expect(row.getByText(/^Sist: 10 rep \(.+\)$/)).toBeVisible();
});

/**
 * Read-only, and independent of the day the demo data was seeded: today's breakfast is only
 * "today" on the seed day, but the day note and the finished workouts are always there.
 */
test("demo user: Sara sees the day note and earlier workouts (read-only)", async ({ page }) => {
  await login(page, SARA.email, SARA.password);
  await readDayNote(page);

  await page.goto("/trening");
  const recent = page.getByRole("region", { name: "Tidligere økter" });
  await expect(recent.getByRole("listitem").first()).toBeVisible();
});

test("UJ-4: I dag shows the day's meals and workout", async ({ page }) => {
  const { target } = await registerAndGoHome(page);
  await page.getByRole("link", { name: "Logg mat" }).click();
  const havregryn = await logHavregrynToFrokost(page);
  await doArmhevingerWorkout(page);

  const food = foodCard(page);
  await expect(food.getByRole("heading", { name: "Frokost" })).toBeVisible();
  await expect(food.getByText(new RegExp(`^${havregryn} 100 g$`))).toBeVisible();
  for (const meal of ["Lunsj", "Middag", "Mellommåltid"]) {
    await expect(food.getByRole("heading", { name: meal })).toBeVisible();
  }
  await expect(trainingCard(page).getByText(`${PUSH_UP} 1 × 12`)).toBeVisible();
  await expect.poll(async () => (await readDayNote(page)).remaining).toBeLessThan(target);
});

test("360 px: I dag, Mat and Trening have no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await registerAndGoHome(page);
  await page.goto("/mat");
  await logHavregrynToFrokost(page);

  const pages: [string, RegExp][] = [
    ["/", /igjen av dagens mål/],
    ["/mat", /Frokost/],
    ["/trening", /øvelser passer med/],
  ];
  for (const [path, ready] of pages) {
    await page.goto(path);
    await expect(page.getByText(ready).first()).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `horizontal scroll on ${path}`).toBeLessThanOrEqual(clientWidth);
  }
});

test("sheets: focus moves in, Esc closes and focus returns to the opener", async ({ page }) => {
  await registerAndGoHome(page);
  await page.goto("/mat");

  const opener = page.getByRole("button", { name: "Logg mat" });
  await opener.click();
  const sheet = addFoodSheet(page);
  await expect(sheet).toBeVisible();
  await expectFocusInsideDialog(page);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();

  const help = page.getByRole("button", { name: "Hjelp for denne siden" });
  await help.click();
  const helpSheet = page.getByRole("dialog", { name: "Hjelp: Mat" });
  await expect(helpSheet).toBeVisible();
  await expectFocusInsideDialog(page);
  await page.keyboard.press("Escape");
  await expect(helpSheet).toBeHidden();
  await expect(help).toBeFocused();
});

test("week strip (story 6.3): pick yesterday, log food, today unchanged", async ({ page }) => {
  const { target } = await registerAndGoHome(page);
  expect((await readDayNote(page)).remaining).toBe(target);
  const yesterday = osloDate(1);

  // ← moves one day, across weeks when today is a Monday.
  const strip = page.getByRole("toolbar", { name: "Velg dag" });
  await strip.getByRole("button", { pressed: true }).press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(`/\\?dato=${yesterday}$`));
  await expect(page.getByText("Ingenting logget denne dagen.")).toBeVisible();

  await page.getByRole("link", { name: "Logg mat" }).click();
  await expect(page).toHaveURL(new RegExp(`/mat\\?dato=${yesterday}$`));
  const havregryn = await logHavregrynToFrokost(page);
  const frokost = page.getByRole("region", { name: /^Frokost/ });
  await expect(
    frokost.getByRole("button", { name: new RegExp(`^Endre ${escapeRegExp(havregryn)}`) }),
  ).toBeVisible();

  // The nav link to Trening keeps the date; "I dag" in the nav always means today.
  const nav = page.getByRole("navigation", { name: "Hovedmeny" }).first();
  await expect(nav.getByRole("link", { name: "Trening" })).toHaveAttribute(
    "href",
    `/trening?dato=${yesterday}`,
  );
  await nav.getByRole("link", { name: "I dag" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => (await readDayNote(page)).remaining).toBe(target);

  // Yesterday on I dag shows the entry, and the strip marks the day.
  await page.goto(`/?dato=${yesterday}`);
  await expect(
    foodCard(page).getByText(new RegExp(`^${escapeRegExp(havregryn)} 100 g$`)),
  ).toBeVisible();
  await expect(
    page.getByRole("toolbar", { name: "Velg dag" }).getByRole("button", { name: /, mat logget$/ }),
  ).toHaveCount(1);
});

test("Story 1.8: deactivate, then log in again to a welcome and the same data", async ({ page }) => {
  const { email, target } = await registerAndGoHome(page);

  await page.goto("/profil");
  const trigger = page.getByRole("button", { name: "Deaktiver konto" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Deaktivere kontoen?" });
  await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
  await dialog.getByRole("button", { name: "Deaktiver", exact: true }).click();
  await expect(page).toHaveURL(/\/logg-inn$/);

  await login(page, email, PASSWORD);
  // The status also holds the "Lukk" button, so match the message, not the whole text.
  await expect(page.getByRole("status").filter({ hasText: "Velkommen tilbake!" })).toContainText(
    "Velkommen tilbake! Kontoen din er aktiv igjen.",
  );
  expect((await readDayNote(page)).target).toBe(target);
});
