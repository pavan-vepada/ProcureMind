import { getAnalysis } from "@/lib/data";
import { dataset, STANDARD_QUESTIONS } from "@/lib/demo/datasets";
import { RfqWorkspace } from "./rfq-workspace";

/** RFQ tab: co-pilot draft, evaluation rules, lock and send; after sending, what went out. */
export default async function RfqPage(props: PageProps<"/rfx/[id]/rfq">) {
  const { id } = await props.params;
  const a = await getAnalysis(id);
  // Before the draft is saved, show the standard questionnaire it will use, so the rules panel is never empty.
  const questions = a.input.questions.length ? a.input.questions : (STANDARD_QUESTIONS as typeof a.input.questions);
  return (
    <RfqWorkspace rfx={a.rfx} lines={a.input.lines} questions={questions} vendors={a.vendors}
      outgoing={a.messages.filter((m) => m.kind === "rfq")} hasSheet={!!dataset(a.rfx.dataset)} />
  );
}
