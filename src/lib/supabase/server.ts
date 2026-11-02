import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Next.js memoizes identical GET fetches within one render, so a read after a write (e.g. load the RFx,
 * create the demo copy, load it again) would return the stale first answer. A fresh signal opts out.
 * Data loaders that should run once per request are wrapped in React's cache() instead.
 */
const freshFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: init?.signal ?? new AbortController().signal });

/** A Supabase client acting as the signed-in user. Create a new one for every request. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    global: { fetch: freshFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts keeps the session fresh instead.
        }
      },
    },
  });
}
