import { NextResponse } from "next/server";
import { z } from "zod";
import { ask } from "@/lib/ask/engine";
import { getAnalysis } from "@/lib/data";
import { aiConfigured } from "@/lib/ai/client";

export const maxDuration = 120;

const DAILY_LIMIT = 80;
const Body = z.object({ rfxId: z.uuid(), question: z.string().trim().min(2).max(500) });

/** FR-5: a question in, a computed answer out. Saves both to the RFx's conversation. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  if (!aiConfigured()) return NextResponse.json({ error: "The AI service isn't configured." }, { status: 503 });

  const a = await getAnalysis(parsed.data.rfxId);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await a.supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: `Daily limit of ${DAILY_LIMIT} questions reached.` }, { status: 429 });
  if (!a.comparison.vendors.some((v) => v.processed)) return NextResponse.json({ error: "No vendor replies have been read yet." }, { status: 409 });

  await a.supabase.from("chat_messages").insert({ rfx_id: a.rfx.id, role: "user", content: parsed.data.question });
  let result;
  try {
    result = await ask(parsed.data.question, { input: a.input, comparison: a.comparison, contracts: a.scenarioContracts, issues: a.issues, history: a.chat });
  } catch {
    result = { content: "The AI service didn't respond. Try again in a moment.", payload: { kind: "error" as const } };
  }
  const { data } = await a.supabase.from("chat_messages").insert({ rfx_id: a.rfx.id, role: "assistant", content: result.content, payload: result.payload }).select().single();
  await a.supabase.from("rfx").update({ updated_at: new Date().toISOString() }).eq("id", a.rfx.id);
  return NextResponse.json({ message: data });
}
