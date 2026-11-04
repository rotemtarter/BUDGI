"use server";

import { z } from "zod";
import { saveInsightSchema, type SavedInsight } from "@/lib/advisor/schema";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import { requireOnboardedUser } from "@/server/auth/session";
import { deleteInsight, insertInsight } from "@/server/repositories/advisor-insights";

// Saved insights (PRD 4.7, DESIGN.md 1.12). Saving is not a question, so it
// does not count toward the daily limit.

export type InsightResult = { ok: true; insight: SavedInsight } | { ok: false; message: string };

export async function saveInsightAction(input: unknown): Promise<InsightResult> {
  const user = await requireOnboardedUser();
  const parsed = saveInsightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: ADVISOR_MESSAGES.saveFailed };
  try {
    return { ok: true, insight: await insertInsight(user.id, parsed.data.question, parsed.data.reply) };
  } catch (error) {
    console.error("saveInsight failed", { code: (error as { code?: string }).code });
    return { ok: false, message: ADVISOR_MESSAGES.saveFailed };
  }
}

export async function deleteInsightAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireOnboardedUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: ADVISOR_MESSAGES.insightNotFound };
  try {
    return (await deleteInsight(id)) ? { ok: true } : { ok: false, message: ADVISOR_MESSAGES.insightNotFound };
  } catch (error) {
    console.error("deleteInsight failed", { code: (error as { code?: string }).code });
    return { ok: false, message: ADVISOR_MESSAGES.deleteFailed };
  }
}
