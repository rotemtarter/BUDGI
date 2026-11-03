"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isWeekStart } from "@/lib/dates/week";
import { weekSchema, type WeekInput } from "@/lib/validation/weeks";
import { requireOnboardedUser } from "@/server/auth/session";
import { getCampaign } from "@/server/repositories/campaigns";
import { deleteWeek, upsertWeek } from "@/server/repositories/performance";
import { checkAlerts } from "@/server/services/alerts-check";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

const idSchema = z.uuid();
const NOT_FOUND_MESSAGE = "הקמפיין לא נמצא";

function errorCode(error: unknown) {
  return (error as { code?: string }).code;
}

// Creates or updates the campaign's row for the chosen week (normalized to Sunday)
export async function saveWeekAction(campaignId: string, input: WeekInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "יש לתקן את השדות המסומנים";
    return { ok: false, message };
  }
  if (!idSchema.safeParse(campaignId).success) return { ok: false, message: NOT_FOUND_MESSAGE };

  try {
    if (!(await getCampaign(campaignId))) return { ok: false, message: NOT_FOUND_MESSAGE };
    await upsertWeek(user.id, campaignId, parsed.data);
  } catch (error) {
    console.error("saveWeek failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  const alerts = await checkAlerts(user.id);
  // The client gets the updated screen with the action result
  refresh();
  return { ok: true, alerts };
}

export async function deleteWeekAction(campaignId: string, weekStart: string): Promise<FormResult> {
  const user = await requireOnboardedUser();
  if (!idSchema.safeParse(campaignId).success || !isWeekStart(weekStart)) {
    return { ok: false, message: "השבוע לא נמצא" };
  }

  try {
    await deleteWeek(campaignId, weekStart);
  } catch (error) {
    console.error("deleteWeek failed", { code: errorCode(error) });
    return { ok: false, message: "המחיקה נכשלה. נסה שוב." };
  }
  const alerts = await checkAlerts(user.id);
  // The client gets the updated screen with the action result
  refresh();
  return { ok: true, alerts };
}
