import { expect, test, type Page } from "@playwright/test";
import { formatMoney } from "@/lib/currency/format";
import { addMonths, currentMonth } from "@/lib/dates/month";
import { weeksInMonth } from "@/lib/dates/period";
import { formatPercent } from "@/lib/format/numbers";
import { monthForecast } from "@/server/services/forecast";
import type { WeekRow } from "@/server/services/metrics";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// Forecast screen (DESIGN.md 1.8). An ended month (October 2025) with known
// values, and the current month, whose expected values come from the same
// Forecast Service as the screen (the current month depends on today's date).
test.describe.configure({ mode: "serial" });

const ENDED = "2025-10-01";
const NOW = currentMonth();
const PAST_MONTHS = ["2025-09-01", ENDED, "2025-11-01"];
const VALUES = { spend: 700, revenue: 2100, leads: 10, deals: 2 };
const CURRENT_GOALS = { revenue: 20000, deals: 9, leads: null, min_roas: 2 } as const;

let campaignId = "";
let savedGoals: { goal_type: string; target_value: number | null }[] = [];

async function client() {
  return signInTestUser("A");
}

async function insertWeeks(weekStarts: string[], values = VALUES) {
  const { client: c, userId } = await client();
  const { error } = await c
    .from("campaign_performance")
    .insert(weekStarts.map((week_start) => ({ user_id: userId, campaign_id: campaignId, week_start, ...values })));
  if (error) throw error;
}

async function deleteWeeks(from: string) {
  const { client: c } = await client();
  const { error } = await c.from("campaign_performance").delete().eq("campaign_id", campaignId).gte("week_start", from);
  if (error) throw error;
}

async function cleanPastMonths() {
  const { client: c, userId } = await client();
  for (const table of ["budgets", "business_goals"] as const) {
    const { error } = await c.from(table).delete().eq("user_id", userId).in("month", PAST_MONTHS);
    if (error) throw error;
  }
}

async function setCurrentGoals(goals: { goal_type: string; target_value: number | null }[]) {
  const { client: c, userId } = await client();
  const { error } = await c
    .from("business_goals")
    .upsert(goals.map((g) => ({ user_id: userId, month: NOW, ...g })), { onConflict: "user_id,month,goal_type" });
  if (error) throw error;
}

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await resetUserACampaigns();
  await cleanPastMonths();
  const { client: c, userId } = await client();

  const { data: campaign, error } = await c
    .from("campaigns")
    .insert({ user_id: userId, name: "Forecast Meta", platform: "meta_ads" })
    .select("id")
    .single();
  if (error) throw error;
  campaignId = campaign.id;

  // October 2025: 5.10 and 12.10 → spend 1,400, revenue 4,200, deals 4
  await insertWeeks(["2025-10-05", "2025-10-12"]);
  for (const result of await Promise.all([
    c.from("budgets").insert({ user_id: userId, month: ENDED, planned_amount: 2000 }),
    c.from("business_goals").insert([
      { user_id: userId, month: ENDED, goal_type: "revenue", target_value: 8400 },
      { user_id: userId, month: ENDED, goal_type: "deals", target_value: 8 },
    ]),
  ])) {
    if (result.error) throw result.error;
  }

  // Keep the current month's goals to put them back afterwards
  await c.rpc("ensure_month_defaults", { p_month: NOW });
  const goals = await c.from("business_goals").select("goal_type, target_value").eq("month", NOW);
  if (goals.error) throw goals.error;
  savedGoals = goals.data;
  await setCurrentGoals(Object.entries(CURRENT_GOALS).map(([goal_type, target_value]) => ({ goal_type, target_value })));
});

test.afterAll(async () => {
  await resetUserACampaigns();
  await cleanPastMonths();
  if (savedGoals.length > 0) await setCurrentGoals(savedGoals);
});

async function untilUrl(page: Page, url: RegExp, action: () => Promise<unknown>) {
  await expect(async () => {
    await action();
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass({ timeout: 15_000 });
}

const text = (page: Page, value: string | RegExp) => page.getByText(value).filter({ visible: true });
const money = (value: number | null) => formatMoney(value, { whole: true });
const rows = (weekStarts: string[]): WeekRow[] =>
  weekStarts.map((week_start) => ({ week_start, new_customers: null, ...VALUES }));

test("an ended month shows actual values only", async ({ page }) => {
  await page.goto(`/forecast?month=${ENDED}`);
  const cards = page.getByRole("region", { name: "תחזית החודש" });
  await expect(cards).toContainText("הוצאות בפועל");
  await expect(cards).toContainText("₪1,400");
  await expect(cards).toContainText("₪4,200");
  await expect(cards).toContainText("תקציב: ₪2,000");
  await expect(cards).toContainText("התקדמות ליעד");
  await expect(cards).toContainText("50%");
  await expect(page.getByRole("region", { name: "יעדים נוספים" })).toContainText("עסקאות בפועל");
  await expect(page.getByRole("region", { name: "יעדים נוספים" })).toContainText("50% מהיעד");
  await expect(page.getByRole("region", { name: "על מה מבוססת התחזית" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /^הכנסות מול הוצאות: גרף שבועי של הכנסות והוצאות\./ })).toBeVisible();
  await expect(text(page, "צפויות")).toHaveCount(0);
});

test("an ended month without data shows the empty state", async ({ page }) => {
  await page.goto("/forecast?month=2025-11-01");
  await expect(text(page, "עוד אין נתונים לתקופה הזו")).toBeVisible();
});

test("the current month with fewer than 7 days of data", async ({ page }) => {
  await page.goto("/forecast");
  await expect(text(page, "אין עדיין מספיק נתונים לתחזית לחודש הזה")).toBeVisible();
  await expect(text(page, "הזן לפחות שבוע אחד של נתונים.")).toBeVisible();
  await expect(page.getByRole("link", { name: "לקמפיינים" }).filter({ visible: true }).last()).toBeVisible();
  await expect(page.getByRole("region", { name: "תחזית החודש" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /הכנסות מול הוצאות/ })).toHaveCount(0);
});

test("the current month: forecast by the month's pace", async ({ page }) => {
  const weeks = weeksInMonth(NOW).slice(0, 2);
  await insertWeeks(weeks);
  const expected = monthForecast(rows(weeks), NOW, { ended: false });

  await page.goto("/forecast");
  const cards = page.getByRole("region", { name: "תחזית החודש" });
  await expect(cards).toContainText("הוצאות צפויות");
  await expect(cards).toContainText(money(expected.spend.forecast));
  await expect(cards).toContainText(`בפועל עד כה: ${money(expected.spend.actual)}`);
  await expect(cards).toContainText(money(expected.revenue.forecast));
  await expect(cards).toContainText(formatPercent((expected.revenue.forecast! / CURRENT_GOALS.revenue) * 100));

  // Deals and ROAS goals are set; leads are not
  const goals = page.getByRole("region", { name: "יעדים נוספים" });
  await expect(goals).toContainText("עסקאות צפויות");
  await expect(goals).toContainText("ROAS צפוי");
  await expect(goals).not.toContainText("לידים");

  const basis = page.getByRole("region", { name: "על מה מבוססת התחזית" });
  await expect(basis).toContainText("התחזית לפי קצב החודש");
  await expect(basis).not.toContainText("ממוצע החודשים הקודמים");
  await expect(basis).toContainText("התחזית היא הערכה ולא הבטחה.");
  await expect(page.getByRole("img", { name: /הכנסות מול הוצאות \(תחזית\)/ })).toBeVisible();
});

test("the current month: with two complete previous months, the history is weighed in", async ({ page }) => {
  const history = [...weeksInMonth(addMonths(NOW, -2)), ...weeksInMonth(addMonths(NOW, -1))];
  const unique = [...new Set(history)].filter((w) => !weeksInMonth(NOW).slice(0, 2).includes(w));
  await insertWeeks(unique);
  const weeks = [...new Set([...unique, ...weeksInMonth(NOW).slice(0, 2)])];
  const expected = monthForecast(rows(weeks), NOW, { ended: false });
  expect(expected.spend.basis).toBe("pace_and_history");

  await page.goto("/forecast");
  await expect(page.getByRole("region", { name: "על מה מבוססת התחזית" })).toContainText(
    "התחזית לפי קצב החודש וממוצע החודשים הקודמים",
  );
  await expect(page.getByRole("region", { name: "תחזית החודש" })).toContainText(money(expected.spend.forecast));

  await deleteWeeks(addMonths(NOW, -3));
});

test("the month picker and invalid months", async ({ page }) => {
  await page.goto("/forecast");
  await untilUrl(page, /month=2025-10-01/, () => page.getByLabel("חודש", { exact: true }).selectOption(ENDED));
  await expect(page.getByRole("region", { name: "תחזית החודש" })).toContainText("הוצאות בפועל");

  for (const month of [addMonths(NOW, 1), "2025-13-01", "nonsense"]) {
    await page.goto(`/forecast?month=${month}`);
    await expect(page.getByLabel("חודש", { exact: true })).toHaveValue(NOW);
  }
});

test("the forecast screen fits a phone without sideways page scrolling", async ({ page }) => {
  await insertWeeks(weeksInMonth(NOW).slice(0, 2));
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/forecast", `/forecast?month=${ENDED}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await deleteWeeks(addMonths(NOW, -3));
});
