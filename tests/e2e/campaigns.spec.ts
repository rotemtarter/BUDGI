import { expect, test, type Page } from "@playwright/test";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// Campaigns, campaign details and weekly data (DESIGN.md 1.4, 1.5, 1.16).
// The tests run in order and share test user A's campaigns.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await resetUserACampaigns();
});

test.afterAll(async () => {
  await resetUserACampaigns();
});

const NAME = "Summer Sale";
const WEEK = "25.10–31.10";

// Pages already visited can stay in the DOM hidden, so always look at visible elements
function visible(page: Page) {
  return {
    heading: (name: string) => page.getByRole("heading", { name }).filter({ visible: true }),
    button: (name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }),
    link: (name: string | RegExp) => page.getByRole("link", { name }).filter({ visible: true }),
    text: (text: string) => page.getByText(text).filter({ visible: true }),
  };
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).filter({ visible: true }).click();
  await page.getByRole("option", { name: option }).click();
}

async function openCampaign(page: Page) {
  await page.goto("/campaigns?status=all");
  await visible(page).link(NAME).click();
  await expect(visible(page).heading(NAME)).toBeVisible();
}

test("empty state, then a new campaign opens its details", async ({ page }) => {
  const v = visible(page);
  await page.goto("/campaigns");
  await expect(v.text("עוד לא נוצרו קמפיינים")).toBeVisible();

  await v.link("קמפיין חדש").first().click();
  await expect(v.heading("קמפיין חדש")).toBeVisible();

  await v.button("שמירה").click();
  await expect(v.text("יש להזין שם קמפיין")).toBeVisible();
  await expect(v.text("יש לבחור פלטפורמה")).toBeVisible();

  await page.getByLabel("שם הקמפיין").fill(NAME);
  await choose(page, "פלטפורמה", "Meta Ads");
  await page.getByLabel(/תקציב מתוכנן/).fill("5,000");
  await v.button("שמירה").click();

  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(v.heading(NAME)).toBeVisible();
  await expect(v.text("₪5,000")).toBeVisible();
  await expect(v.text("עוד לא הוזנו נתונים לקמפיין הזה")).toBeVisible();
});

test("the same name on the same platform is rejected", async ({ page }) => {
  const v = visible(page);
  await page.goto("/campaigns/new");
  await page.getByLabel("שם הקמפיין").fill("  summer sale ");
  await choose(page, "פלטפורמה", "Meta Ads");
  await v.button("שמירה").click();
  await expect(page.getByText("כבר קיים קמפיין בשם הזה בפלטפורמה הזו").first()).toBeVisible();
  await expect(page).toHaveURL(/\/campaigns\/new$/);
});

test("add, update and delete a week", async ({ page }) => {
  const v = visible(page);
  await openCampaign(page);

  await v.button("הוספת שבוע").click();
  const dialog = page.getByRole("dialog");
  // A Wednesday is shown as its Sunday–Saturday week
  await dialog.getByLabel("שבוע").fill("2026-10-28");
  await expect(dialog.getByText("25/10/2026–31/10/2026")).toBeVisible();

  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog.getByText("יש למלא לפחות שדה אחד")).toBeVisible();

  await dialog.getByLabel("לידים").fill("2.5");
  await dialog.getByLabel("הוצאה").fill("-1");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog.getByText("יש להזין מספר שלם")).toBeVisible();
  await expect(dialog.getByText("יש להזין מספר שאינו שלילי")).toBeVisible();

  await dialog.getByLabel("הוצאה").fill("1,000");
  await dialog.getByLabel("לידים").fill("20");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole("row", { name: new RegExp(WEEK) });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").nth(0)).toHaveText("₪1,000");
  await expect(row.getByRole("cell").nth(1)).toHaveText("20");
  // Not entered → "—", not 0
  await expect(row.getByRole("cell").nth(2)).toHaveText("—");
  await expect(row.getByText("ידני")).toBeVisible();
  // The wide table scrolls inside its box; the page itself never scrolls sideways
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  // Choosing another day of the same week loads its data instead of adding a row
  await v.button("הוספת שבוע").click();
  await dialog.getByLabel("שבוע").fill("2026-10-26");
  await expect(dialog.getByText("לשבוע הזה כבר יש נתונים")).toBeVisible();
  await expect(dialog.getByLabel("הוצאה")).toHaveValue("1,000");
  await dialog.getByLabel("עסקאות").fill("3");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: new RegExp(WEEK) })).toHaveCount(1);
  await expect(row.getByRole("cell").nth(2)).toHaveText("3");

  // Edit from the row; emptying a field makes it "not entered" again
  await page.getByRole("button", { name: `עריכת שבוע ${WEEK}` }).click();
  await expect(dialog.getByLabel("עסקאות")).toHaveValue("3");
  await dialog.getByLabel("עסקאות").fill("");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole("cell").nth(2)).toHaveText("—");

  // A campaign with data cannot be deleted
  await v.button("עריכת פרטים").click();
  await expect(dialog.getByRole("button", { name: "מחיקת קמפיין" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "ביטול" }).click();

  await page.getByRole("button", { name: `מחיקת שבוע ${WEEK}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await expect(v.text("עוד לא הוזנו נתונים לקמפיין הזה")).toBeVisible();
});

test("status change, filter and deleting an empty campaign", async ({ page, isMobile }) => {
  const v = visible(page);
  await openCampaign(page);

  await v.button("עריכת פרטים").click();
  const dialog = page.getByRole("dialog");
  await choose(page, "סטטוס", "מושהה");
  await dialog.getByLabel("תיאור").fill("קמפיין קיץ");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(v.text("מושהה").first()).toBeVisible();
  await expect(v.text("קמפיין קיץ")).toBeVisible();

  // Default filter is "active"
  await page.goto("/campaigns");
  await expect(v.text("אין קמפיינים בסטטוס הזה")).toBeVisible();
  await v.link("מושהים").click();
  await expect(v.link(NAME)).toBeVisible();
  // Table on desktop, cards on mobile
  await expect(page.getByRole("table").filter({ visible: true })).toHaveCount(isMobile ? 0 : 1);

  await v.link(NAME).click();
  await v.button("עריכת פרטים").click();
  await dialog.getByRole("button", { name: "מחיקת קמפיין" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(v.text("עוד לא נוצרו קמפיינים")).toBeVisible();
});
