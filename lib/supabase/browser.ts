"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client, acting as the signed-in user. Used only for direct file uploads. */
export function createBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
