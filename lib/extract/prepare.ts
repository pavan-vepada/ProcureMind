// Step 2 of the reply pipeline (architecture A2): turn each file into text where every value has an
// address (cell, paragraph, page/line), or an image for photos. Deterministic; no AI.
import ExcelJS from "exceljs";
import mammoth from "mammoth";

export type FileKind = "excel" | "pdf" | "word" | "photo" | "certificate" | "text";

export type Prepared = {
  filename: string | null; // null = the email body
  kind: FileKind;
  text: string; // what the model reads (empty for photos)
  imageDataUrl: string | null;
  numbers: Set<string>; // every number in the source, for the "must appear in the source" check
};

const NUM = /\d[\d,]*(?:\.\d+)?/g;

export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(NUM)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) out.add(String(n));
  }
  return out;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return String(v.result ?? "");
    if ("text" in v) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

async function excel(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const out: string[] = [];
  wb.eachSheet((ws) => {
    out.push(`=== Sheet "${ws.name}" ===`);
    const merges = (ws.model as { merges?: string[] }).merges ?? [];
    if (merges.length) out.push(`(merged cells: ${merges.join(", ")})`);
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (c) => {
        if (c.isMerged && c.master.address !== c.address) return;
        const t = cellText(c.value).trim();
        if (t) cells.push(`${ws.name}!${c.address}: ${t}`);
      });
      if (cells.length) out.push(cells.join(" | "));
    });
  });
  return out.join("\n");
}

async function word(buf: Buffer) {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => `¶${i + 1}: ${p}`)
    .join("\n");
}

async function pdf(buf: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 });
  const doc = await task.promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group fragments into visual lines by their y position, left to right.
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      rows.set(key, [...(rows.get(key) ?? []), { x: item.transform[4], s: item.str.trim() }]);
    }
    out.push(`=== Page ${p} ===`);
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags], i) => out.push(`p${p} l${i + 1}: ${frags.sort((a, b) => a.x - b.x).map((f) => f.s).join(" | ")}`));
  }
  await task.destroy();
  return out.join("\n");
}

export function emailText(body: string) {
  return body
    .split("\n")
    .map((l, i) => `line ${i + 1}: ${l}`)
    .join("\n");
}

export async function prepare(filename: string | null, kind: FileKind, data: Buffer | string, mime?: string): Promise<Prepared> {
  if (kind === "text") {
    const text = emailText(String(data));
    return { filename, kind, text, imageDataUrl: null, numbers: numbersIn(String(data)) };
  }
  const buf = data as Buffer;
  if (kind === "photo") {
    return { filename, kind, text: "", imageDataUrl: `data:${mime ?? "image/jpeg"};base64,${buf.toString("base64")}`, numbers: new Set() };
  }
  const text = kind === "excel" ? await excel(buf) : kind === "word" ? await word(buf) : await pdf(buf);
  return { filename, kind, text, imageDataUrl: null, numbers: numbersIn(text) };
}

/** Guess the kind of an uploaded file from its name and type. */
export function kindOf(filename: string, mime: string): FileKind | null {
  const f = filename.toLowerCase();
  if (/\.(xlsx|xlsm)$/.test(f) || mime.includes("spreadsheetml")) return "excel";
  if (f.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (f.endsWith(".docx") || mime.includes("wordprocessingml")) return "word";
  if (/\.(jpe?g|png|webp)$/.test(f) || mime.startsWith("image/")) return "photo";
  if (/\.(txt|eml)$/.test(f) || mime.startsWith("text/")) return "text";
  return null;
}
