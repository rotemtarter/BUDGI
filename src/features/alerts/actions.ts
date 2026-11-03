"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertHref } from "@/lib/alerts/links";
import { ALERT_TYPES, type AlertSettings } from "@/lib/alerts/types";
import { alertSettingsSchema, type AlertSettingsInput } from "@/lib/validation/alert-settings";
import { requireOnboardedUser } from "@/server/auth/session";
import { getAlert, markAlertRead, saveAlertSettings } from "@/server/repositories/alerts";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

// Settings screen, alerts area (DESIGN.md 1.10). Changing the settings does
// not run the alert check (PRD 4.6 lists data, budget and goal saves only).
export async function saveAlertSettingsAction(input: AlertSettingsInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = alertSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "יש לתקן את השדות המסומנים" };

  const settings = Object.fromEntries(ALERT_TYPES.map((type) => [type, parsed.data[type]])) as AlertSettings;
  try {
    await saveAlertSettings(user.id, settings);
  } catch (error) {
    console.error("saveAlertSettings failed", { code: (error as { code?: string }).code });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  return { ok: true };
}

// Alert card or pop-up "לפרטים": marks the alert as read and opens its context
export async function openAlertAction(id: string): Promise<FormResult> {
  await requireOnboardedUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "ההתראה לא נמצאה" };

  let href: string;
  try {
    const alert = await getAlert(id);
    if (!alert) return { ok: false, message: "ההתראה לא נמצאה" };
    await markAlertRead(id);
    href = alertHref({ type: alert.type, campaignId: alert.campaign?.id ?? null, month: alert.month });
  } catch (error) {
    console.error("openAlert failed", { code: (error as { code?: string }).code });
    return { ok: false, message: "משהו השתבש. נסה שוב." };
  }
  refresh();
  redirect(href);
}
