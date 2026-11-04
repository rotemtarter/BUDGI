import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { advisorReplySchema, type AdvisorReply } from "@/lib/advisor/schema";
import { anonClient, signInTestUser } from "../support/test-users";

// Saved insights in budgi-dev (PRD 4.7, ADR-13), as test users A and B. The
// reads and writes match src/server/repositories/advisor-insights.ts.
type User = { client: SupabaseClient<Database>; userId: string };
let a: User;
let b: User;

const REPLY: AdvisorReply = {
  answer: "כדאי להעביר תקציב",
  recommendations: [
    {
      actionType: "reallocate",
      campaigns: [
        { id: "x", name: "Meta" },
        { id: "y", name: "Search" },
      ],
      amountIls: 600,
      percentage: null,
      rationale: "ROAS גבוה יותר",
      expectedImpact: null,
    },
  ],
  limitations: ["הערכה בלבד"],
  missingDataRequest: null,
};

async function clear(user: User) {
  const { error } = await user.client.from("advisor_insights").delete().eq("user_id", user.userId);
  if (error) throw error;
}

async function insert(user: User, question = "איפה להגדיל?") {
  const { data, error } = await user.client
    .from("advisor_insights")
    .insert({ user_id: user.userId, question, reply: REPLY })
    .select("id, reply")
    .single();
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  a = await signInTestUser("A");
  b = await signInTestUser("B");
});

beforeEach(async () => {
  await clear(a);
  await clear(b);
});

afterAll(async () => {
  await clear(a);
  await clear(b);
});

describe("advisor_insights", () => {
  it("saves and reads the answer as it was shown", async () => {
    const saved = await insert(b);
    expect(advisorReplySchema.parse(saved.reply)).toEqual(REPLY);
    const { data } = await b.client.from("advisor_insights").select("question").order("created_at", { ascending: false });
    expect(data).toEqual([{ question: "איפה להגדיל?" }]);
  });

  it("is deleted by its owner", async () => {
    const saved = await insert(b);
    const { data } = await b.client.from("advisor_insights").delete().eq("id", saved.id).select("id");
    expect(data).toEqual([{ id: saved.id }]);
  });

  it("is not visible, editable or deletable by another user", async () => {
    const saved = await insert(b);
    const read = await a.client.from("advisor_insights").select("id").eq("id", saved.id);
    expect(read.data).toEqual([]);
    const remove = await a.client.from("advisor_insights").delete().eq("id", saved.id).select("id");
    expect(remove.data ?? []).toEqual([]);
    const forged = await a.client
      .from("advisor_insights")
      .insert({ user_id: b.userId, question: "זר", reply: REPLY });
    expect(forged.error).not.toBeNull();
    const still = await b.client.from("advisor_insights").select("id").eq("id", saved.id);
    expect(still.data).toHaveLength(1);
  });

  it("cannot be changed after saving", async () => {
    const saved = await insert(b);
    const update = await b.client.from("advisor_insights").update({ question: "אחר" }).eq("id", saved.id).select();
    expect(update.data ?? []).toEqual([]);
  });

  it("rejects an empty question or a reply that is not an object", async () => {
    const empty = await b.client.from("advisor_insights").insert({ user_id: b.userId, question: "", reply: REPLY });
    expect(empty.error).not.toBeNull();
    const notObject = await b.client.from("advisor_insights").insert({ user_id: b.userId, question: "ש", reply: [1] });
    expect(notObject.error).not.toBeNull();
  });

  it("cannot be read without signing in", async () => {
    await insert(b);
    const { data } = await anonClient().from("advisor_insights").select("id");
    expect(data ?? []).toEqual([]);
  });
});
