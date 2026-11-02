import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processRun } from "@/lib/pipeline/process";

export const maxDuration = 300;

/** Processes one reply. The inbox calls this for every queued reply at once, so all run in parallel. */
export async function POST(req: Request, ctx: RouteContext<"/api/runs/[id]/process">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { savedRun?: boolean };
  const run = await processRun(supabase, id, { savedRun: body.savedRun === true });
  return NextResponse.json({ run });
}
