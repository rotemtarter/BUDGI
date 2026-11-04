import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// axe check for WCAG 2.0 A/AA (DESIGN.md 2.5, ARCHITECTURE.md 8.1). Fails on
// serious and critical findings; the message lists each rule and element.
export async function seriousA11yIssues(page: Page, label: string) {
  // Colors are measured after open/close animations (fade) have finished
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${label} — ${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(" ")} ${n.html.slice(0, 120)}`).join(", ")}`);
}

export async function expectNoSeriousA11yIssues(page: Page, label: string) {
  const serious = await seriousA11yIssues(page, label);
  expect(serious, serious.join("\n")).toEqual([]);
}

// Screens inside the Shell. `{campaign}` is replaced with a real campaign id.
export const APP_SCREENS = [
  ["בית — חודש", "/dashboard"],
  ["בית — שבוע", "/dashboard?period=week"],
  ["קמפיינים", "/campaigns?status=all"],
  ["קמפיין חדש", "/campaigns/new"],
  ["פרטי קמפיין", "/campaigns/{campaign}"],
  ["תקציב", "/budget"],
  ["תקציב — קמפיינים", "/budget?tab=campaigns"],
  ["מדדים", "/metrics"],
  ["תחזית", "/forecast"],
  ["AI Budget", "/advisor"],
  ["התראות", "/alerts"],
  ["ייבוא נתונים", "/imports"],
  ["הגדרות", "/settings"],
] as const;

export const PUBLIC_SCREENS = [
  ["התחברות", "/login"],
  ["תנאי שימוש", "/terms"],
  ["מדיניות פרטיות", "/privacy"],
] as const;

// Waits for the screen's content (not the loading skeleton)
export async function waitForScreen(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}

function israelToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export function thisWeek() {
  const date = new Date(`${israelToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}
