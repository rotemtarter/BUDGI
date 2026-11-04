import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";
import { APP_SCREENS, PUBLIC_SCREENS, thisWeek, waitForScreen } from "./a11y";

// Responsive layout (PRD 5.1, DESIGN.md 1.15, 2.5) in every project: desktop,
// tablet (768px) and mobile. No screen scrolls sideways; wide tables scroll
// inside their own container. Shares test user A.
test.describe.configure({ mode: "serial" });

let campaignId = "";

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await resetUserACampaigns();
  const { client, userId } = await signInTestUser("A");
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: "Responsive Campaign With A Long Name", platform: "linkedin_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  campaignId = campaign.data.id;
  const week = await client.from("campaign_performance").insert({
    user_id: userId,
    campaign_id: campaignId,
    week_start: thisWeek(),
    spend: 123456.78,
    leads: 1234,
    deals: 56,
    new_customers: 40,
    revenue: 987654.32,
  });
  if (week.error) throw week.error;
});

test.afterAll(async () => {
  await resetUserACampaigns();
});

// "" when the page fits; otherwise how far it scrolls and the outermost
// element that sticks out (elements inside a scrolling container are fine)
async function sidewaysScroll(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const overflow = root.scrollWidth - root.clientWidth;
    if (overflow <= 1) return null;
    const width = root.clientWidth;
    const scrolls = (el: Element) => ["auto", "scroll", "hidden"].includes(getComputedStyle(el).overflowX);
    const culprits = [...document.body.querySelectorAll("*")].filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || (box.left >= -1 && box.right <= width + 1)) return false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (scrolls(p)) return false;
      const parent = el.parentElement?.getBoundingClientRect();
      return !parent || parent.left >= -1 && parent.right <= width + 1;
    });
    return { overflow, culprits: culprits.slice(0, 3).map((el) => el.outerHTML.slice(0, 160)) };
  });
  return result ? `${label} scrolls sideways by ${result.overflow}px: ${result.culprits.join(" | ")}` : "";
}

async function expectNoSidewaysScroll(page: Page, label: string) {
  const problem = await sidewaysScroll(page, label);
  expect(problem, problem).toBe("");
}

async function checkAll(page: Page, state: string) {
  const problems: string[] = [];
  for (const [label, path] of APP_SCREENS) {
    await page.goto(path.replace("{campaign}", campaignId));
    await waitForScreen(page);
    const problem = await sidewaysScroll(page, `${label} (${state})`);
    if (problem) problems.push(problem);
  }
  expect(problems, problems.join("\n")).toEqual([]);
}

test("inner screens fit the screen, with the right navigation", async ({ page }) => {
  await checkAll(page, `${page.viewportSize()?.width}px`);

  await page.goto("/dashboard");
  const wide = (page.viewportSize()?.width ?? 0) >= 768;
  await expect(page.getByRole("navigation", { name: "ניווט ראשי" })).toBeVisible({ visible: wide });
  await expect(page.getByRole("button", { name: "פתיחת תפריט ניווט" })).toBeVisible({ visible: !wide });
});

test("inner screens still fit with text enlarged to 200%", async ({ page, isMobile }) => {
  test.skip(isMobile || (page.viewportSize()?.width ?? 0) < 1280, "zoom check from a desktop width");
  // Browser zoom of 200% on a 1280px screen leaves a 640px wide page
  await page.setViewportSize({ width: 640, height: 900 });
  await checkAll(page, "200%");
});

test.describe("without signing in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("public screens fit the screen", async ({ page }) => {
    for (const [label, path] of PUBLIC_SCREENS) {
      await page.goto(path);
      await waitForScreen(page);
      await expectNoSidewaysScroll(page, label);
    }
  });
});
