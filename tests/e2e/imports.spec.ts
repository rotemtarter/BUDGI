import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// CSV/Excel import in four steps (DESIGN.md 1.11, PRD 3.4).
// The tests run in order and share test user A's campaigns.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await resetUserACampaigns();
});

test.afterAll(async () => {
  await resetUserACampaigns();
});

const FIXTURES = "tests/fixtures/imports";
let templatePath: string;

function visible(page: Page) {
  return {
    heading: (name: string) => page.getByRole("heading", { name }).filter({ visible: true }),
    button: (name: string | RegExp) => page.getByRole("button", { name }).filter({ visible: true }),
    text: (text: string | RegExp) => page.getByText(text).filter({ visible: true }),
  };
}

async function upload(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto("/imports");
  await expect(visible(page).text("גרור קובץ לכאן או בחר קובץ")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(file);
}

async function summary(page: Page, label: string) {
  const card = page.locator("div", { has: page.getByText(label, { exact: true }) }).last();
  return (await card.innerText()).replace(label, "").trim();
}

async function campaignNames() {
  const { client } = await signInTestUser("A");
  const { data } = await client.from("campaigns").select("name").order("name");
  return (data ?? []).map((c) => c.name);
}

test("the sample file downloads and imports as it is", async ({ page }) => {
  await page.goto("/imports");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "הורדת קובץ דוגמה" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("budgi-sample.xlsx");
  templatePath = test.info().outputPath("budgi-sample.xlsx");
  await download.saveAs(templatePath);

  await upload(page, templatePath);
  await expect(visible(page).heading("בדיקה")).toBeVisible();
  await expect(visible(page).text("העמודות זוהו אוטומטית")).toBeVisible();
  expect(await summary(page, "שורות חדשות")).toBe("4");
  expect(await summary(page, "עדכונים לנתונים קיימים")).toBe("0");
  expect(await summary(page, "קמפיינים חדשים שייווצרו")).toBe("2");
  expect(await summary(page, "שורות עם שגיאות")).toBe("0");
  await expect(visible(page).text("קמפיין דוגמה – לידים")).toBeVisible();

  // Nothing is created before the user confirms
  expect(await campaignNames()).toEqual([]);

  await visible(page).button("ייבוא 4 שורות").click();
  await expect(visible(page).heading("סיום")).toBeVisible();
  await expect(visible(page).text("נשמרו 4 שורות (4 חדשות, 0 עדכונים)")).toBeVisible();
  await expect(visible(page).text("נוצרו 2 קמפיינים חדשים")).toBeVisible();

  await page.getByRole("link", { name: "מעבר לקמפיינים" }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(page.getByText("קמפיין דוגמה – חיפוש").filter({ visible: true }).first()).toBeVisible();
});

test("importing the same file again only updates, without duplicates", async ({ page }) => {
  await upload(page, templatePath);
  await expect(visible(page).heading("בדיקה")).toBeVisible();
  expect(await summary(page, "שורות חדשות")).toBe("0");
  expect(await summary(page, "עדכונים לנתונים קיימים")).toBe("4");
  expect(await summary(page, "קמפיינים חדשים שייווצרו")).toBe("0");

  await visible(page).button("ייבוא 4 שורות").click();
  await expect(visible(page).text("נשמרו 4 שורות (0 חדשות, 4 עדכונים)")).toBeVisible();

  const { client } = await signInTestUser("A");
  const { count } = await client.from("campaign_performance").select("id", { count: "exact", head: true });
  expect(count).toBe(4);
  // The empty "עסקאות" cell did not overwrite anything with 0
  const { data } = await client.from("campaign_performance").select("deals").eq("week_start", "2026-10-11").is("deals", null);
  expect(data).toHaveLength(1);
  expect(await campaignNames()).toHaveLength(2);
});

test("a file with other headers: platform for the whole file and typed dates", async ({ page }) => {
  await resetUserACampaigns();
  await upload(page, `${FIXTURES}/meta-export.csv`);
  await expect(visible(page).heading("התאמת עמודות")).toBeVisible();
  const proceed = visible(page).button("המשך");
  await expect(proceed).toBeDisabled();
  // The ads export's columns are recognized; only the platform is left
  await expect(visible(page).text("יש לבחור: פלטפורמה")).toBeVisible();

  const choose = async (field: RegExp, option: string) => {
    await page.getByRole("combobox", { name: field }).filter({ visible: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  // Platform comes first, with the four platforms before the file's columns
  const comboboxes = page.getByRole("combobox").filter({ visible: true });
  await expect(comboboxes.first()).toHaveAccessibleName(/^פלטפורמה/);
  await comboboxes.first().click();
  const options = page.getByRole("option");
  await expect(options.nth(0)).toHaveText("Meta Ads – לכל השורות");
  await expect(options.nth(3)).toHaveText("LinkedIn Ads – לכל השורות");
  await expect(options.nth(0).locator("svg")).toBeVisible();
  await options.nth(0).click();

  await choose(/^שם קמפיין/, "Ad name");
  await choose(/^הוצאה/, "Amount spent (ILS)");
  await choose(/^לידים/, "Leads");
  // The week comes from "Reporting starts"; dates can be typed instead
  await expect(visible(page).text(/מהעמודה „Reporting starts” בקובץ/)).toBeVisible();
  await expect(proceed).toBeEnabled();
  await visible(page).button("הזנת תאריכים ידנית").click();

  // Dates may cover up to 8 days, or one full month
  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-10-01");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-10-30");
  await expect(visible(page).text(/אפשר לבחור עד 8 ימים, או חודש מלא/)).toBeVisible();
  await expect(proceed).toBeDisabled();
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-10-31");
  await expect(visible(page).text("אוקטובר 2026, מחולק ל-5 שבועות")).toBeVisible();
  await expect(proceed).toBeEnabled();

  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-10-27");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-10-29");
  await expect(visible(page).text("25.10–31.10")).toBeVisible();
  await expect(proceed).toBeEnabled();
  await proceed.click();

  await expect(visible(page).heading("בדיקה")).toBeVisible();
  await expect(visible(page).text("העמודות זוהו אוטומטית")).toHaveCount(0);
  expect(await summary(page, "שורות חדשות")).toBe("2");
  expect(await summary(page, "קמפיינים חדשים שייווצרו")).toBe("2");

  // Back keeps the choices; still nothing saved
  await visible(page).button("חזרה").click();
  await expect(visible(page).heading("התאמת עמודות")).toBeVisible();
  await expect(proceed).toBeEnabled();
  expect(await campaignNames()).toEqual([]);

  await proceed.click();
  await visible(page).button("ייבוא 2 שורות").click();
  await expect(visible(page).text("נוצרו 2 קמפיינים חדשים")).toBeVisible();
  expect(await campaignNames()).toEqual(["Carousel summer", "Video: customer review"]);

  const { client } = await signInTestUser("A");
  const { data } = await client.from("campaign_performance").select("week_start, spend, leads, campaigns(platform)").order("spend");
  expect(data).toEqual([
    { week_start: "2026-10-25", spend: 640, leads: 6, campaigns: { platform: "meta_ads" } },
    { week_start: "2026-10-25", spend: 1200.5, leads: 14, campaigns: { platform: "meta_ads" } },
  ]);
});

test("a file of ads is added up into one week of a campaign, from its details screen", async ({ page }) => {
  await resetUserACampaigns();
  const { client } = await signInTestUser("A");
  const { data: campaign } = await client
    .from("campaigns")
    .insert({ name: "נובמבר סייל", platform: "meta_ads" })
    .select("id")
    .single();

  await page.goto(`/campaigns/${campaign!.id}`);
  await page.getByRole("link", { name: "ייבוא קובץ" }).filter({ visible: true }).click();
  await expect(visible(page).heading("ייבוא נתונים לקמפיין")).toBeVisible();
  await expect(visible(page).text("גרור קובץ לכאן או בחר קובץ")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(`${FIXTURES}/meta-export.csv`);

  await expect(visible(page).heading("התאמת עמודות")).toBeVisible();
  // The campaign and its platform are known
  await expect(page.getByRole("combobox", { name: /^פלטפורמה/ })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /^שם קמפיין/ })).toHaveCount(0);
  const proceed = visible(page).button("המשך");
  await expect(proceed).toBeDisabled();

  const choose = async (field: RegExp, option: string) => {
    await page.getByRole("combobox", { name: field }).filter({ visible: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await choose(/^הוצאה/, "Amount spent (ILS)");
  await choose(/^לידים/, "Leads");
  // 3–10.11: most days are in the week of 1–7.11
  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-11-03");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-11-10");
  await expect(visible(page).text(/01\.11–07\.11/)).toBeVisible();
  await proceed.click();

  await expect(visible(page).heading("בדיקה")).toBeVisible();
  await expect(visible(page).text(/2 שורות מהקובץ יחוברו לשבוע/)).toBeVisible();
  const row = (label: string) => page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: label }) });
  await expect(row("הוצאה")).toContainText("1,840.5");
  await expect(row("לידים")).toContainText("20");
  await visible(page).button("שמירה לקמפיין").click();

  await expect(visible(page).text("הנתונים נשמרו")).toBeVisible();
  await page.getByRole("link", { name: "חזרה לקמפיין" }).click();
  await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign!.id}$`));
  await expect(visible(page).text("01.11–07.11")).toBeVisible();

  // Again for the same week: the stored week is updated, not duplicated
  await page.goto(`/imports?campaign=${campaign!.id}`);
  await expect(visible(page).text("גרור קובץ לכאן או בחר קובץ")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(`${FIXTURES}/meta-export.csv`);
  await choose(/^הוצאה/, "Amount spent (ILS)");
  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-11-01");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-11-07");
  await proceed.click();
  await expect(visible(page).text(/לשבוע הזה כבר יש נתונים/)).toBeVisible();
  await expect(row("לידים")).toContainText("20");
  await visible(page).button("שמירה לקמפיין").click();
  await expect(visible(page).text(/עודכן שבוע/)).toBeVisible();

  const { data: weeks } = await client.from("campaign_performance").select("week_start, spend, leads, source");
  expect(weeks).toEqual([{ week_start: "2026-11-01", spend: 1840.5, leads: 20, source: "import" }]);
});

test("rows with errors are listed with their line and reason and are not saved", async ({ page }) => {
  await resetUserACampaigns();
  await upload(page, `${FIXTURES}/errors.csv`);
  await expect(visible(page).heading("בדיקה")).toBeVisible();
  expect(await summary(page, "שורות חדשות")).toBe("1");
  expect(await summary(page, "שורות עם שגיאות")).toBe("8");

  const errors = page.getByRole("table").filter({ visible: true });
  const reasonOf = (line: number) => errors.getByRole("row").filter({ has: page.getByRole("cell", { name: String(line), exact: true }) });
  await expect(reasonOf(3)).toContainText("חסר שם קמפיין");
  await expect(reasonOf(4)).toContainText("פלטפורמה לא מוכרת: Snapchat");
  await expect(reasonOf(5)).toContainText("תאריך לא תקין");
  await expect(reasonOf(6)).toContainText("הוצאה: יש להזין מספר שאינו שלילי");
  await expect(reasonOf(7)).toContainText("לידים: יש להזין מספר שלם");
  await expect(reasonOf(8)).toContainText("אין בשורה אף ערך מספרי");
  await expect(reasonOf(9)).toContainText("כפולה");
  await expect(reasonOf(10)).toContainText("גם בשורה 9");

  await visible(page).button("ייבוא שורה אחת").click();
  await expect(visible(page).text("8 שורות עם שגיאות לא נשמרו")).toBeVisible();
  expect(await campaignNames()).toEqual(["Import Delta"]);
});

test("dates that are not a Sunday are moved to their week", async ({ page }) => {
  await upload(page, `${FIXTURES}/valid.csv`);
  await expect(visible(page).heading("תאריכים שהותאמו")).toBeVisible();
  await expect(visible(page).text(/שורה 2: 28\/10\/2026/)).toBeVisible();
  await expect(visible(page).text("25.10–31.10")).toBeVisible();
});

test("unsupported, empty and too large files get a clear message", async ({ page }) => {
  await upload(page, `${FIXTURES}/notes.txt`);
  await expect(page.getByRole("alert").filter({ hasText: "סוג הקובץ לא נתמך" })).toBeVisible();

  await upload(page, `${FIXTURES}/empty.csv`);
  await expect(page.getByRole("alert").filter({ hasText: "הקובץ ריק" })).toBeVisible();

  await upload(page, { name: "big.csv", mimeType: "text/csv", buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "a") });
  await expect(page.getByRole("alert").filter({ hasText: "הקובץ גדול מ-5MB" })).toBeVisible();

  // A renamed file is caught by the server
  await upload(page, { name: "fake.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("a,b\n1,2") });
  await expect(page.getByRole("alert").filter({ hasText: "סוג הקובץ לא נתמך" })).toBeVisible();
});

test("a full month is split into the month's weeks by days (ADR-16)", async ({ page }) => {
  await resetUserACampaigns();
  await upload(page, `${FIXTURES}/meta-export.csv`);
  await expect(visible(page).heading("התאמת עמודות")).toBeVisible();
  const choose = async (field: RegExp, option: string) => {
    await page.getByRole("combobox", { name: field }).filter({ visible: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await choose(/^פלטפורמה/, "Meta Ads – לכל השורות");
  await choose(/^שם קמפיין/, "Ad name");
  await choose(/^הוצאה/, "Amount spent (ILS)");
  await choose(/^לידים/, "Leads");
  await visible(page).button("הזנת תאריכים ידנית").click();
  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-10-01");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-10-31");
  await expect(visible(page).text("אוקטובר 2026, מחולק ל-5 שבועות")).toBeVisible();
  await visible(page).button("המשך").click();

  await expect(visible(page).text(/כל שורה בקובץ חולקה ל-5 שבועות/)).toBeVisible();
  expect(await summary(page, "שורות חדשות")).toBe("10");
  await visible(page).button("ייבוא 10 שורות").click();
  await expect(visible(page).text("נוצרו 2 קמפיינים חדשים")).toBeVisible();

  // The month's totals on the home screen equal the file's totals
  await page.goto("/dashboard?period=month&value=2026-10");
  const cards = page.getByRole("region", { name: "נתוני התקופה" }).filter({ visible: true });
  await expect(cards.getByText("₪1,841")).toBeVisible(); // 1,200.50 + 640

  // Five week rows per campaign, the one of 4.10–10.10 a full week at the pace
  const { client } = await signInTestUser("A");
  const { data } = await client.from("campaign_performance").select("week_start, spend, campaigns(name)").order("week_start");
  const video = data!.filter((row) => row.campaigns?.name === "Video: customer review");
  expect(video.map((row) => row.week_start)).toEqual(["2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"]);
  expect(video[1].spend).toBe(271.08); // 1,200.50 ÷ 31 × 7
});

test("a full month into one campaign is split into its weeks", async ({ page }) => {
  await resetUserACampaigns();
  const { client } = await signInTestUser("A");
  const { data: campaign } = await client.from("campaigns").insert({ name: "Month Campaign", platform: "meta_ads" }).select("id").single();

  await page.goto(`/imports?campaign=${campaign!.id}`);
  await expect(visible(page).text("גרור קובץ לכאן או בחר קובץ")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(`${FIXTURES}/meta-export.csv`);
  await page.getByRole("combobox", { name: /^הוצאה/ }).filter({ visible: true }).click();
  await page.getByRole("option", { name: "Amount spent (ILS)", exact: true }).click();
  await page.getByLabel("מתאריך").filter({ visible: true }).fill("2026-11-01");
  await page.getByLabel("עד תאריך").filter({ visible: true }).fill("2026-11-30");
  await visible(page).button("המשך").click();

  await expect(visible(page).text(/יחוברו ויחולקו ל-5 שבועות של החודש/)).toBeVisible();
  await visible(page).button("שמירה לקמפיין").click();
  await expect(visible(page).text(/נשמרו 5 שבועות של החודש/)).toBeVisible();

  const { data: weeks } = await client.from("campaign_performance").select("week_start, spend").order("week_start");
  // 1,840.50 ÷ 30 × 7 = 429.45 for every week of November
  expect(weeks).toEqual(
    ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"].map((week_start) => ({ week_start, spend: 429.45 })),
  );
});
