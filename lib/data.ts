// Data access layer: every read of the user's data goes through here, after checking the session.
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildSeedArgs } from "@/lib/demo/seed";
import type { RfiResponse, Rfx, Vendor } from "@/lib/types";

/** The signed-in user, verified with Supabase. Redirects to the landing page if signed out. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  return { supabase, user: data.user };
});

/** Replaces the user's demo copy with a fresh one (first login and Reset demo). */
export async function seedDemo(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("seed_demo", buildSeedArgs());
  if (error) throw new Error(`Could not create the demo copy: ${error.message}`);
}

async function loadRfx(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("rfx").select("*").maybeSingle<Rfx>();
  if (error) throw new Error(`Could not load the RFx: ${error.message}`);
  return data;
}

/** The user's RFx with its vendors and RFI results. Creates the demo copy on first visit (FR-0.4). */
export const getWorkspace = cache(async () => {
  const { supabase, user } = await requireUser();

  let rfx = await loadRfx(supabase);
  if (!rfx) {
    try {
      await seedDemo(supabase);
    } catch (err) {
      // Two first-visit requests can race; if the other one won, its copy is what we load.
      if (!(await loadRfx(supabase))) throw err;
    }
    rfx = await loadRfx(supabase);
  }
  if (!rfx) throw new Error("The demo copy could not be created.");

  const [vendors, rfi] = await Promise.all([
    supabase.from("vendors").select("*").eq("rfx_id", rfx.id).order("code").returns<Vendor[]>(),
    supabase.from("rfi_responses").select("*").eq("rfx_id", rfx.id).order("sort").returns<RfiResponse[]>(),
  ]);
  if (vendors.error) throw new Error(`Could not load vendors: ${vendors.error.message}`);
  if (rfi.error) throw new Error(`Could not load RFI results: ${rfi.error.message}`);

  return { user, rfx, vendors: vendors.data, rfi: rfi.data };
});
