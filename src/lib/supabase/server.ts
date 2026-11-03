import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

// Supabase client bound to the signed-in user's cookies. All queries run as
// that user, so RLS applies. Create a new one per request.
export async function createSupabaseServerClient() {
  // Session checks compare token expiry with the current time, so they must
  // run at request time, never during prerendering
  await connection();
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session on the next request.
        }
      },
    },
  });
}
