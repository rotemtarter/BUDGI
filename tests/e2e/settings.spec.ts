import { expect, test } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, signInContext } from "./support";

test.beforeAll(async () => {
  await ensureUserAOnboarded();
});

test("account details and goals are saved", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("פרטי חשבון")).toBeVisible();
  // Wait until the form is interactive (saved values are filled in)
  await expect(page.getByLabel("יעד הכנסות")).not.toHaveValue("");
  await expect(page.getByRole("definition").filter({ hasText: process.env.E2E_USER_A_EMAIL! })).toBeVisible();

  await page.getByLabel("מספר עסקאות").fill("2.5");
  await page.getByRole("button", { name: "שמירת יעדים" }).click();
  await expect(page.getByText("יש להזין מספר שלם")).toBeVisible();

  await page.getByLabel("מספר עסקאות").fill("15");
  await page.getByLabel("מספר לידים").fill("120");
  await page.getByLabel("ROAS מינימלי").fill("2.5");
  await page.getByRole("button", { name: "שמירת יעדים" }).click();
  await expect(page.getByText("היעדים נשמרו")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("מספר עסקאות")).toHaveValue("15");
  await expect(page.getByLabel("מספר לידים")).toHaveValue("120");
  await expect(page.getByLabel("ROAS מינימלי")).toHaveValue("2.5");

  // Emptying a field removes that goal
  await page.getByLabel("מספר לידים").fill("");
  await page.getByRole("button", { name: "שמירת יעדים" }).click();
  await expect(page.getByText("היעדים נשמרו")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("מספר לידים")).toHaveValue("");
});

test("next month starts with a copy of this month's goals", async ({ page }) => {
  await page.goto("/settings");
  const select = page.getByLabel("חודש");
  const options = await select.locator("option").allTextContents();
  // Field values are filled in once the form is interactive
  await expect(page.getByLabel("יעד הכנסות")).not.toHaveValue("");
  const revenue = await page.getByLabel("יעד הכנסות").inputValue();

  await select.selectOption({ index: options.length - 1 });
  await expect(page).toHaveURL(/month=/);
  await expect(page.getByLabel("יעד הכנסות")).toHaveValue(revenue);
});

test("sign out, sign back in, data is still there", async ({ page, context, baseURL }) => {
  // A separate session, so signing out does not end the shared test session
  await signInContext(context, "A", baseURL!);
  await page.goto("/settings");
  await expect(page.getByLabel("מספר עסקאות")).not.toHaveValue("");
  const deals = await page.getByLabel("מספר עסקאות").inputValue();

  await page.getByRole("button", { name: "התנתקות" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);

  await signInContext(context, "A", baseURL!);
  await page.goto("/settings");
  await expect(page.getByLabel("מספר עסקאות")).toHaveValue(deals);
});

test("a business name replaces the Google name at the top, until it is emptied", async ({ page, isMobile }) => {
  const { client, userId } = await signInTestUser("A");
  await client.from("profiles").update({ business_name: null }).eq("id", userId);

  // Desktop: the header; mobile: the top of the navigation drawer
  const expectAccount = async (text: string | RegExp, icon: "icon-business" | "icon-user") => {
    if (isMobile) await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();
    const name = page.getByTestId("header-user-name").filter({ visible: true });
    if (typeof text === "string") await expect(name).toHaveText(text);
    else await expect(name).not.toHaveText(text);
    await expect(page.getByTestId(icon).filter({ visible: true })).toBeVisible();
    if (isMobile) await page.keyboard.press("Escape");
  };

  await page.goto("/settings");
  const field = page.getByLabel("שם בית העסק");
  await expect(field).toHaveValue("");
  await expectAccount(/מאפיית רותם/, "icon-user");

  await field.fill("  מאפיית רותם  ");
  await page.getByRole("button", { name: "שמירה", exact: true }).click();
  await expect(page.getByText("שם בית העסק נשמר")).toBeVisible();
  await expectAccount("מאפיית רותם", "icon-business");

  // Kept on every screen and after a reload
  await page.goto("/campaigns");
  await expectAccount("מאפיית רותם", "icon-business");

  // Emptying it brings the Google name back
  await page.goto("/settings");
  await expect(field).toHaveValue("מאפיית רותם");
  await field.fill("");
  await page.getByRole("button", { name: "שמירה", exact: true }).click();
  await expect(page.getByText("יוצג השם מחשבון Google")).toBeVisible();
  await expectAccount(/מאפיית רותם/, "icon-user");
});

test("legal pages and the danger zone are on the settings screen", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("מחיקת חשבון", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "מחיקת החשבון" })).toBeVisible();
  await page.getByRole("link", { name: "מדיניות פרטיות" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.goto("/settings");
  await page.getByRole("link", { name: "תנאי שימוש" }).click();
  await expect(page).toHaveURL(/\/terms$/);
});
