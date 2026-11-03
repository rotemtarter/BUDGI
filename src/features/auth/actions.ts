"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  // Ends this browser's session only, not the user's other devices
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
