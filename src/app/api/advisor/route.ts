import { randomUUID } from "node:crypto";
import { advisorRequestSchema, type AdvisorResponse } from "@/lib/advisor/schema";
import { ADVISOR_MESSAGES } from "@/lib/advisor/messages";
import { denyUnlessOnboarded } from "@/server/import/http";
import { askAdvisor } from "@/server/services/advisor";

// AI Budget Advisor (ARCHITECTURE.md 4.2, 5.6, 6.4; ADR-12): one question with
// the current conversation's last messages. Logs never include the question,
// the answer or financial data (ARCHITECTURE.md 8.2).

// OpenAI calls can take a while (Vercel Functions)
export const maxDuration = 60;

const json = (body: AdvisorResponse, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const denied = await denyUnlessOnboarded();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = advisorRequestSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, message: ADVISOR_MESSAGES.invalidQuestion }, 422);

  const requestId = randomUUID();
  const started = Date.now();
  const log = (outcome: string) =>
    console.info("advisor", { requestId, outcome, ms: Date.now() - started, env: process.env.APP_ENV });

  try {
    const result = await askAdvisor(parsed.data);
    if (result.kind === "limit") {
      log("limit");
      return json({ ok: false, limit: true, remaining: 0, message: ADVISOR_MESSAGES.limitReached }, 429);
    }
    if (result.kind === "failed") {
      if (result.reason === "missing_key") console.error("advisor: OPENAI_API_KEY is not set", { requestId });
      log(result.reason);
      return json({ ok: false, message: ADVISOR_MESSAGES.failed }, result.reason === "missing_key" ? 503 : 502);
    }
    log("ok");
    return json({ ok: true, reply: result.reply, remaining: result.remaining });
  } catch (error) {
    console.error("advisor failed", { requestId, code: (error as { code?: string }).code });
    return json({ ok: false, message: ADVISOR_MESSAGES.failed }, 500);
  }
}
