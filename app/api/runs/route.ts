import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Live progress for one RFx's replies (polled every second, FR-3.2). */
export async function GET(req: Request) {
  const rfx = new URL(req.url).searchParams.get("rfx");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!rfx) return NextResponse.json({ error: "Missing rfx" }, { status: 400 });
  const { data, error } = await supabase
    .from("processing_runs")
    .select("id, rfx_id, message_id, vendor_id, status, step, progress, lines_found, error, summary, started_at, finished_at, created_at")
    .eq("rfx_id", rfx)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data }, { headers: { "Cache-Control": "no-store" } });
}
