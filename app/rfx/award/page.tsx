import { getAnalysis } from "@/lib/data";
import type { MemoContent } from "@/lib/memo";
import { MemoView } from "./memo-view";

/** S12: the award memo. */
export default async function AwardPage() {
  const a = await getAnalysis();
  const { data: memo } = await a.supabase.from("award_memos").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return <MemoView rfx={a.rfx} memo={memo ? { id: memo.id, created_at: memo.created_at, content: memo.content as MemoContent } : null} />;
}
