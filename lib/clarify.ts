// Improvement A (FR-4.7): one consolidated, targeted clarification email per vendor, from its open issues.
import type { Line } from "@/lib/engine/types";
import type { IssueRecord, Rfx, VendorRecord } from "@/lib/types";

export type ClarificationDraft = { to: string; subject: string; body: string; issueIds: string[]; items: string[] };

const join = (xs: (string | number)[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function draftClarification(rfx: Rfx, vendor: VendorRecord, issues: IssueRecord[], lines: Line[]): ClarificationDraft {
  const open = issues.filter((i) => i.vendor_id === vendor.id && i.status === "open" && i.askable);
  const lineNo = (id: string | null) => lines.find((l) => l.id === id)?.line_no;
  const items: string[] = [];
  const ids: string[] = [];
  const take = (kind: string) => open.filter((i) => i.kind === kind);

  const missing = take("missing");
  if (missing.length) {
    const nos = missing.map((i) => lineNo(i.line_item_id)!).sort((a, b) => a - b);
    items.push(`Quote lines ${join(nos)}, which were missing (you quoted ${lines.length - nos.length} of ${lines.length}).`);
    ids.push(...missing.map((i) => i.id));
  }
  const noHistory = take("no_history");
  if (noHistory.length) {
    const nos = noHistory.map((i) => lineNo(i.line_item_id)!).sort((a, b) => a - b);
    items.push(`Quote line${nos.length > 1 ? "s" : ""} ${join(nos)}: ${nos.length > 1 ? "these are" : "this is"} new this year, so “same as last year” doesn't cover ${nos.length > 1 ? "them" : "it"}.`);
    ids.push(...noHistory.map((i) => i.id));
  }
  const unreadable = [...take("unreadable"), ...take("low_confidence")];
  if (unreadable.length) {
    const nos = unreadable.map((i) => lineNo(i.line_item_id)).filter(Boolean) as number[];
    items.push(`Confirm the price for line${nos.length > 1 ? "s" : ""} ${join(nos.sort((a, b) => a - b))}; part of your rate card isn't readable in the photo.`);
    ids.push(...unreadable.map((i) => i.id));
  }
  for (const i of take("freight")) {
    items.push("Tell us the freight cost per piece to Plant 1 (Pune) and Plant 2 (Nashik); your reply says “freight extra”.");
    ids.push(i.id);
  }
  for (const i of take("terms")) {
    items.push(`Confirm whether you can offer ${rfx.payment_days ?? 60}-day payment terms (${i.title.match(/\d+/)?.[0] ?? "a shorter term"} days were quoted).`);
    ids.push(i.id);
  }
  for (const i of take("discount")) {
    items.push(`Confirm how the ${vendor.discount?.pct ?? 5}% volume discount applies: per order or per year, and to which items?`);
    ids.push(i.id);
  }
  for (const i of take("certificate")) {
    items.push(`Send your renewed certificate: ${i.title.replace(/ expired.*/, "")} on file has expired.`);
    ids.push(i.id);
  }
  for (const i of take("mapping")) {
    items.push(`Clarify which RFQ line this refers to: ${i.title.replace(/^Couldn't match /, "").replace(/ to an RFQ line$/, "")}.`);
    ids.push(i.id);
  }

  const first = vendor.name.split(" ")[0];
  const body = `Dear ${first} team,

Thank you for your quote against ${rfx.code}. To include it fully in our evaluation, please:

${items.map((t, n) => `${n + 1}. ${t}`).join("\n")}

Reply directly to this email and we will update your quote automatically.

Regards,
Pavan
Procurement, ${rfx.buyer_company}`;

  return {
    to: vendor.email,
    subject: `${rfx.code} · ${items.length === 1 ? "one item" : `${items.length} items`} to complete your quote`,
    body,
    issueIds: ids,
    items,
  };
}
