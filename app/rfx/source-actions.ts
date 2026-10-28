"use server";

import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { requireUser } from "@/lib/data";
import type { Source } from "@/lib/engine/comparison";
import type { RawQuote } from "@/lib/engine/types";
import { loadAttachmentBytes } from "@/lib/pipeline/process";
import { asQuoted } from "@/lib/quote-text";
import type { Attachment } from "@/lib/types";

export type SourceView =
  | { type: "excel"; sheet: string; columns: string[]; rows: { r: number; cells: string[] }[]; highlight: { r: number; c: number } | null }
  | { type: "word"; paragraphs: string[]; highlight: number | null; snippet: string }
  | { type: "text"; subject: string; body: string; snippet: string; day: number }
  | { type: "pdf"; url: string; page: number; snippet: string }
  | { type: "photo"; url: string; bbox: [number, number, number, number] | null }
  | { type: "contract"; contract_no: string; valid_from: string; valid_to: string; line_no: number; description: string; price: number }
  | { type: "manual"; note: string }
  | { type: "none" };

export type SourcePayload = {
  vendor: { code: string; name: string };
  line: { id: string; line_no: number; description: string } | null;
  quote: { id: string; provenance: string; confidence: string; contract_ref: string | null; quoted: string; review: string; created_at: string } | null;
  source: Source | null;
  attachment: { id: string; filename: string; kind: string } | null;
  view: SourceView;
  history: { id: string; quoted: string; provenance: string; created_at: string; replaced_at: string | null; current: boolean }[];
};

const norm = (s: string) => s.replace(/[\s,₹]/g, "").toLowerCase();
const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Evidence for one value (FR-4.9): the original file, the exact place, and the value's history. */
export async function getSourceView(args: { quoteId?: string; issueId?: string }): Promise<SourcePayload> {
  const { supabase } = await requireUser();
  let q: { id: string; vendor_id: string; line_item_id: string; message_id: string | null; raw: RawQuote; source: Source | null; provenance: string; confidence: string; contract_ref: string | null; review: string; created_at: string } | null = null;
  let source: Source | null = null;
  let vendorId: string;
  let lineId: string | null = null;
  if (args.quoteId) {
    const { data } = await supabase.from("quote_values").select("*").eq("id", args.quoteId).single();
    q = data;
    if (!q) throw new Error("Not found");
    source = q.source;
    vendorId = q.vendor_id;
    lineId = q.line_item_id;
  } else {
    const { data: issue } = await supabase.from("issues").select("*").eq("id", args.issueId!).single();
    if (!issue) throw new Error("Not found");
    source = issue.source;
    vendorId = issue.vendor_id;
    lineId = issue.line_item_id;
  }

  const [{ data: vendor }, { data: line }, { data: hist }] = await Promise.all([
    supabase.from("vendors").select("code, name").eq("id", vendorId).single(),
    lineId ? supabase.from("line_items").select("id, line_no, description, spec_key").eq("id", lineId).single() : Promise.resolve({ data: null }),
    lineId ? supabase.from("quote_values").select("id, raw, provenance, created_at, replaced_at, is_current").eq("vendor_id", vendorId).eq("line_item_id", lineId).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  let attachment: Attachment | null = null;
  if (source?.attachment_id) {
    const { data } = await supabase.from("attachments").select("*").eq("id", source.attachment_id).single<Attachment>();
    attachment = data;
  }

  let view: SourceView = { type: "none" };
  if (q?.provenance === "contract") {
    const { data: c } = await supabase.from("contracts").select("contract_no, valid_from, valid_to, contract_lines(line_no, description, price)").eq("contract_no", q.contract_ref ?? "").single();
    const cl = (c?.contract_lines as { line_no: number; description: string; price: number }[] | undefined)?.find((x) => x.line_no === line?.line_no);
    if (c && cl) view = { type: "contract", contract_no: c.contract_no, valid_from: c.valid_from, valid_to: c.valid_to, line_no: cl.line_no, description: cl.description, price: Number(cl.price) };
  } else if (q?.provenance === "manual") {
    view = { type: "manual", note: source?.snippet ?? "Entered by the buyer" };
  } else if (attachment && source) {
    const url = `/api/files/${attachment.id}`;
    if (attachment.kind === "photo") view = { type: "photo", url, bbox: source.bbox };
    else if (attachment.kind === "pdf" || attachment.kind === "certificate") view = { type: "pdf", url, page: source.page ?? 1, snippet: source.snippet.replace(/ \(number not found in source\)$/, "") };
    else if (attachment.kind === "excel") view = await excelView(await loadAttachmentBytes(supabase, attachment), source);
    else if (attachment.kind === "word") view = await wordView(await loadAttachmentBytes(supabase, attachment), source.snippet);
  } else if (source) {
    const messageId = (source as Source & { message_id?: string }).message_id ?? q?.message_id;
    const { data: m } = messageId ? await supabase.from("messages").select("subject, body, day").eq("id", messageId).single() : { data: null };
    if (m) view = { type: "text", subject: m.subject, body: m.body, snippet: source.snippet, day: m.day };
  }

  return {
    vendor: vendor!,
    line: line ? { id: line.id, line_no: line.line_no, description: line.description } : null,
    quote: q ? { id: q.id, provenance: q.provenance, confidence: q.confidence, contract_ref: q.contract_ref, quoted: asQuoted(q.raw), review: q.review, created_at: q.created_at } : null,
    source,
    attachment: attachment ? { id: attachment.id, filename: attachment.filename, kind: attachment.kind } : null,
    view,
    history: (hist ?? []).map((h) => ({ id: h.id, quoted: asQuoted(h.raw as RawQuote), provenance: h.provenance, created_at: h.created_at, replaced_at: h.replaced_at, current: h.is_current })),
  };
}

async function excelView(buf: Buffer, source: Source): Promise<SourceView> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const [sheetName, addr] = (source.cell ?? source.ref).includes("!") ? (source.cell ?? source.ref).split("!") : [wb.worksheets[0].name, source.cell ?? ""];
  const ws = wb.getWorksheet(sheetName) ?? wb.worksheets[0];
  const m = /^([A-Z]+)(\d+)$/.exec(addr ?? "");
  const highlight = m ? { r: Number(m[2]), c: COLS.indexOf(m[1]) } : null;
  const maxCol = Math.min(ws.columnCount || 6, 8);
  const rows: { r: number; cells: string[] }[] = [];
  ws.eachRow({ includeEmpty: true }, (row, r) => {
    if (r > 60) return;
    const cells = Array.from({ length: maxCol }, (_, i) => {
      const v = row.getCell(i + 1).value;
      if (v === null || v === undefined) return "";
      if (typeof v === "object" && "richText" in v) return v.richText.map((x) => x.text).join("");
      if (typeof v === "object" && "result" in v) return String(v.result ?? "");
      return String(v);
    });
    rows.push({ r, cells });
  });
  return { type: "excel", sheet: ws.name, columns: COLS.slice(0, maxCol).split(""), rows, highlight };
}

async function wordView(buf: Buffer, snippet: string): Promise<SourceView> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const paragraphs = value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const s = norm(snippet);
  const idx = paragraphs.findIndex((p) => norm(p).includes(s));
  return { type: "word", paragraphs, highlight: idx >= 0 ? idx : null, snippet };
}
