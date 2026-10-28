import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import type { Line } from "@/lib/engine/types";
import type { Rfx } from "@/lib/types";

/** FR-1.8: the Excel response template vendors receive. */
export async function GET(_req: Request, ctx: RouteContext<"/api/rfx/[id]/template">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Not signed in", { status: 401 });
  const { data: rfx } = await supabase.from("rfx").select("*").eq("id", id).maybeSingle<Rfx>();
  const { data: lines } = await supabase.from("line_items").select("*").eq("rfx_id", id).order("line_no");
  const { data: questions } = await supabase.from("questions").select("*").eq("rfx_id", id).order("q_no");
  if (!rfx || !lines?.length) return new Response("Draft the RFQ first.", { status: 409 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Prices");
  ws.addRow([`${rfx.code} · ${rfx.title} · ${rfx.buyer_company}`]).font = { bold: true, size: 13 };
  ws.addRow(["Quote per piece, in ₹, excluding GST, delivered to each plant. Add volume-tier prices if you offer them."]);
  ws.addRow([]);
  const header = ws.addRow(["Line", "Item code", "Description", "Ply", "GSM", "Flute", "Size (mm)", "Plant 1 pcs/yr", "Plant 2 pcs/yr", "Price per piece (₹)", "Tier price (₹)", "Tier from (pcs/yr)"]);
  header.font = { bold: true };
  header.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } }));
  for (const l of lines as Line[]) {
    ws.addRow([l.line_no, l.item_code, l.description, l.ply, l.gsm, l.flute, `${l.length_mm}×${l.width_mm}${l.height_mm ? `×${l.height_mm}` : ""}`, l.qty_p1, l.qty_p2, null, null, null]);
  }
  ws.columns.forEach((c, i) => (c.width = [6, 10, 34, 5, 6, 7, 16, 14, 14, 18, 14, 16][i]));
  const q = wb.addWorksheet("Questionnaire");
  q.addRow(["Q", "Requirement", "Your answer"]).font = { bold: true };
  for (const x of questions ?? []) q.addRow([x.q_no, x.text, null]);
  q.getColumn(2).width = 60;
  q.getColumn(3).width = 50;
  const t = wb.addWorksheet("Terms");
  for (const row of [["Payment terms (days)", rfx.payment_days ?? 60], ["Quote validity (days)", rfx.validity_days ?? 90], ["Lead time (days)", null], ["Freight to both plants", "Included / extra (state amount)"]]) t.addRow(row);
  t.getColumn(1).width = 28;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${rfx.code}-response-template.xlsx"`,
    },
  });
}
