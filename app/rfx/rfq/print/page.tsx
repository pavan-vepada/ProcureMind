import { getAnalysis } from "@/lib/data";
import { PrintButton } from "./print-button";

/** FR-1.8: the RFQ document vendors receive. Print or save as PDF from the browser. */
export default async function RfqPrint() {
  const { rfx, input } = await getAnalysis();
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white p-10 text-[13px]">
      <div className="mx-auto max-w-4xl">
        <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
        <h1 className="text-2xl font-semibold">{rfx.buyer_company} · Request for Quotation</h1>
        <p className="mt-1 text-muted">{rfx.code} · {rfx.title} · Reply by Day {rfx.due_day}</p>
        <pre className="mt-6 whitespace-pre-wrap font-sans leading-relaxed">{rfx.cover_email}</pre>
        <h2 className="mt-8 text-lg font-semibold">Line items</h2>
        <table className="mt-2 w-full border-collapse">
          <thead><tr className="bg-panel text-left">{["#", "Code", "Description", "Ply/GSM", "Flute", "Size mm", "Plant 1/yr", "Plant 2/yr"].map((h) => <th key={h} className="border border-line px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {input.lines.map((l) => (
              <tr key={l.id}>
                <td className="border border-line px-2 py-1">{l.line_no}</td>
                <td className="border border-line px-2 py-1">{l.item_code}</td>
                <td className="border border-line px-2 py-1">{l.description}</td>
                <td className="border border-line px-2 py-1">{l.ply}/{l.gsm}</td>
                <td className="border border-line px-2 py-1">{l.flute}</td>
                <td className="border border-line px-2 py-1">{l.length_mm}×{l.width_mm}{l.height_mm ? `×${l.height_mm}` : ""}</td>
                <td className="border border-line px-2 py-1 text-right">{l.qty_p1.toLocaleString("en-IN")}</td>
                <td className="border border-line px-2 py-1 text-right">{l.qty_p2.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-8 text-lg font-semibold">Supplier questionnaire</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-6">{input.questions.map((q) => <li key={q.q_no}>{q.text}{q.required ? " (required)" : ""}</li>)}</ol>
        <h2 className="mt-8 text-lg font-semibold">Terms</h2>
        <p className="mt-2">Payment {rfx.payment_days ?? 60} days · Quote validity {rfx.validity_days ?? 90} days · Prices per piece, excluding GST, delivered to Plant 1 (Pune) and Plant 2 (Nashik).</p>
      </div>
    </div>
  );
}
