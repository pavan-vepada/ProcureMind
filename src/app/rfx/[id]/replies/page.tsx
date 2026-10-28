import { cookies } from "next/headers";
import { getAnalysis } from "@/lib/data";
import { dataset } from "@/lib/demo/datasets";
import { InboxView } from "./inbox-view";

/** Replies tab: what each vendor sent, read live by the AI, plus upload. */
export default async function RepliesPage(props: PageProps<"/rfx/[id]/replies">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const cookie = (await cookies()).get("pm_saved_run")?.value === "1";
  const savedRun = sp.savedRun === "1" || (cookie && sp.savedRun !== "0");
  const a = await getAnalysis(id);
  const incoming = a.messages.filter((m) => m.direction === "in").sort((x, y) => y.received_at.localeCompare(x.received_at));
  const ds = dataset(a.rfx.dataset);
  const samplesLeft = !!ds && !!a.rfx.sent_at && a.vendors.filter((v) => !incoming.some((m) => m.vendor_id === v.id) && ds.replies.some((r) => r.vendor_code === v.code)).length;
  return (
    <InboxView rfx={a.rfx} userId={a.user.id} vendors={a.vendors} messages={incoming} attachments={a.attachments} runs={a.runs}
      savedRun={savedRun} samplesLeft={samplesLeft || 0} />
  );
}
