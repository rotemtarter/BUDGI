import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACCOUNT_MESSAGES, deleteAccountSchema } from "@/lib/validation/account";
import { deleteUserAccount } from "@/server/services/account";

// Account deletion (ARCHITECTURE.md 6.5, ADR-15): checks the session and the
// typed confirmation, deletes the user and all data, then clears this
// browser's session cookies. Logs never include user details (8.2).

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return json({ ok: false, message: ACCOUNT_MESSAGES.signedOut }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!deleteAccountSchema.safeParse(body).success) {
    return json({ ok: false, message: ACCOUNT_MESSAGES.notConfirmed }, 400);
  }

  const requestId = randomUUID();
  try {
    await deleteUserAccount(userId);
  } catch (error) {
    console.error("deleteAccount failed", { requestId, code: (error as { code?: string }).code });
    return json({ ok: false, message: ACCOUNT_MESSAGES.failed }, 500);
  }

  // The user no longer exists, so the sign-out request may fail on the
  // server; the local cookies are removed either way.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore: the account is already deleted
  }
  console.info("deleteAccount", { requestId, outcome: "ok", env: process.env.APP_ENV });
  return json({ ok: true });
}
