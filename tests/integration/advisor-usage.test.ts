import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonClient, signInTestUser } from "../support/test-users";

// The Advisor's daily counter in budgi-dev (PRD 4.7, ADR-12), as test users A
// and B. The count cannot be lowered, so these tests use B's quota and pass
// when run again on the same day. The Advisor end-to-end tests use A and do
// not call the server.
type User = { client: SupabaseClient<Database>; userId: string };
let a: User;
let b: User;

const israelToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

beforeAll(async () => {
  a = await signInTestUser("A");
  b = await signInTestUser("B");
});

async function record(user: User) {
  const { data, error } = await user.client.rpc("advisor_record_question");
  if (error) throw error;
  return data;
}

describe("advisor_usage", () => {
  it("counts questions for today in Israel time, up to 20", async () => {
    const first = await record(b);
    expect(first).toBeGreaterThanOrEqual(1);
    let count = first;
    for (let i = 0; i < 20 && count < 20; i++) {
      const next = await record(b);
      expect(next).toBe(count + 1);
      count = next;
    }
    expect(count).toBe(20);
    // Never above the limit
    expect(await record(b)).toBe(20);

    const { data } = await b.client.from("advisor_usage").select("usage_date, question_count").eq("usage_date", israelToday()).single();
    expect(data).toEqual({ usage_date: israelToday(), question_count: 20 });
  });

  it("cannot be reset or changed directly", async () => {
    const day = israelToday();
    const update = await b.client.from("advisor_usage").update({ question_count: 0 }).eq("usage_date", day).select();
    // No write permission: an error, or no rows changed
    expect(update.data ?? []).toEqual([]);

    const remove = await b.client.from("advisor_usage").delete().eq("usage_date", day).select();
    expect(remove.data ?? []).toEqual([]);

    const insert = await b.client
      .from("advisor_usage")
      .insert({ user_id: b.userId, usage_date: "2030-01-01", question_count: 0 });
    expect(insert.error).not.toBeNull();

    const { data } = await b.client.from("advisor_usage").select("question_count").eq("usage_date", day).single();
    expect(data?.question_count).toBe(20);
  });

  it("is visible to its owner only", async () => {
    const { data, error } = await a.client.from("advisor_usage").select("user_id").eq("user_id", b.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot be counted without signing in", async () => {
    const { error } = await anonClient().rpc("advisor_record_question");
    expect(error).not.toBeNull();
  });
});
