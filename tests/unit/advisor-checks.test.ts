import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import {
  advisorOutputSchema,
  advisorRequestSchema,
  saveInsightSchema,
  type AdvisorOutput,
  type OutputRecommendation,
} from "@/lib/advisor/schema";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import { checkRecommendations } from "@/server/services/advisor";
import type { AdvisorContext, ContextCampaign } from "@/server/services/advisor-context";

// Contract and server-side checks of the Advisor's answers (ARCHITECTURE.md
// 4.3, 5.6 step 8, 6.4)

const summary = (spend: number | null) => ({
  spend,
  revenue: null,
  leads: null,
  deals: null,
  new_customers: null,
  cpl: { not_available: "—" },
  cost_per_deal: { not_available: "—" },
  cac: { not_available: "—" },
  roas: { not_available: "—" },
  conversion_rate_percent: { not_available: "—" },
});

const campaign = (id: string, budget: number | null, spend: number | null): ContextCampaign => ({
  id,
  name: `Name ${id}`,
  platform: "google_ads",
  status: "active",
  monthly_budget: budget,
  remaining_budget: null,
  this_month: summary(spend),
  previous_month: summary(null),
  spend_forecast: { actual: spend, forecast: null, basis: null, not_available: null },
});

const context = {
  business: { monthly_budget: 10000, this_month: summary(4000) },
  campaigns: [campaign("a", 3000, 1000), campaign("b", null, 800), campaign("c", null, null)],
} as unknown as AdvisorContext;

const rec = (overrides: Partial<OutputRecommendation>): OutputRecommendation => ({
  campaign_ids: ["a", "b"],
  action_type: "reallocate",
  amount_ils: 1000,
  percentage: null,
  rationale: "CPL נמוך יותר",
  expected_impact: "כ-10 לידים נוספים",
  ...overrides,
});

const output = (recommendations: OutputRecommendation[]): AdvisorOutput => ({
  answer: "  תשובה  ",
  recommendations,
  limitations: [" ", "חסרות עסקאות"],
  missing_data_request: null,
});

describe("advisor output schema", () => {
  it("accepts a valid answer", () => {
    expect(advisorOutputSchema.safeParse(output([rec({})])).success).toBe(true);
  });

  it("rejects missing fields, unknown actions and wrong types", () => {
    const missing: Partial<AdvisorOutput> = output([]);
    delete missing.missing_data_request;
    expect(advisorOutputSchema.safeParse(missing).success).toBe(false);
    expect(advisorOutputSchema.safeParse(output([rec({ action_type: "pause" as never })])).success).toBe(false);
    expect(advisorOutputSchema.safeParse({ ...output([]), answer: 5 }).success).toBe(false);
  });

  it("converts to the format sent to OpenAI", () => {
    const format = zodTextFormat(advisorOutputSchema, "advisor_reply");
    expect(format).toMatchObject({ type: "json_schema", name: "advisor_reply", strict: true });
  });

  it("is strict for Structured Outputs: every field required, no extra fields", () => {
    const schema = z.toJSONSchema(advisorOutputSchema) as unknown as {
      required: string[];
      additionalProperties: boolean;
      properties: { recommendations: { items: { required: string[]; additionalProperties: boolean } } };
    };
    expect(schema.required.sort()).toEqual(["answer", "limitations", "missing_data_request", "recommendations"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.recommendations.items.required).toHaveLength(6);
    expect(schema.properties.recommendations.items.additionalProperties).toBe(false);
  });
});

describe("advisor request", () => {
  it("accepts a question of up to 1,000 characters and trims it", () => {
    expect(advisorRequestSchema.parse({ question: "  שאלה " })).toEqual({ question: "שאלה", history: [] });
    expect(advisorRequestSchema.safeParse({ question: "א".repeat(1000) }).success).toBe(true);
  });

  it("rejects an empty or too long question and more than 10 earlier messages", () => {
    expect(advisorRequestSchema.safeParse({ question: "   " }).success).toBe(false);
    expect(advisorRequestSchema.safeParse({ question: "א".repeat(1001) }).success).toBe(false);
    const history = Array.from({ length: 11 }, () => ({ role: "user", content: "שאלה" }));
    expect(advisorRequestSchema.safeParse({ question: "שאלה", history }).success).toBe(false);
    expect(advisorRequestSchema.safeParse({ question: "שאלה", history: [{ role: "system", content: "x" }] }).success).toBe(false);
  });
});

describe("recommendation checks", () => {
  it("keeps a valid recommendation with names from the data", () => {
    const reply = checkRecommendations(output([rec({})]), context);
    expect(reply.answer).toBe("תשובה");
    expect(reply.limitations).toEqual(["חסרות עסקאות"]);
    expect(reply.recommendations).toEqual([
      {
        actionType: "reallocate",
        campaigns: [
          { id: "a", name: "Name a" },
          { id: "b", name: "Name b" },
        ],
        amountIls: 1000,
        percentage: null,
        rationale: "CPL נמוך יותר",
        expectedImpact: "כ-10 לידים נוספים",
      },
    ]);
  });

  it.each([
    ["an unknown campaign", rec({ campaign_ids: ["a", "someone-else"] })],
    ["a reallocation with one campaign", rec({ campaign_ids: ["a"] })],
    ["a reallocation to the same campaign", rec({ campaign_ids: ["a", "a"] })],
    ["no campaigns", rec({ campaign_ids: [], action_type: "increase" })],
    ["no amount and no percentage", rec({ amount_ils: null, percentage: null })],
    ["more than the source campaign's budget", rec({ amount_ils: 3001 })],
    ["more than the spend of a campaign without a budget", rec({ campaign_ids: ["b", "a"], amount_ils: 900 })],
    ["a source without budget or spend", rec({ campaign_ids: ["c", "a"], amount_ils: 100 })],
    ["a negative amount", rec({ amount_ils: -500 })],
    ["a decrease of more than 100%", rec({ action_type: "decrease", campaign_ids: ["a"], amount_ils: null, percentage: 150 })],
    ["an increase of more than 200%", rec({ action_type: "increase", campaign_ids: ["a"], amount_ils: null, percentage: 250 })],
    ["an increase above the total budget", rec({ action_type: "increase", campaign_ids: ["a"], amount_ils: 10001 })],
    ["an empty rationale", rec({ rationale: "  " })],
  ])("removes %s and adds one limitation", (_, recommendation) => {
    const reply = checkRecommendations(output([recommendation, recommendation]), context);
    expect(reply.recommendations).toEqual([]);
    expect(reply.limitations.filter((l) => l === ADVISOR_MESSAGES.removedRecommendations)).toHaveLength(1);
  });

  it("rounds the amount to whole shekels and the percentage to one decimal", () => {
    const reply = checkRecommendations(
      output([rec({ action_type: "decrease", campaign_ids: ["a"], amount_ils: 1234.56, percentage: 12.345, expected_impact: " " })]),
      context,
    );
    expect(reply.recommendations[0]).toMatchObject({ amountIls: 1235, percentage: 12.3, expectedImpact: null });
  });

  it("passes the missing-data request through", () => {
    const reply = checkRecommendations({ ...output([]), missing_data_request: " יש להזין לידים " }, context);
    expect(reply.missingDataRequest).toBe("יש להזין לידים");
  });
});

describe("saved insight", () => {
  const reply = {
    answer: "תשובה",
    recommendations: [],
    limitations: [],
    missingDataRequest: null,
  };

  it("accepts a question and an answer as shown", () => {
    expect(saveInsightSchema.safeParse({ question: " שאלה ", reply }).success).toBe(true);
  });

  it("rejects a missing or malformed answer and a too long question", () => {
    expect(saveInsightSchema.safeParse({ question: "שאלה" }).success).toBe(false);
    expect(saveInsightSchema.safeParse({ question: "שאלה", reply: { ...reply, answer: " " } }).success).toBe(false);
    expect(
      saveInsightSchema.safeParse({
        question: "שאלה",
        reply: { ...reply, recommendations: [{ actionType: "pause", campaigns: [], rationale: "x" }] },
      }).success,
    ).toBe(false);
    expect(saveInsightSchema.safeParse({ question: "א".repeat(1001), reply }).success).toBe(false);
  });
});
