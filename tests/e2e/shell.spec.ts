import { expect, test } from "@playwright/test";
import { ensureUserAOnboarded } from "./support";

test.beforeAll(async () => {
  await ensureUserAOnboarded();
});

const ITEMS = [
  ["בית", "/dashboard"],
  ["קמפיינים", "/campaigns"],
  ["תקציב", "/budget"],
  ["מדדים", "/metrics"],
  ["תחזית", "/forecast"],
  ["AI Advisor", "/advisor"],
  ["התראות", "/alerts"],
  ["ייבוא נתונים", "/imports"],
  ["הגדרות", "/settings"],
] as const;

test("navigation works on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop sidebar");
  await page.goto("/dashboard");

  const nav = page.getByRole("navigation", { name: "ניווט ראשי" });
  await expect(nav.getByRole("link")).toHaveText(ITEMS.map(([label]) => label));

  for (const [label, path] of ITEMS) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }

  // Screens from later milestones show "coming soon"
  await nav.getByRole("link", { name: "AI Advisor", exact: true }).click();
  await expect(page.getByRole("heading", { name: "AI Budget Advisor" }).filter({ visible: true })).toBeVisible();
  // Previously visited pages stay in the DOM (hidden), so look at the visible one
  await expect(page.getByText("המסך הזה ייבנה בקרוב.").filter({ visible: true })).toBeVisible();
});

test("navigation drawer works on mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile drawer");
  await page.goto("/dashboard");

  // The sidebar is hidden; the ☰ button opens the same navigation
  await expect(page.getByRole("navigation", { name: "ניווט ראשי" })).toBeHidden();
  await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "הגדרות", exact: true }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("heading", { name: "הגדרות" })).toBeVisible();

  // Escape closes the drawer too
  await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("header shows the bell and the user name", async ({ page, isMobile }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "התראות" }).first()).toBeVisible();
  if (!isMobile) await expect(page.getByTestId("header-user-name")).not.toBeEmpty();
});
