"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentMonth } from "@/lib/dates/month";
import {
  campaignBudgetSchema,
  createCampaignSchema,
  updateCampaignSchema,
  type CampaignBudgetInput,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "@/lib/validation/campaigns";
import { requireOnboardedUser } from "@/server/auth/session";
import {
  DUPLICATE_CAMPAIGN_CODE,
  campaignHasWeeks,
  createCampaign,
  deleteCampaign,
  getCampaign,
  saveCampaignBudget,
  updateCampaign,
} from "@/server/repositories/campaigns";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

const INVALID_MESSAGE = "יש לתקן את השדות המסומנים";
const DUPLICATE_MESSAGE = "כבר קיים קמפיין בשם הזה בפלטפורמה הזו";
const NOT_FOUND_MESSAGE = "הקמפיין לא נמצא";
const HAS_WEEKS_MESSAGE = "אי אפשר למחוק קמפיין שיש לו נתונים. אפשר לסמן אותו כ'הסתיים'.";

const idSchema = z.uuid();

function errorCode(error: unknown) {
  return (error as { code?: string }).code;
}

function duplicateResult(): FormResult {
  return { ok: false, message: DUPLICATE_MESSAGE, fieldErrors: { name: DUPLICATE_MESSAGE } };
}

// DESIGN.md 1.16: save opens the new campaign's details screen
export async function createCampaignAction(input: CreateCampaignInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: INVALID_MESSAGE };

  let id: string;
  try {
    id = await createCampaign(user.id, parsed.data, currentMonth());
  } catch (error) {
    if (errorCode(error) === DUPLICATE_CAMPAIGN_CODE) return duplicateResult();
    console.error("createCampaign failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  redirect(`/campaigns/${id}`);
}

export async function updateCampaignAction(id: string, input: UpdateCampaignInput): Promise<FormResult> {
  await requireOnboardedUser();

  const parsed = updateCampaignSchema.safeParse(input);
  if (!idSchema.safeParse(id).success || !parsed.success) return { ok: false, message: INVALID_MESSAGE };

  try {
    if (!(await getCampaign(id))) return { ok: false, message: NOT_FOUND_MESSAGE };
    await updateCampaign(id, parsed.data);
  } catch (error) {
    if (errorCode(error) === DUPLICATE_CAMPAIGN_CODE) return duplicateResult();
    console.error("updateCampaign failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  // The client gets the updated screen with the action result
  refresh();
  return { ok: true };
}

// Only a campaign without weekly data may be deleted (PRD 4.3)
export async function deleteCampaignAction(id: string): Promise<FormResult> {
  await requireOnboardedUser();
  if (!idSchema.safeParse(id).success) return { ok: false, message: NOT_FOUND_MESSAGE };

  try {
    if (!(await getCampaign(id))) return { ok: false, message: NOT_FOUND_MESSAGE };
    if (await campaignHasWeeks(id)) return { ok: false, message: HAS_WEEKS_MESSAGE };
    await deleteCampaign(id);
  } catch (error) {
    // 23503: weekly data was added meanwhile; the database blocks the delete
    if (errorCode(error) === "23503") return { ok: false, message: HAS_WEEKS_MESSAGE };
    console.error("deleteCampaign failed", { code: errorCode(error) });
    return { ok: false, message: "המחיקה נכשלה. נסה שוב." };
  }
  redirect("/campaigns");
}

// Planned budget for the current month (DESIGN.md 1.5, budget card)
export async function saveCampaignBudgetAction(id: string, input: CampaignBudgetInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = campaignBudgetSchema.safeParse(input);
  if (!idSchema.safeParse(id).success || !parsed.success) return { ok: false, message: INVALID_MESSAGE };

  try {
    if (!(await getCampaign(id))) return { ok: false, message: NOT_FOUND_MESSAGE };
    await saveCampaignBudget(user.id, id, currentMonth(), parsed.data.budget);
  } catch (error) {
    console.error("saveCampaignBudget failed", { code: errorCode(error) });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  // The client gets the updated screen with the action result
  refresh();
  return { ok: true };
}
