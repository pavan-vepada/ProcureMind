import { redirect } from "next/navigation";
import { getAnalysis } from "@/lib/data";
import { SendView } from "./send-view";

/** S5: the outgoing emails and vendor statuses; Fast-forward brings the replies. */
export default async function SendPage() {
  const a = await getAnalysis();
  if (!a.rfx.sent_at) redirect("/rfx/rfq");
  const outgoing = a.messages.filter((m) => m.kind === "rfq");
  const replies = a.messages.filter((m) => m.direction === "in").length;
  return <SendView rfx={a.rfx} vendors={a.vendors} outgoing={outgoing} hasReplies={replies > 0} />;
}
