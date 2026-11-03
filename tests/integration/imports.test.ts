import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CommitRow } from "@/lib/imports/preview";
import { resetTestUser, signInTestUser } from "../support/test-users";

// commit_import (ARCHITECTURE.md 5.2), as test user B
let b: { client: SupabaseClient<Database>; userId: string };

beforeAll(async () => {
  b = await signInTestUser("B");
});

beforeEach(async () => {
  await resetTestUser(b.client, b.userId);
});

afterAll(async () => {
  await resetTestUser(b.client, b.userId);
});

function row(values: Partial<CommitRow>): CommitRow {
  return {
    name: "Import Test",
    platform: "meta_ads",
    week_start: "2026-10-25",
    spend: null,
    leads: null,
    deals: null,
    new_customers: null,
    revenue: null,
    ...values,
  };
}

function commit(rows: unknown[], fileName = "test.csv") {
  return b.client.rpc("commit_import", {
    p_file_name: fileName,
    p_rows: rows as never,
    p_rows_total: rows.length + 1,
    p_rows_rejected: 1,
    p_errors: [{ row: 9, reason: "חסר שם קמפיין" }],
  });
}

async function weeks() {
  const { data, error } = await b.client
    .from("campaign_performance")
    .select("week_start, spend, leads, deals, revenue, source, campaigns(name, platform, status)")
    .order("week_start");
  if (error) throw error;
  return data;
}

describe("commit_import", () => {
  it("creates missing campaigns and their weeks, and records the job", async () => {
    const { data, error } = await commit(
      [
        row({ spend: 100, leads: 5 }),
        row({ week_start: "2026-11-01", revenue: 900 }),
        row({ name: "Other", platform: "google_ads", deals: 2 }),
      ],
      "my-file.xlsx",
    );
    expect(error).toBeNull();
    expect(data).toMatchObject({ rows_inserted: 3, rows_updated: 0, campaigns_created: 2 });

    const saved = await weeks();
    expect(saved).toHaveLength(3);
    expect(saved.every((w) => w.source === "import")).toBe(true);
    expect(saved[0].campaigns).toMatchObject({ status: "active" });

    const job = await b.client.from("import_jobs").select("*").eq("id", (data as { job_id: string }).job_id).single();
    expect(job.data).toMatchObject({
      file_name: "my-file.xlsx",
      status: "completed",
      rows_total: 4,
      rows_imported: 3,
      rows_rejected: 1,
      campaigns_created: 2,
      error_summary: [{ row: 9, reason: "חסר שם קמפיין" }],
    });
  });

  it("updates on a second import, without duplicates, and an empty field keeps the stored value", async () => {
    await commit([row({ spend: 100, leads: 5 })]);
    const { data, error } = await commit([row({ spend: 150 }), row({ week_start: "2026-11-01", leads: 3 })]);
    expect(error).toBeNull();
    expect(data).toMatchObject({ rows_inserted: 1, rows_updated: 1, campaigns_created: 0 });

    const saved = await weeks();
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ spend: 150, leads: 5 });
  });

  it("matches an existing campaign ignoring case and edge spaces, and marks an updated manual week as import", async () => {
    const { data: campaign } = await b.client
      .from("campaigns")
      .insert({ name: "Import Test", platform: "meta_ads" })
      .select("id")
      .single();
    await b.client
      .from("campaign_performance")
      .insert({ campaign_id: campaign!.id, week_start: "2026-10-25", spend: 10, source: "manual" });

    const { data } = await commit([row({ name: "  import TEST ", deals: 1 })]);
    expect(data).toMatchObject({ rows_inserted: 0, rows_updated: 1, campaigns_created: 0 });
    const saved = await weeks();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ spend: 10, deals: 1, source: "import" });
  });

  it("saves nothing when one row breaks a rule", async () => {
    const { error } = await commit([row({ spend: 100 }), row({ name: "Bad", week_start: "2026-11-02", spend: 5 })]);
    expect(error?.code).toBe("23514");
    const { count } = await b.client.from("campaigns").select("id", { count: "exact", head: true });
    expect(count).toBe(0);
    expect(await weeks()).toHaveLength(0);

    const negative = await commit([row({ name: "Neg", spend: -1 })]);
    expect(negative.error?.code).toBe("23514");
    const leadsFraction = await commit([row({ name: "Frac", leads: 2.5 as never })]);
    expect(leadsFraction.error).not.toBeNull();
    const { count: after } = await b.client.from("campaigns").select("id", { count: "exact", head: true });
    expect(after).toBe(0);
  });

  it("rejects two rows for the same campaign and week, and an empty import", async () => {
    const duplicate = await commit([row({ spend: 1 }), row({ name: "import test", spend: 2 })]);
    expect(duplicate.error).not.toBeNull();
    expect(await weeks()).toHaveLength(0);

    const empty = await commit([]);
    expect(empty.error?.code).toBe("22023");
  });
});
