import "server-only";
import {
  advisorOutputSchema,
  advisorReplySchema,
  DAILY_QUESTION_LIMIT,
  MAX_HISTORY_MESSAGES,
  type AdvisorOutput,
  type AdvisorReply,
  type AdvisorRequest,
  type OutputRecommendation,
  type Recommendation,
} from "@/lib/advisor/schema";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import { AiError, requestAdvice, type AiFailure } from "@/server/ai/openai";
import { advisorInput } from "@/server/ai/prompt";
import { getTodayUsage, recordQuestion } from "@/server/repositories/advisor-usage";
import { loadAdvisorContext, type AdvisorContext } from "./advisor-context";

// AI Advisor Service (ARCHITECTURE.md 5.6, 6.4; ADR-12): daily limit → context
// → OpenAI → Zod → logic checks → count the question. Only an answered
// question is counted. Nothing here writes budgets or campaigns.

const MAX_INCREASE_PERCENT = 200;
const MAX_DECREASE_PERCENT = 100;

const roundAmount = (value: number | null) => (value === null ? null : Math.round(value));
const roundPercent = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

// The most a recommendation may move: the source campaign's monthly budget
// (or its spend this month without a budget); for an increase, the business's
// monthly budget (or its spend this month)
function amountLimit(rec: OutputRecommendation, context: AdvisorContext): number | null {
  if (rec.action_type === "increase") {
    return context.business.monthly_budget ?? context.business.this_month.spend;
  }
  const source = context.campaigns.find((c) => c.id === rec.campaign_ids[0]);
  return source ? (source.monthly_budget ?? source.this_month.spend) : null;
}

function toRecommendation(rec: OutputRecommendation, context: AdvisorContext): Recommendation | null {
  const names = new Map(context.campaigns.map((c) => [c.id, c.name]));
  const ids = rec.campaign_ids;
  if (ids.length === 0 || !ids.every((id) => names.has(id))) return null;
  if (rec.action_type === "reallocate" && (ids.length !== 2 || ids[0] === ids[1])) return null;
  if (rec.action_type !== "reallocate" && new Set(ids).size !== ids.length) return null;

  const amountIls = roundAmount(rec.amount_ils);
  const percentage = roundPercent(rec.percentage);
  if (amountIls === null && percentage === null) return null;
  if (amountIls !== null) {
    const limit = amountLimit(rec, context);
    if (amountIls <= 0 || limit === null || amountIls > limit) return null;
  }
  if (percentage !== null) {
    const max = rec.action_type === "increase" ? MAX_INCREASE_PERCENT : MAX_DECREASE_PERCENT;
    if (percentage <= 0 || percentage > max) return null;
  }

  const rationale = rec.rationale.trim();
  if (!rationale) return null;
  return {
    actionType: rec.action_type,
    campaigns: ids.map((id) => ({ id, name: names.get(id)! })),
    amountIls,
    percentage,
    rationale,
    expectedImpact: rec.expected_impact?.trim() || null,
  };
}

// Pure: keeps only recommendations that match the user's data (ARCHITECTURE.md
// 5.6 step 8). Removed ones add one general limitation.
export function checkRecommendations(output: AdvisorOutput, context: AdvisorContext): AdvisorReply {
  const recommendations = output.recommendations
    .map((rec) => toRecommendation(rec, context))
    .filter((rec): rec is Recommendation => rec !== null);
  const limitations = output.limitations.map((l) => l.trim()).filter(Boolean);
  if (recommendations.length < output.recommendations.length) {
    limitations.push(ADVISOR_MESSAGES.removedRecommendations);
  }
  return {
    answer: output.answer.trim(),
    recommendations,
    limitations,
    missingDataRequest: output.missing_data_request?.trim() || null,
  };
}

export type AdvisorFailure = AiFailure | "invalid_output";

export type AdvisorResult =
  | { kind: "ok"; reply: AdvisorReply; remaining: number }
  | { kind: "limit" }
  | { kind: "failed"; reason: AdvisorFailure };

export async function askAdvisor(request: AdvisorRequest): Promise<AdvisorResult> {
  if ((await getTodayUsage()) >= DAILY_QUESTION_LIMIT) return { kind: "limit" };

  const context = await loadAdvisorContext();
  const history = request.history.slice(-MAX_HISTORY_MESSAGES);

  let text: string;
  try {
    text = await requestAdvice(advisorInput(context, history, request.question));
  } catch (error) {
    if (error instanceof AiError) return { kind: "failed", reason: error.kind };
    throw error;
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: "failed", reason: "invalid_output" };
  }
  const parsed = advisorOutputSchema.safeParse(json);
  if (!parsed.success) return { kind: "failed", reason: "invalid_output" };
  // Also what a saved insight keeps, so it must fit the same limits
  const reply = advisorReplySchema.safeParse(checkRecommendations(parsed.data, context));
  if (!reply.success) return { kind: "failed", reason: "invalid_output" };

  const used = await recordQuestion();
  return { kind: "ok", reply: reply.data, remaining: Math.max(DAILY_QUESTION_LIMIT - used, 0) };
}
