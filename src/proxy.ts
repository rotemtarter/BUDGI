import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Pages that work without signing in
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/auth/callback",
  "/auth/confirm",
  "/auth/signout",
];

// Screens for signed-out users; a signed-in user goes home instead
const SIGNED_OUT_ONLY = ["/", "/login", "/signup", "/forgot-password"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname } = request.nextUrl;

  let target: string | null = null;
  if (!userId && !isPublic(pathname)) target = "/login";
  else if (userId && SIGNED_OUT_ONLY.includes(pathname)) target = "/dashboard";

  if (!target) return response;

  // Keep any refreshed session cookies on the redirect
  const redirect = NextResponse.redirect(new URL(target, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
