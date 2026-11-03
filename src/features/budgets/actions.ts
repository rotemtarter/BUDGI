"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addMonths, currentMonth, isMonth } from "@/lib/dates/month";
import {
  campaignMonthBudgetSchema,
  monthBudgetSchema,
  type CampaignMonthBudgetInput,
  type MonthBudgetInput,
} from "@/lib/validation/budgets";
import { requireOnboardedUser } from "@/server/auth/session";
import { saveMonthBudget } from "@/server/repositories/budgets";
import { getCampaign, saveCampaignBudget } from "@/server/repositories/campaigns";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

const INVALID_MESSAGE = "יש לתקן את השדות המסומנים";
const MONTH_MESSAGE = "אפשר להגדיר תקציב עד החודש הבא";

// Budgets can be set for past months and up to next month (as with goals)
function validMonth(month: string) {
  return isMonth(month) && month <= addMonths(currentMonth(), 1);
}

function errorCode(error: unknown) {
  return (error as { code?: string }).code;
}

// Budget screen (DESIGN.md 1.6): the total monthly budget
export async function saveMonthBudgetAction(month: string, input: MonthBudgetInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = monthBudgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: INVALID_MESSAGE };
  if (!validMonth(month)) return { ok: false, message: MONTH_MESSAGE };

  try {
    await saveMonthBudget(user.id, month, parsed.data.budget);
  } catch (error) {
    console.error("saveMonthBudget failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  refresh();
  return { ok: true };
}

// Budget screen, campaigns tab: one campaign's budget for the month
export async function saveCampaignMonthBudgetAction(
  campaignId: string,
  month: string,
  input: CampaignMonthBudgetInput,
): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = campaignMonthBudgetSchema.safeParse(input);
  if (!z.uuid().safeParse(campaignId).success || !parsed.success) return { ok: false, message: INVALID_MESSAGE };
  if (!validMonth(month)) return { ok: false, message: MONTH_MESSAGE };

  try {
    if (!(await getCampaign(campaignId))) return { ok: false, message: "הקמפיין לא נמצא" };
    await saveCampaignBudget(user.id, campaignId, month, parsed.data.budget);
  } catch (error) {
    console.error("saveCampaignMonthBudget failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  refresh();
  return { ok: true };
}
