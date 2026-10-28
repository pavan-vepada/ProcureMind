import { cookies } from "next/headers";
import { CompleteTourStep } from "@/components/shell/complete-tour-step";
import { getAnalysis } from "@/lib/data";
import { InboxView } from "./inbox-view";

/** S6: replies, arrival days, live progress per vendor, upload a reply. */
export default async function InboxPage(props: PageProps<"/rfx/inbox">) {
  const sp = await props.searchParams;
  const cookie = (await cookies()).get("pm_saved_run")?.value === "1";
  const savedRun = sp.savedRun === "1" || (cookie && sp.savedRun !== "0");
  const a = await getAnalysis();
  const incoming = a.messages.filter((m) => m.direction === "in").sort((x, y) => y.day - x.day || y.created_at.localeCompare(x.created_at));
  return (
    <>
      {incoming.length > 0 && <CompleteTourStep step={4} />}
      <InboxView rfx={a.rfx} userId={a.user.id} vendors={a.vendors} messages={incoming} attachments={a.attachments} runs={a.runs} savedRun={savedRun} />
    </>
  );
}
