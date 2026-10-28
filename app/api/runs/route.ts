import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Live progress for the inbox (polled every second, FR-3.2). */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supabase
    .from("processing_runs")
    .select("id, message_id, vendor_id, status, step, progress, lines_found, error, summary, started_at, finished_at")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data }, { headers: { "Cache-Control": "no-store" } });
}
