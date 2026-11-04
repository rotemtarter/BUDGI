import { afterAll, describe, expect, it } from "vitest";
import { deleteUserAccount } from "@/server/services/account";
import { signInTestUser } from "../support/test-users";
import { authUserExists, countUserRows, createTempUser, removeTempUser, seedEverything, USER_TABLES } from "../support/temp-user";

// Account deletion in budgi-dev (PRD 4.9, ARCHITECTURE.md 6.5, ADR-15), on a
// temporary user so test users A and B are never deleted.
let tempUserId: string | undefined;

afterAll(async () => {
  await removeTempUser(tempUserId);
});

describe("account deletion", () => {
  it("deletes the user and every row of their data", async () => {
    const user = await createTempUser();
    tempUserId = user.userId;
    await seedEverything(user);

    const before = await countUserRows(user.userId);
    for (const table of USER_TABLES) expect(before[table], table).toBeGreaterThan(0);

    await deleteUserAccount(user.userId);

    expect(await authUserExists(user.userId)).toBe(false);
    const after = await countUserRows(user.userId);
    for (const table of USER_TABLES) expect(after[table], table).toBe(0);
  });

  it("does not touch other users' data", async () => {
    const b = await signInTestUser("B");
    const before = await countUserRows(b.userId);

    const user = await createTempUser();
    tempUserId = user.userId;
    await deleteUserAccount(user.userId);

    expect(await authUserExists(b.userId)).toBe(true);
    expect(await countUserRows(b.userId)).toEqual(before);
  });
});
