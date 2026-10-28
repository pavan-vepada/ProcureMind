import { getAnalysis } from "@/lib/data";
import { dataset } from "@/lib/demo/datasets";
import { RfqWorkspace } from "./rfq-workspace";

/** RFQ tab: co-pilot draft, evaluation rules, lock and send; after sending, what went out. */
export default async function RfqPage(props: PageProps<"/rfx/[id]/rfq">) {
  const { id } = await props.params;
  const a = await getAnalysis(id);
  return (
    <RfqWorkspace rfx={a.rfx} lines={a.input.lines} questions={a.input.questions} vendors={a.vendors}
      outgoing={a.messages.filter((m) => m.kind === "rfq")} hasSheet={!!dataset(a.rfx.dataset)} />
  );
}
