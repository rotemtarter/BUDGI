import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvisorOutput } from "@/lib/advisor/schema";
import type { AdvisorContext } from "@/server/services/advisor-context";

// AI contract tests (ARCHITECTURE.md 8.1): OpenAI, the database and the
// context are replaced by mocks, so nothing is billed.

const mocks = vi.hoisted(() => ({
  requestAdvice: vi.fn(),
  getTodayUsage: vi.fn(),
  recordQuestion: vi.fn(),
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  loadAdvisorContext: vi.fn(),
}));

vi.mock("@/server/ai/openai", async () => {
  class AiError extends Error {
    constructor(readonly kind: string) {
      super(kind);
    }
  }
  return { AiError, requestAdvice: mocks.requestAdvice, ADVISOR_MODEL: "test" };
});
vi.mock("@/server/repositories/advisor-usage", () => ({
  getTodayUsage: mocks.getTodayUsage,
  recordQuestion: mocks.recordQuestion,
  acquireLock: mocks.acquireLock,
  releaseLock: mocks.releaseLock,
}));
vi.mock("@/server/services/advisor-context", () => ({ loadAdvisorContext: mocks.loadAdvisorContext }));

const { askAdvisor } = await import("@/server/services/advisor");
const { AiError } = await import("@/server/ai/openai");

const context = {
  has_any_data: true,
  business: { monthly_budget: 10000, this_month: { spend: 2000 } },
  campaigns: [
    { id: "a", name: "Search", monthly_budget: 3000, this_month: { spend: 1000 } },
    { id: "b", name: "Video", monthly_budget: 2000, this_month: { spend: 500 } },
  ],
} as unknown as AdvisorContext;

const valid: AdvisorOutput = {
  answer: "כדאי להעביר תקציב",
  recommendations: [
    {
      campaign_ids: ["a", "b"],
      action_type: "reallocate",
      amount_ils: 500,
      percentage: null,
      rationale: "CPL נמוך יותר",
      expected_impact: null,
    },
  ],
  limitations: [],
  missing_data_request: null,
};

const question = { question: "איפה כדאי להגדיל תקציב?", history: [] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTodayUsage.mockResolvedValue(3);
  mocks.recordQuestion.mockResolvedValue(4);
  mocks.acquireLock.mockResolvedValue("lock-token");
  mocks.releaseLock.mockResolvedValue(undefined);
  mocks.loadAdvisorContext.mockResolvedValue(context);
  mocks.requestAdvice.mockResolvedValue(JSON.stringify(valid));
});

describe("askAdvisor", () => {
  it("answers, counts the question and returns the questions left", async () => {
    const result = await askAdvisor(question);
    expect(result).toMatchObject({ kind: "ok", remaining: 16 });
    if (result.kind !== "ok") throw new Error();
    expect(result.reply.recommendations[0].campaigns.map((c) => c.name)).toEqual(["Search", "Video"]);
    expect(mocks.recordQuestion).toHaveBeenCalledOnce();
  });

  it("sends the context as data, the history and the question", async () => {
    await askAdvisor({
      question: "ומה עם הלידים?",
      history: [
        { role: "user", content: "שאלה קודמת" },
        { role: "assistant", content: "תשובה קודמת" },
      ],
    });
    const input = mocks.requestAdvice.mock.calls[0][0];
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toContain('"campaigns"');
    expect(input.slice(1).map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(input.at(-1).content).toBe("ומה עם הלידים?");
  });

  it("answers one question at a time and always frees the lock", async () => {
    mocks.acquireLock.mockResolvedValue(null);
    expect(await askAdvisor(question)).toEqual({ kind: "busy" });
    expect(mocks.getTodayUsage).not.toHaveBeenCalled();
    expect(mocks.requestAdvice).not.toHaveBeenCalled();
    expect(mocks.releaseLock).not.toHaveBeenCalled();

    mocks.acquireLock.mockResolvedValue("lock-token");
    await askAdvisor(question);
    expect(mocks.releaseLock).toHaveBeenCalledWith("lock-token");

    mocks.releaseLock.mockClear();
    mocks.loadAdvisorContext.mockRejectedValue(new Error("db down"));
    await expect(askAdvisor(question)).rejects.toThrow("db down");
    expect(mocks.releaseLock).toHaveBeenCalledWith("lock-token");
  });

  it("stops at 20 questions a day without calling OpenAI", async () => {
    mocks.getTodayUsage.mockResolvedValue(20);
    expect(await askAdvisor(question)).toEqual({ kind: "limit" });
    expect(mocks.requestAdvice).not.toHaveBeenCalled();
    expect(mocks.recordQuestion).not.toHaveBeenCalled();
  });

  it.each(["refusal", "incomplete", "request", "empty", "missing_key"])(
    "does not count a question that failed with %s",
    async (kind) => {
      mocks.requestAdvice.mockRejectedValue(new AiError(kind as never));
      expect(await askAdvisor(question)).toEqual({ kind: "failed", reason: kind });
      expect(mocks.recordQuestion).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["broken JSON", '{"answer": "חלקי'],
    ["output that fails validation", JSON.stringify({ ...valid, recommendations: [{ action_type: "pause" }] })],
    ["an empty answer", JSON.stringify({ ...valid, answer: "  " })],
  ])("does not count %s", async (_, text) => {
    mocks.requestAdvice.mockResolvedValue(text);
    expect(await askAdvisor(question)).toEqual({ kind: "failed", reason: "invalid_output" });
    expect(mocks.recordQuestion).not.toHaveBeenCalled();
  });

  it("shows what is missing when there is not enough data", async () => {
    mocks.requestAdvice.mockResolvedValue(
      JSON.stringify({ ...valid, recommendations: [], missing_data_request: "יש להזין נתוני לידים" }),
    );
    const result = await askAdvisor(question);
    expect(result).toMatchObject({ kind: "ok", reply: { missingDataRequest: "יש להזין נתוני לידים", recommendations: [] } });
  });

  it("never reports fewer than 0 questions left", async () => {
    mocks.recordQuestion.mockResolvedValue(20);
    mocks.getTodayUsage.mockResolvedValue(19);
    expect(await askAdvisor(question)).toMatchObject({ kind: "ok", remaining: 0 });
  });
});
