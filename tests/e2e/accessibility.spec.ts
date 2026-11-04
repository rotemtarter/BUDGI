import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";
import { APP_SCREENS, PUBLIC_SCREENS, expectNoSeriousA11yIssues, seriousA11yIssues, thisWeek, waitForScreen } from "./a11y";

// Accessibility (DESIGN.md 2.5, ARCHITECTURE.md 8.1): axe on every screen,
// with data and empty, open dialogs, and keyboard-only use. Shares test user A.
test.describe.configure({ mode: "serial" });

let campaignId = "";

async function seed() {
  await resetUserACampaigns();
  const { client, userId } = await signInTestUser("A");
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: "A11y Search", platform: "google_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  campaignId = campaign.data.id;
  const week = await client.from("campaign_performance").insert({
    user_id: userId,
    campaign_id: campaignId,
    week_start: thisWeek(),
    spend: 1200,
    leads: 24,
    deals: 3,
    new_customers: 2,
    revenue: 4800,
  });
  if (week.error) throw week.error;

  // One alert of each severity, so the alert center is checked with its badges
  const month = `${thisWeek().slice(0, 7)}-01`;
  const alerts = await client.from("alerts").insert(
    (["critical", "warning", "info"] as const).map((severity, i) => ({
      user_id: userId,
      alert_type: (["budget_overrun", "spend_pace", "goal_reached"] as const)[i],
      severity,
      title: `התראת בדיקה ${i + 1}`,
      description: "תיאור קצר להתראה",
      month,
      dedupe_key: `a11y:${severity}:${month}`,
    })),
  );
  if (alerts.error) throw alerts.error;
}

test.beforeAll(async () => {
  await ensureUserAOnboarded();
});

test.afterAll(async () => {
  await resetUserACampaigns();
});

// Scans every screen and reports all findings together
async function scanAll(page: Page, state: string) {
  const issues: string[] = [];
  for (const [label, path] of APP_SCREENS) {
    if (path.includes("{campaign}") && !campaignId) continue;
    await page.goto(path.replace("{campaign}", campaignId));
    await waitForScreen(page);
    issues.push(...(await seriousA11yIssues(page, `${label} (${state})`)));
  }
  expect(issues, issues.join("\n")).toEqual([]);
}

test("empty screens have no serious accessibility issues", async ({ page }) => {
  await resetUserACampaigns();
  campaignId = "";
  await scanAll(page, "ריק");
});

test("screens with data have no serious accessibility issues", async ({ page }) => {
  await seed();
  await scanAll(page, "עם נתונים");
});

test.describe("without signing in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("public screens have no serious accessibility issues", async ({ page }) => {
    for (const [label, path] of PUBLIC_SCREENS) {
      await page.goto(path);
      await waitForScreen(page);
      await expectNoSeriousA11yIssues(page, label);
    }
  });
});

test("dialogs, the import preview and an Advisor reply have no serious issues", async ({ page, isMobile }) => {
  await page.goto(`/campaigns/${campaignId}`);
  await waitForScreen(page);
  await page.getByRole("button", { name: "הוספת שבוע", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoSeriousA11yIssues(page, "חלונית הוספת שבוע");
  await page.keyboard.press("Escape");

  await page.goto("/settings");
  await waitForScreen(page);
  await page.getByRole("button", { name: "מחיקת החשבון" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expectNoSeriousA11yIssues(page, "חלונית מחיקת חשבון");
  await page.keyboard.press("Escape");

  if (isMobile) {
    await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoSeriousA11yIssues(page, "מגירת ניווט");
    await page.keyboard.press("Escape");
  }

  await page.goto("/imports");
  await waitForScreen(page);
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/imports/valid.csv");
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yIssues(page, "ייבוא — אחרי העלאת קובץ");

  await page.route("**/api/advisor", (route) =>
    route.fulfill({
      json: {
        ok: true,
        remaining: 19,
        reply: {
          answer: "הקמפיין A11y Search מביא לידים במחיר נמוך.",
          recommendations: [
            {
              actionType: "increase",
              campaigns: [{ id: campaignId, name: "A11y Search" }],
              amountIls: 500,
              percentage: 10,
              rationale: "CPL נמוך מהממוצע.",
              expectedImpact: "הערכה: כ-10 לידים נוספים.",
            },
          ],
          limitations: ["הערכה בלבד."],
          missingDataRequest: null,
        },
      },
    }),
  );
  await page.goto("/advisor");
  await waitForScreen(page);
  await page.getByLabel("שאלה ל-Advisor").fill("איפה להגדיל?");
  await page.keyboard.press("Enter");
  await expect(page.getByText("הקמפיין A11y Search מביא לידים במחיר נמוך.").filter({ visible: true })).toBeVisible();
  await expectNoSeriousA11yIssues(page, "Advisor — תשובה");
});

// Visible focus: an outline or a ring (box-shadow) on the focused element
async function focusIsVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    return (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
  });
}

test("keyboard: skip link, navigation with visible focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard on desktop");
  await page.goto("/dashboard");
  await waitForScreen(page);

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "דילוג לתוכן הראשי" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  // Every navigation item is reachable with Tab and shows focus
  await page.goto("/dashboard");
  await waitForScreen(page);
  const nav = page.getByRole("navigation", { name: "ניווט ראשי" });
  const items = await nav.getByRole("link").count();
  let reached = 0;
  for (let i = 0; i < 30 && reached < items; i++) {
    await page.keyboard.press("Tab");
    const inNav = await nav.evaluate((el) => el.contains(document.activeElement));
    if (inNav) {
      expect(await focusIsVisible(page)).toBe(true);
      reached++;
    }
  }
  expect(reached).toBe(items);

  // Enter on a focused item navigates
  await nav.getByRole("link", { name: "הגדרות", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
});

test("keyboard: a week can be added without a mouse", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard on desktop");
  await page.goto(`/campaigns/${campaignId}`);
  await waitForScreen(page);
  await page.getByRole("button", { name: "הוספת שבוע", exact: true }).filter({ visible: true }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // A date field takes its value as one entry; the rest is typed and sent with Enter
  await dialog.getByLabel("שבוע").fill("2026-10-11");
  await dialog.getByLabel("הוצאה").focus();
  await page.keyboard.type("700");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("11.10–17.10").filter({ visible: true })).toBeVisible();
});

test("keyboard: the mobile drawer returns focus to ☰", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile drawer");
  await page.goto("/dashboard");
  await waitForScreen(page);
  const menu = page.getByRole("button", { name: "פתיחת תפריט ניווט" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(menu).toBeFocused();
});
