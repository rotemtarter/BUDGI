import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { advisorOutputSchema } from "@/lib/advisor/schema";
import { ADVISOR_INSTRUCTIONS, type InputMessage } from "./prompt";

// The only module that knows about OpenAI (ARCHITECTURE.md 1.5, 4.3; ADR-12).
// One Responses API call with Structured Outputs; no tools, so the model can
// never write anything. Server only: the key never reaches the browser.

export const ADVISOR_MODEL = "gpt-6-luna";
const MAX_OUTPUT_TOKENS = 1500;
// One attempt only: a retry after a slow attempt could pass the Route's 60s limit.
// The user retries with "נסה שוב".
const TIMEOUT_MS = 45_000;

export type AiFailure = "missing_key" | "refusal" | "incomplete" | "empty" | "request";

export class AiError extends Error {
  constructor(readonly kind: AiFailure) {
    super(`advisor ai ${kind}`);
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiError("missing_key");
  client ??= new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  return client;
}

// Returns the model's JSON text, not yet validated
export async function requestAdvice(input: InputMessage[]): Promise<string> {
  const openai = getClient();
  let response: OpenAI.Responses.Response;
  try {
    response = await openai.responses.create({
      model: ADVISOR_MODEL,
      instructions: ADVISOR_INSTRUCTIONS,
      input,
      text: { format: zodTextFormat(advisorOutputSchema, "advisor_reply") },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
  } catch {
    throw new AiError("request");
  }

  const refused = response.output.some(
    (item) => item.type === "message" && item.content.some((part) => part.type === "refusal"),
  );
  if (refused) throw new AiError("refusal");
  if (response.status === "incomplete") throw new AiError("incomplete");
  if (!response.output_text) throw new AiError("empty");
  return response.output_text;
}
