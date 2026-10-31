import "server-only";

export type SupabaseHealth = "ok" | "missing_config" | "error";

// Checks that the configured Supabase project is reachable and accepts our
// publishable/anon key. Never returns or logs the key itself.
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return "missing_config";

  try {
    const res = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
