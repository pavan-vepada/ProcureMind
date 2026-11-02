import { displayName, getRfx } from "@/lib/data";
import type { MemoContent } from "@/lib/memo";
import { MemoView } from "./memo-view";

/** Award tab: the award memo. */
export default async function AwardPage(props: PageProps<"/rfx/[id]/award">) {
  const { id } = await props.params;
  const { supabase, rfx, user } = await getRfx(id);
  const { data: memo } = await supabase.from("award_memos").select("*").eq("rfx_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return <MemoView rfx={rfx} preparedBy={displayName(user.email)} memo={memo ? { id: memo.id, created_at: memo.created_at, content: memo.content as MemoContent } : null} />;
}
