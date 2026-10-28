"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, seedDemo } from "@/lib/data";

/** Reset demo (FR-0.5): replaces the user's data with a fresh demo copy. */
export async function resetDemo() {
  const { supabase } = await requireUser();
  await seedDemo(supabase);
  redirect("/rfx");
}

/** Marks tour steps before `step` as done. Never moves the tour backwards. */
export async function completeTourStep(step: number) {
  if (!Number.isInteger(step) || step < 1 || step > 10) return;
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("rfx")
    .update({ tour_step: step })
    .eq("owner_id", user.id)
    .lt("tour_step", step);
  if (error) throw new Error(`Could not update the tour: ${error.message}`);
  refresh();
}

export async function setTourHidden(hidden: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("rfx").update({ tour_hidden: hidden }).eq("owner_id", user.id);
  if (error) throw new Error(`Could not update the tour: ${error.message}`);
  refresh();
}
