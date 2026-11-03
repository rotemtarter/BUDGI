import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser client, used only to start the Google OAuth redirect
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
