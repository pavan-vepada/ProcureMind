import { redirect } from "next/navigation";
import { CompleteTourStep } from "@/components/shell/complete-tour-step";
import { getAnalysis } from "@/lib/data";
import { CompareView } from "./compare-view";
import { compareData } from "./data";

/** S7 / S7b / S8 / S10: the comparison matrix with the Ask panel, source drawer and clarification composer. */
export default async function ComparePage(props: PageProps<"/rfx/compare">) {
  const sp = await props.searchParams;
  const a = await getAnalysis();
  if (!a.input.lines.length) redirect("/rfx/rfq");
  const { count: memo } = await a.supabase.from("award_memos").select("id", { count: "exact", head: true });
  const data = { ...compareData(a), hasMemo: (memo ?? 0) > 0 };
  return (
    <>
      <CompleteTourStep step={5} stage="analysis" />
      <CompareView data={data} focusVendor={typeof sp.vendor === "string" ? sp.vendor : null} />
    </>
  );
}
