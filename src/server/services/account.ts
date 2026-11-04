import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Deletes the user from auth.users; every business table references it with
// `on delete cascade`, so all of the user's data goes with it (ARCHITECTURE.md 6.5).
export async function deleteUserAccount(userId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
