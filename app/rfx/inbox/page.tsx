import { CompleteTourStep } from "@/components/shell/complete-tour-step";
import { getAnalysis } from "@/lib/data";
import { InboxView } from "./inbox-view";

/** S6: replies, arrival days, live progress per vendor, upload a reply. */
export default async function InboxPage(props: PageProps<"/rfx/inbox">) {
  const sp = await props.searchParams;
  const a = await getAnalysis();
  const incoming = a.messages.filter((m) => m.direction === "in").sort((x, y) => y.day - x.day || y.created_at.localeCompare(x.created_at));
  return (
    <>
      {incoming.length > 0 && <CompleteTourStep step={4} />}
      <InboxView
        rfx={a.rfx}
        userId={a.user.id}
        vendors={a.vendors}
        messages={incoming}
        attachments={a.attachments}
        runs={a.runs}
        savedRun={sp.savedRun === "1"}
      />
    </>
  );
}
