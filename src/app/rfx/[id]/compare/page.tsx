import { redirect } from "next/navigation";
import { MarkStage } from "@/components/mark-stage";
import { getAnalysis } from "@/lib/data";
import { CompareView } from "./compare-view";
import { compareData } from "./data";

/** Comparison tab: matrix, Ask panel, source drawer and clarification composer. */
export default async function ComparePage(props: PageProps<"/rfx/[id]/compare">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const a = await getAnalysis(id);
  if (!a.input.lines.length) redirect(`/rfx/${id}/rfq`);
  const data = compareData(a);
  return (
    <>
      {a.rfx.stage === "replies" && <MarkStage rfxId={id} stage="analysis" />}
      <CompareView data={data} focusVendor={typeof sp.vendor === "string" ? sp.vendor : null} />
    </>
  );
}
