import { getAnalysis } from "@/lib/data";
import { RfqWorkspace } from "./rfq-workspace";

/** S4: RFQ draft (co-pilot) with the evaluation-rules panel. */
export default async function RfqPage() {
  const a = await getAnalysis();
  return <RfqWorkspace rfx={a.rfx} lines={a.input.lines} questions={a.input.questions} />;
}
