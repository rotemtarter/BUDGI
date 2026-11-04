import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// Alerts (PRD 4.6; DESIGN.md 1.9, 1.10): settings, pop-ups after a save and
// an import, the bell counter and the alert center. The tests run in order
// and share test user A's data.
test.describe.configure({ mode: "serial" });

const NAME = "Alerts Meta";

// Today and this week's Sunday in Israel time
function israelToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function thisWeek() {
  const date = new Date(`${israelToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

function thisMonth() {
  return `${israelToday().slice(0, 7)}-01`;
}

let campaignId: string;

// One campaign with a ₪100 budget this month and no weekly data. Spending
// ₪1,000 this week goes over its budget whatever the day of the month.
async function seed() {
  await resetUserACampaigns();
  const { client, userId } = await signInTestUser("A");
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: NAME, platform: "meta_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  campaignId = campaign.data.id;
  const budget = await client
    .from("campaign_budgets")
    .insert({ user_id: userId, campaign_id: campaignId, month: thisMonth(), planned_amount: 100 });
  if (budget.error) throw budget.error;
}

async function overrunAlerts() {
  const { client } = await signInTestUser("A");
  const { data, error } = await client
    .from("alerts")
    .select("id, read_at")
    .eq("alert_type", "budget_overrun")
    .eq("related_campaign_id", campaignId);
  if (error) throw error;
  return data;
}

async function clearAlerts() {
  const { client, userId } = await signInTestUser("A");
  const { error } = await client.from("alerts").delete().eq("user_id", userId);
  if (error) throw error;
}

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await seed();
});

test.afterAll(async () => {
  await resetUserACampaigns();
});

function visible(page: Page) {
  return {
    heading: (name: string) => page.getByRole("heading", { name }).filter({ visible: true }),
    button: (name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }),
    text: (text: string | RegExp) => page.getByText(text).filter({ visible: true }),
  };
}

function bell(page: Page) {
  return page.locator("header").getByRole("link", { name: /^התראות/ }).filter({ visible: true });
}

async function saveWeek(page: Page, spend: string) {
  await page.goto(`/campaigns/${campaignId}`);
  await expect(visible(page).heading(NAME)).toBeVisible();
  const edit = page.getByRole("button", { name: /^עריכת שבוע/ }).filter({ visible: true });
  if (await edit.count()) await edit.first().click();
  else await visible(page).button("הוספת שבוע").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("שבוע").fill(thisWeek());
  await dialog.getByLabel("הוצאה").fill(spend);
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
}

test("alert settings are saved, validated and can go back to the defaults", async ({ page }) => {
  await page.goto("/settings#alerts");
  const card = page.locator("#alerts");
  await expect(card.getByText("קצב הוצאות", { exact: true })).toBeVisible();

  const pace = card.getByTestId("alert-setting-spend_pace");
  const reached = card.getByTestId("alert-setting-goal_reached");
  await expect(pace.getByLabel("סף (%)")).toHaveValue("10");
  await expect(card.getByLabel("מספר שבועות להשוואה")).toHaveValue("4");
  // "Goal reached" has a switch only
  await expect(reached.getByLabel("סף (%)")).toHaveCount(0);

  await pace.getByLabel("סף (%)").fill("-1");
  await card.getByRole("button", { name: "שמירת הגדרות התראות" }).click();
  await expect(pace.getByText("יש להזין מספר שאינו שלילי")).toBeVisible();

  await pace.getByLabel("סף (%)").fill("15");
  await reached.getByRole("switch", { name: "יעד הושג" }).uncheck();
  await card.getByRole("button", { name: "שמירת הגדרות התראות" }).click();
  await expect(visible(page).text("הגדרות ההתראות נשמרו")).toBeVisible();

  await page.reload();
  await expect(pace.getByLabel("סף (%)")).toHaveValue("15");
  await expect(reached.getByRole("switch", { name: "יעד הושג" })).not.toBeChecked();

  await card.getByRole("button", { name: "החזרה לברירת המחדל" }).click();
  await expect(pace.getByLabel("סף (%)")).toHaveValue("10");
  await expect(reached.getByRole("switch", { name: "יעד הושג" })).toBeChecked();
  await card.getByRole("button", { name: "שמירת הגדרות התראות" }).click();
  await expect(visible(page).text("הגדרות ההתראות נשמרו")).toBeVisible();
  await page.reload();
  await expect(pace.getByLabel("סף (%)")).toHaveValue("10");
});

test("saving a week over budget pops up an alert once, and the bell counts it", async ({ page }) => {
  await clearAlerts();
  await page.goto(`/campaigns/${campaignId}`);
  await expect(bell(page)).toHaveAccessibleName("התראות");

  await saveWeek(page, "1,000");
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "חריגה מהתקציב" });
  await expect(toast).toBeVisible();
  await expect(toast.getByText(NAME)).toBeVisible();
  await expect(toast.getByRole("button", { name: "לפרטים" })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName(/^התראות, \d+ שלא נקראו$/);
  expect(await overrunAlerts()).toHaveLength(1);

  // The same overrun again this week: no new alert
  await saveWeek(page, "1,005");
  await expect(visible(page).text("נתוני השבוע נשמרו").last()).toBeVisible();
  expect(await overrunAlerts()).toHaveLength(1);
});

test("the alert center lists, filters and opens alerts", async ({ page }) => {
  await page.goto("/alerts");
  await expect(visible(page).heading("התראות")).toBeVisible();
  const cards = page.getByTestId("alert-card").filter({ visible: true });
  const overrun = cards.filter({ hasText: "חריגה מהתקציב" });
  await expect(overrun).toHaveCount(1);
  await expect(overrun).toContainText("חמורה");
  await expect(overrun).toContainText(NAME);
  await expect(overrun).toContainText(/היום, \d\d:\d\d/);
  await expect(overrun).toHaveAttribute("data-unread", "true");

  await page.getByRole("link", { name: "לא נקראו", exact: true }).click();
  await expect(page).toHaveURL(/filter=unread/);
  const unreadBefore = await cards.count();
  expect(unreadBefore).toBeGreaterThan(0);

  // A click marks it as read and opens the campaign
  await overrun.click();
  await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}$`));
  expect((await overrunAlerts())[0].read_at).not.toBeNull();

  await page.goto("/alerts?filter=unread");
  await expect(cards).toHaveCount(unreadBefore - 1);
  await expect(page.getByRole("link", { name: "ניהול התראות" })).toHaveAttribute("href", "/settings#alerts");
});

test("an empty alert center", async ({ page }) => {
  await clearAlerts();
  await page.goto("/alerts");
  await expect(visible(page).text("אין התראות. נעדכן כשמשהו ידרוש תשומת לב.")).toBeVisible();
  await page.goto("/alerts?filter=unread");
  await expect(visible(page).text("אין התראות שלא נקראו")).toBeVisible();
});

test("an alert type that is off is not checked", async ({ page }) => {
  const { client, userId } = await signInTestUser("A");
  const off = await client
    .from("alert_settings")
    .upsert({ user_id: userId, alert_type: "budget_overrun", enabled: false, threshold_config: { percent: 0 } }, {
      onConflict: "user_id,alert_type",
    });
  if (off.error) throw off.error;

  await saveWeek(page, "1,000");
  await expect(visible(page).text("נתוני השבוע נשמרו").last()).toBeVisible();
  expect(await overrunAlerts()).toHaveLength(0);

  const on = await client.from("alert_settings").delete().eq("user_id", userId);
  if (on.error) throw on.error;
});

test("an import that goes over budget pops up an alert", async ({ page }) => {
  await clearAlerts();
  const [year, month, day] = thisWeek().split("-");
  const csv = `שם קמפיין,פלטפורמה,תחילת שבוע,הוצאה,לידים,עסקאות,לקוחות חדשים,הכנסות\n${NAME},Meta Ads,${day}/${month}/${year},2000,,,,\n`;
  await page.goto("/imports");
  await expect(visible(page).text("גרור קובץ לכאן או בחר קובץ")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "alerts.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(visible(page).heading("בדיקה")).toBeVisible();
  await page.getByRole("button", { name: "ייבוא שורה אחת" }).filter({ visible: true }).click();
  await expect(visible(page).heading("סיום")).toBeVisible();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "חריגה מהתקציב" })).toBeVisible();
  expect(await overrunAlerts()).toHaveLength(1);
});

test("the bell and the alert center fit a phone screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/alerts");
  await expect(bell(page)).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName(/^התראות, \d+ שלא נקראו$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
