import { z } from "zod";

// AI Budget Advisor contract (ARCHITECTURE.md 4.3, 5.6, 6.4; ADR-12). Shared by
// the Route Handler and the chat screen; no server code here.

export const DAILY_QUESTION_LIMIT = 20;
export const MAX_QUESTION_LENGTH = 1000;
export const MAX_ANSWER_LENGTH = 4000;
export const MAX_HISTORY_MESSAGES = 10;

export const ACTION_TYPES = ["increase", "decrease", "reallocate"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// What the model must return. Strict Structured Outputs need every field, so
// optional values are nullable. Numeric limits are checked in code, after
// parsing (checkRecommendations), not in the schema.
export const advisorOutputSchema = z.object({
  answer: z.string(),
  recommendations: z.array(
    z.object({
      // reallocate: [from, to]
      campaign_ids: z.array(z.string()),
      action_type: z.enum(ACTION_TYPES),
      amount_ils: z.number().nullable(),
      percentage: z.number().nullable(),
      rationale: z.string(),
      expected_impact: z.string().nullable(),
    }),
  ),
  limitations: z.array(z.string()),
  missing_data_request: z.string().nullable(),
});

export type AdvisorOutput = z.infer<typeof advisorOutputSchema>;
export type OutputRecommendation = AdvisorOutput["recommendations"][number];

// One earlier message of the current conversation (kept in the browser only)
const historyMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(MAX_QUESTION_LENGTH) }),
  z.object({ role: z.literal("assistant"), content: z.string().trim().min(1).max(MAX_ANSWER_LENGTH) }),
]);

export type HistoryMessage = z.infer<typeof historyMessageSchema>;

export const advisorRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  // Only the last 10 are sent to the model; the browser sends no more than that
  history: z.array(historyMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
});

export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;

// A recommendation as shown on the screen: the campaigns' names come from the
// database by id, never from the model's text
const recommendationSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  campaigns: z.array(z.object({ id: z.string().max(100), name: z.string().max(200) })).min(1).max(10),
  amountIls: z.number().positive().nullable(),
  percentage: z.number().positive().nullable(),
  rationale: z.string().min(1).max(MAX_ANSWER_LENGTH),
  expectedImpact: z.string().max(MAX_ANSWER_LENGTH).nullable(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// An answer as shown on the screen; also what a saved insight keeps (PRD 4.7)
export const advisorReplySchema = z.object({
  answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
  recommendations: z.array(recommendationSchema).max(10),
  limitations: z.array(z.string().max(MAX_ANSWER_LENGTH)).max(20),
  missingDataRequest: z.string().max(MAX_ANSWER_LENGTH).nullable(),
});

export type AdvisorReply = z.infer<typeof advisorReplySchema>;

export const saveInsightSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  reply: advisorReplySchema,
});

export type SavedInsight = { id: string; question: string; reply: AdvisorReply; createdAt: string };

export type AdvisorResponse =
  | { ok: true; reply: AdvisorReply; remaining: number }
  | { ok: false; message: string; limit?: boolean; remaining?: number };
