import { expect, test } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// Edge cases not covered by the other specs (MILESTONES 9; DESIGN.md 1.14).
// Invalid import files are in imports.spec.ts; OpenAI failures in
// advisor.spec.ts and the unit tests.
test.beforeAll(async () => {
  await ensureUserAOnboarded();
});

const visibleText = (page: import("@playwright/test").Page, text: string) =>
  page.getByText(text).filter({ visible: true });

test("an address that does not exist shows a Hebrew 'not found' page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "הדף לא נמצא" })).toBeVisible();
  await page.getByRole("link", { name: "חזרה למסך הבית" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a campaign that does not exist, or of another user, is 'not found'", async ({ page }) => {
  await page.goto("/campaigns/not-a-uuid");
  await expect(page.getByRole("heading", { name: "הדף לא נמצא" }).filter({ visible: true })).toBeVisible();

  const b = await signInTestUser("B");
  const created = await b.client
    .from("campaigns")
    .insert({ user_id: b.userId, name: "B private campaign", platform: "tiktok_ads" })
    .select("id")
    .single();
  if (created.error) throw created.error;
  try {
    await page.goto(`/campaigns/${created.data.id}`);
    await expect(page.getByRole("heading", { name: "הדף לא נמצא" }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("B private campaign")).toHaveCount(0);
  } finally {
    await b.client.from("campaigns").delete().eq("id", created.data.id);
  }
});

test("invalid period values in the address fall back to the current month", async ({ page }) => {
  await resetUserACampaigns();
  for (const path of [
    "/dashboard?period=month&value=abc",
    "/dashboard?period=week&value=2026-13-45",
    "/metrics?period=year&value=2099-01",
    "/budget?month=not-a-month",
    "/forecast?month=2099-01-01",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "לא הצלחנו לטעון את המסך" })).toHaveCount(0);
  }
});

test("Advisor server errors show Hebrew messages", async ({ page }) => {
  const { client, userId } = await signInTestUser("A");
  await resetUserACampaigns();
  const campaign = await client
    .from("campaigns")
    .insert({ user_id: userId, name: "Edge Campaign", platform: "meta_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  await client.from("campaign_performance").insert({
    user_id: userId,
    campaign_id: campaign.data.id,
    week_start: "2026-10-04",
    spend: 100,
  });

  const responses = [
    [500, { ok: false, message: "לא הצלחנו לקבל תשובה כרגע. נסה שוב." }],
    [409, { ok: false, message: "יש שאלה אחרת בטיפול. חכה לתשובה ונסה שוב." }],
  ] as const;
  let calls = 0;
  await page.route("**/api/advisor", async (route) => {
    const [status, json] = responses[Math.min(calls++, responses.length - 1)];
    await route.fulfill({ status, json });
  });

  await page.goto("/advisor");
  await page.getByLabel("שאלה ל-Advisor").fill("שאלה ראשונה");
  await page.keyboard.press("Enter");
  await expect(visibleText(page, "לא הצלחנו לקבל תשובה כרגע. נסה שוב.").first()).toBeVisible();

  // A busy answer (another question in progress) is shown the same way, with "נסה שוב"
  await page.getByLabel("שאלה ל-Advisor").fill("שאלה שנייה");
  await page.keyboard.press("Enter");
  await expect(visibleText(page, "לא הצלחנו לקבל תשובה כרגע. נסה שוב.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "נסה שוב" }).filter({ visible: true })).toHaveCount(2);

  await resetUserACampaigns();
});
