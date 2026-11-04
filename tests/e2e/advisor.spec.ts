import { expect, test, type Page, type Route } from "@playwright/test";
import type { AdvisorResponse } from "@/lib/advisor/schema";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

async function clearInsights() {
  const { client, userId } = await signInTestUser("A");
  const { error } = await client.from("advisor_insights").delete().eq("user_id", userId);
  if (error) throw error;
}

// AI Budget Advisor screen (PRD 4.7; DESIGN.md 1.12). /api/advisor is replaced
// with fixed answers, so the tests never call OpenAI and do not use test user
// A's daily questions. The server side is covered by the unit and integration
// tests. The tests run in order and share test user A's data.
test.describe.configure({ mode: "serial" });

const NAME = "Advisor Search";

function israelToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function thisWeek() {
  const date = new Date(`${israelToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

// One campaign with this week's data, so the account "has data"
async function seed() {
  await resetUserACampaigns();
  const { client, userId } = await signInTestUser("A");
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: NAME, platform: "google_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  const week = await client.from("campaign_performance").insert({
    user_id: userId,
    campaign_id: campaign.data.id,
    week_start: thisWeek(),
    spend: 1000,
    leads: 20,
  });
  if (week.error) throw week.error;
}

const REPLY: AdvisorResponse = {
  ok: true,
  remaining: 17,
  reply: {
    answer: "הקמפיין Advisor Search מביא לידים במחיר נמוך מהממוצע.",
    recommendations: [
      {
        actionType: "increase",
        campaigns: [{ id: "c1", name: NAME }],
        amountIls: 1500,
        percentage: 15,
        rationale: "ה-CPL שלו נמוך מהממוצע בחשבון.",
        expectedImpact: "הערכה: כ-30 לידים נוספים החודש.",
      },
    ],
    limitations: ["לא הוזנו עסקאות, ולכן אין נתוני Cost per Deal."],
    missingDataRequest: null,
  },
};

const MISSING: AdvisorResponse = {
  ok: true,
  remaining: 16,
  reply: {
    answer: "אין מספיק נתונים כדי לענות על השאלה.",
    recommendations: [],
    limitations: [],
    missingDataRequest: "יש להזין הכנסות לקמפיינים כדי לבדוק את יעד ההכנסות.",
  },
};

const FAILED: AdvisorResponse = { ok: false, message: "לא הצלחנו לקבל תשובה כרגע. נסה שוב." };
const LIMIT: AdvisorResponse = { ok: false, limit: true, remaining: 0, message: "ניצלת את 20 השאלות להיום. אפשר לשאול שוב מחר." };

// Answers the next requests in order; a short delay shows the loading card
async function answerWith(page: Page, ...responses: [number, AdvisorResponse][]) {
  const bodies: unknown[] = [];
  await page.route("**/api/advisor", async (route: Route) => {
    bodies.push(route.request().postDataJSON());
    const [status, body] = responses.shift() ?? [500, FAILED];
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status, json: body });
  });
  return bodies;
}

function visible(page: Page) {
  return {
    heading: (name: string | RegExp) => page.getByRole("heading", { name }).filter({ visible: true }),
    button: (name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }),
    link: (name: string) => page.getByRole("link", { name, exact: true }).filter({ visible: true }),
    text: (text: string | RegExp) => page.getByText(text).filter({ visible: true }),
  };
}

const input = (page: Page) => page.getByLabel("שאלה ל-Advisor");

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await clearInsights();
  await seed();
});

test.afterAll(async () => {
  await clearInsights();
  await resetUserACampaigns();
});

test("the opening state shows the suggestions, the counter and the notice", async ({ page, isMobile }) => {
  await page.goto("/advisor");
  await expect(visible(page).heading(/^AI Budget$/)).toBeVisible();
  await expect(visible(page).text(/שאל על התקציב והקמפיינים שלך/)).toBeVisible();
  await expect(visible(page).text(/מתוך 20 שאלות היום/)).toBeVisible();
  for (const q of ["איפה כדאי להגדיל תקציב החודש?", "איזה קמפיין הכי פחות יעיל?", "האם אעמוד ביעד ההכנסות?"]) {
    await expect(visible(page).button(q)).toBeVisible();
  }
  await expect(visible(page).text(/השיחה אינה נשמרת ותימחק ביציאה מהמסך/)).toBeVisible();
  // "AI Budget" is marked in the sidebar, or on mobile in the drawer
  if (isMobile) await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();
  await expect(visible(page).link("AI Budget")).toHaveAttribute("aria-current", "page");
});

test("a suggested question gets an answer with a recommendation card", async ({ page }) => {
  const bodies = await answerWith(page, [200, REPLY]);
  await page.goto("/advisor");
  await visible(page).button("איפה כדאי להגדיל תקציב החודש?").click();

  await expect(visible(page).text("איפה כדאי להגדיל תקציב החודש?")).toBeVisible();
  await expect(page.getByLabel("ממתין לתשובה")).toBeVisible();
  await expect(input(page)).toBeDisabled();

  const answer = page.getByRole("group", { name: "תשובת ה-Advisor" });
  await expect(answer.getByText(REPLY.ok ? REPLY.reply.answer : "")).toBeVisible();
  const card = answer.getByRole("list", { name: "המלצות" }).getByRole("listitem");
  await expect(card.getByText("הגדלה")).toBeVisible();
  await expect(card.getByText(NAME)).toBeVisible();
  await expect(card).toContainText("₪1,500");
  await expect(card).toContainText("15%");
  await expect(card).toContainText("למה: ה-CPL שלו נמוך מהממוצע בחשבון.");
  await expect(card).toContainText("השפעה צפויה: הערכה: כ-30 לידים נוספים החודש.");
  await expect(answer.getByRole("region", { name: "הסתייגויות" })).toContainText("לא הוזנו עסקאות");
  await expect(visible(page).text(/נותרו 17 מתוך 20 שאלות היום/)).toBeVisible();
  await expect(input(page)).toBeEnabled();
  expect(bodies[0]).toEqual({ question: "איפה כדאי להגדיל תקציב החודש?", history: [] });
});

test("a typed follow-up sends the conversation; missing data links to entry and import", async ({ page }) => {
  const bodies = await answerWith(page, [200, REPLY], [200, MISSING]);
  await page.goto("/advisor");
  await input(page).fill("איזה קמפיין הכי יעיל?");
  await input(page).press("Enter");
  await expect(page.getByRole("group", { name: "תשובת ה-Advisor" })).toBeVisible();

  await input(page).fill("האם אעמוד ביעד?");
  await visible(page).button("שליחה").click();
  const missing = page.getByRole("region", { name: "חסרים נתונים" });
  await expect(missing).toContainText("יש להזין הכנסות לקמפיינים");
  // "להזנת נתונים" opens the list of campaigns; each opens its details screen
  await missing.getByRole("button", { name: "להזנת נתונים" }).click();
  await expect(page.getByRole("list", { name: "קמפיינים" }).getByRole("link", { name: NAME })).toHaveAttribute(
    "href",
    /^\/campaigns\/[0-9a-f-]{36}$/,
  );
  await page.keyboard.press("Escape");
  await expect(missing.getByRole("link", { name: "לייבוא" })).toHaveAttribute("href", "/imports");

  expect(bodies[1]).toEqual({
    question: "האם אעמוד ביעד?",
    history: [
      { role: "user", content: "איזה קמפיין הכי יעיל?" },
      { role: "assistant", content: REPLY.ok ? REPLY.reply.answer : "" },
    ],
  });
});

test("an error shows a retry button that asks the same question again", async ({ page }) => {
  const bodies = await answerWith(page, [502, FAILED], [200, REPLY]);
  await page.goto("/advisor");
  const before = await visible(page).text(/מתוך 20 שאלות היום/).textContent();
  await input(page).fill("למה ה-ROAS ירד?");
  await input(page).press("Enter");

  await expect(visible(page).text("לא הצלחנו לקבל תשובה כרגע. נסה שוב.")).toBeVisible();
  // A failed question is not counted
  await expect(visible(page).text(/מתוך 20 שאלות היום/)).toHaveText(before!);

  await visible(page).button("נסה שוב").click();
  await expect(page.getByRole("group", { name: "תשובת ה-Advisor" })).toBeVisible();
  await expect(visible(page).text("לא הצלחנו לקבל תשובה כרגע. נסה שוב.")).toHaveCount(0);
  await expect(visible(page).text("למה ה-ROAS ירד?")).toHaveCount(1);
  expect(bodies.map((b) => (b as { question: string }).question)).toEqual(["למה ה-ROAS ירד?", "למה ה-ROAS ירד?"]);
});

test("the daily limit disables the input", async ({ page }) => {
  await answerWith(page, [429, LIMIT]);
  await page.goto("/advisor");
  await input(page).fill("עוד שאלה");
  await input(page).press("Enter");
  await expect(visible(page).text("ניצלת את 20 השאלות להיום. אפשר לשאול שוב מחר.")).toBeVisible();
  await expect(input(page)).toBeDisabled();
  await expect(visible(page).text(/נותרו 0 מתוך 20 שאלות היום/)).toBeVisible();
});

test("refreshing the screen clears the conversation", async ({ page }) => {
  await answerWith(page, [200, REPLY]);
  await page.goto("/advisor");
  await visible(page).button("איזה קמפיין הכי פחות יעיל?").click();
  await expect(page.getByRole("group", { name: "תשובת ה-Advisor" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "תשובת ה-Advisor" })).toHaveCount(0);
  await expect(visible(page).button("איזה קמפיין הכי פחות יעיל?")).toBeVisible();
});

test("an answer can be saved as an insight, stays after a refresh and can be deleted", async ({ page }) => {
  await answerWith(page, [200, REPLY]);
  await page.goto("/advisor");
  await expect(visible(page).text(/^תובנות שמורות/)).toHaveCount(0);
  await visible(page).button("איזה קמפיין הכי פחות יעיל?").click();

  const answer = page.getByRole("group", { name: "תשובת ה-Advisor" });
  await answer.getByRole("button", { name: "שמור תובנה" }).click();
  await expect(visible(page).text("התובנה נשמרה")).toBeVisible();
  await expect(answer.getByRole("button", { name: "נשמרה" })).toBeDisabled();
  await expect(visible(page).text("תובנות שמורות (1)")).toBeVisible();

  // The conversation is gone after a refresh; the insight is not
  await page.reload();
  await expect(page.getByRole("group", { name: "תשובת ה-Advisor" })).toHaveCount(0);
  await visible(page).text("תובנות שמורות (1)").click();
  const insight = page.getByRole("article", { name: "תובנה: איזה קמפיין הכי פחות יעיל?" });
  await expect(insight).toBeVisible();
  await expect(insight).toContainText(/נשמרה ב-\d{2}\/\d{2}\/\d{4}/);
  await expect(insight).toContainText(REPLY.ok ? REPLY.reply.answer : "");
  await expect(insight.getByRole("list", { name: "המלצות" })).toContainText("₪1,500");
  await expect(insight.getByRole("region", { name: "הסתייגויות" })).toBeVisible();

  await insight.getByRole("button", { name: /^מחיקת התובנה/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await expect(visible(page).text("התובנה נמחקה")).toBeVisible();
  await expect(visible(page).text(/^תובנות שמורות/)).toHaveCount(0);
  await page.reload();
  await expect(visible(page).text(/^תובנות שמורות/)).toHaveCount(0);
});

test("an account without data points to its campaigns, a new campaign and import", async ({ page }) => {
  const main = page.locator("main");
  await resetUserACampaigns();
  await page.goto("/advisor");
  await expect(visible(page).heading("עוד אין נתונים בחשבון")).toBeVisible();
  // No campaigns yet
  await expect(main.getByRole("link", { name: "קמפיין חדש" })).toHaveAttribute("href", "/campaigns/new");
  await expect(main.getByRole("link", { name: "ייבוא נתונים" })).toHaveAttribute("href", "/imports");
  await expect(visible(page).button("איפה כדאי להגדיל תקציב החודש?")).toHaveCount(0);
  await expect(input(page)).toBeEnabled();

  // A campaign without weekly data: pick it to enter data
  const { client, userId } = await signInTestUser("A");
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: "Advisor Empty", platform: "meta_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  await page.reload();
  await expect(visible(page).heading("עוד אין נתונים בחשבון")).toBeVisible();
  await main.getByRole("button", { name: "קמפיינים" }).click();
  await page.getByRole("list", { name: "קמפיינים" }).getByRole("link", { name: "Advisor Empty" }).click();
  await expect(page).toHaveURL(`/campaigns/${campaign.data.id}`);
  await seed();
});
