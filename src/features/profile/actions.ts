"use server";

import { refresh } from "next/cache";
import { businessNameSchema, type BusinessNameInput } from "@/lib/validation/profile";
import { requireOnboardedUser } from "@/server/auth/session";
import { saveBusinessName } from "@/server/repositories/profile";
import { SAVE_FAILED_MESSAGE, type FormResult } from "@/features/form-result";

export async function saveBusinessNameAction(input: BusinessNameInput): Promise<FormResult> {
  const user = await requireOnboardedUser();

  const parsed = businessNameSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "יש לתקן את השדה";
    return { ok: false, message, fieldErrors: { businessName: message } };
  }

  try {
    await saveBusinessName(user.id, parsed.data.businessName);
  } catch (error) {
    console.error("saveBusinessName failed", { code: (error as { code?: string }).code });
    return { ok: false, message: SAVE_FAILED_MESSAGE };
  }
  // The header shows the new name with the action result
  refresh();
  return { ok: true };
}
