import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Runs before every page: refreshes the login session cookie, sends signed-out visitors
 * away from the workspace, and sends signed-in visitors from the landing page into it.
 * This is a convenience redirect only; every page and action checks the user again.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (!signedIn && path.startsWith("/rfx")) return redirectTo("/", request, response);
  if (signedIn && path === "/") return redirectTo("/rfx", request, response);

  // Presenter-only fallback (PRD §6): ?savedRun=1 switches seeded replies to the recorded reading, ?savedRun=0 back.
  const saved = request.nextUrl.searchParams.get("savedRun");
  if (saved === "1") response.cookies.set("pm_saved_run", "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12 });
  if (saved === "0") response.cookies.delete("pm_saved_run");
  return response;
}

function redirectTo(path: string, request: NextRequest, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  // Keep any refreshed session cookies.
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
