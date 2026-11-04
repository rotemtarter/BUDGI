import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Ends a session whose account was deleted (on another device, ADR-15):
// removes this browser's session cookies and goes to the login screen.
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The user no longer exists; the local cookies are removed either way
  }
  const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
