import { getAnalysis } from "@/lib/data";
import { compareData } from "../compare/data";
import { ReviewView } from "./review-view";

/** Review tab: every flag in one list, each beside its source, each with its fix. */
export default async function ReviewPage(props: PageProps<"/rfx/[id]/review">) {
  const { id } = await props.params;
  const a = await getAnalysis(id);
  const lineNo = new Map(a.input.lines.map((l) => [l.id, l.line_no]));
  const issues = a.issues
    .filter((i) => i.status !== "resolved")
    .map((i) => ({ ...i, vendor_code: a.vendors.find((v) => v.id === i.vendor_id)!.code, line_no: i.line_item_id ? lineNo.get(i.line_item_id) ?? null : null }));
  const quoteIdFor = Object.fromEntries(a.input.quotes.map((q) => [`${q.vendor_id}|${q.line_item_id}`, q.id]));
  const d = compareData(a);
  return <ReviewView rfxId={id} issues={issues} vendors={d.vendors} drafts={d.drafts} changes={a.changes} quoteIdFor={quoteIdFor} resolvedCount={a.issues.length - issues.length} />;
}
