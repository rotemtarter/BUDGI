import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";
import { thisWeek } from "./a11y";

// The home screen overview (DESIGN.md 1.3): progress to every goal, the
// month-end forecast, the latest alerts and the latest saved insights.
// Shares test user A.
test.describe.configure({ mode: "serial" });

const SCREENSHOTS = process.env.HOME_SCREENSHOTS;

function israelMonth() {
  return `${thisWeek().slice(0, 7)}-01`;
}

async function clearInsights() {
  const { client, userId } = await signInTestUser("A");
  const { error } = await client.from("advisor_insights").delete().eq("user_id", userId);
  if (error) throw error;
}

async function seed() {
  await resetUserACampaigns();
  await clearInsights();
  const { client, userId } = await signInTestUser("A");
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit" })
    .format(new Date())
    .concat("-01");

  // Goals for the current month: revenue, deals and leads; no minimum ROAS
  for (const [goal_type, target_value] of [
    ["revenue", 20000],
    ["deals", 10],
    ["leads", 100],
    ["min_roas", null],
  ] as const) {
    const { error } = await client
      .from("business_goals")
      .upsert({ user_id: userId, month, goal_type, target_value }, { onConflict: "user_id,month,goal_type" });
    if (error) throw error;
  }

  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: "Overview Search", platform: "google_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  const week = await client.from("campaign_performance").insert({
    user_id: userId,
    campaign_id: campaign.data.id,
    week_start: thisWeek(),
    spend: 2000,
    leads: 40,
    deals: 4,
    revenue: 8000,
  });
  if (week.error) throw week.error;

  const alerts = await client.from("alerts").insert(
    [1, 2, 3, 4].map((i) => ({
      user_id: userId,
      alert_type: "spend_pace",
      severity: i === 4 ? "critical" : "warning",
      title: `התראת סקירה ${i}`,
      description: "תיאור",
      month: israelMonth(),
      dedupe_key: `overview:${i}`,
      // The 4th is the newest
      created_at: new Date(Date.now() - (5 - i) * 60_000).toISOString(),
    })),
  );
  if (alerts.error) throw alerts.error;

  const insight = await client.from("advisor_insights").insert({
    user_id: userId,
    question: "איפה כדאי להגדיל תקציב?",
    reply: { answer: "הקמפיין Overview Search רווחי.", recommendations: [], limitations: [], missingDataRequest: null },
  });
  if (insight.error) throw insight.error;
}

const visible = (page: Page) => ({
  region: (name: string) => page.getByRole("region", { name }).filter({ visible: true }),
});

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await seed();
});

test.afterAll(async () => {
  await resetUserACampaigns();
  await clearInsights();
});

test("home shows every goal, the forecast, the latest alerts and insights", async ({ page }, info) => {
  await page.goto("/dashboard");

  const goals = visible(page).region("התקדמות ליעדים");
  await expect(goals.getByRole("progressbar")).toHaveCount(3);
  await expect(goals.getByRole("progressbar", { name: "התקדמות ליעד העסקאות" })).toBeVisible();
  await expect(goals.getByRole("progressbar", { name: "התקדמות ליעד הלידים" })).toBeVisible();
  await expect(goals.getByText("ROAS מינימלי")).toHaveCount(0);
  await expect(goals.getByRole("link", { name: "עריכת יעדים" })).toHaveAttribute("href", "/settings");

  const forecast = visible(page).region("תחזית לסוף החודש");
  await expect(forecast).toBeVisible();
  await expect(forecast.getByRole("link", { name: "לתחזית המלאה" })).toHaveAttribute("href", "/forecast");

  const alerts = visible(page).region("התראות אחרונות");
  await expect(alerts.getByRole("listitem")).toHaveCount(3);
  await expect(alerts.getByRole("listitem").first()).toContainText("התראת סקירה 4");
  await expect(alerts.getByText("התראת סקירה 1")).toHaveCount(0);
  await expect(alerts.getByText("לא נקראה").first()).toBeAttached();

  const insights = visible(page).region("תובנות AI שמורות");
  await expect(insights.getByText("איפה כדאי להגדיל תקציב?")).toBeVisible();
  await expect(insights.getByText("הקמפיין Overview Search רווחי.")).toBeVisible();
  await insights.getByRole("link", { name: "לכל התובנות" }).click();
  await expect(page).toHaveURL(/\/advisor$/);

  if (SCREENSHOTS) {
    await page.goto("/dashboard");
    await expect(visible(page).region("התקדמות ליעדים")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/home-${info.project.name}.png`, fullPage: true });
  }
});

test("a past month has goals but no forecast; a week has neither", async ({ page }) => {
  const month = israelMonth();
  const [y, m] = month.split("-").map(Number);
  const previous = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

  await page.goto(`/dashboard?period=month&value=${previous}`);
  // No data that month: only the latest alerts and insights
  await expect(visible(page).region("תחזית לסוף החודש")).toHaveCount(0);
  await expect(visible(page).region("התראות אחרונות")).toBeVisible();
  await expect(visible(page).region("תובנות AI שמורות")).toBeVisible();

  await page.goto(`/dashboard?period=week&value=${thisWeek()}`);
  await expect(visible(page).region("התקדמות ליעדים")).toHaveCount(0);
  await expect(visible(page).region("תחזית לסוף החודש")).toHaveCount(0);
  await expect(visible(page).region("התראות אחרונות")).toBeVisible();
});
