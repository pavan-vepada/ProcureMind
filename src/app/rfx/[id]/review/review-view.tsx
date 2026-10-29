"use client";

import { Check, CheckCheck, Eye, Mail, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptAllHighConfidence, acceptIssue, undoChange } from "@/app/rfx/actions";
import { ClarifyComposer } from "@/components/clarify-composer";
import { SourceDrawer, type DrawerTarget } from "@/components/source-drawer";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import type { ClarificationDraft } from "@/lib/clarify";
import type { ChangeLogEntry, IssueRecord } from "@/lib/types";
import type { VendorView } from "../compare/data";

type Issue = IssueRecord & { vendor_code: string; line_no: number | null };

const KIND: Record<string, string> = {
  mapping: "Mapping", gst: "GST removed", discount: "Discount scope", missing: "Missing line", terms: "Terms", unreadable: "Unreadable",
  certificate: "Certificate", freight: "Freight", no_history: "No history", low_confidence: "Low confidence", injection: "Suspicious text",
};

export function ReviewView({ rfxId, issues, vendors, drafts, changes, quoteIdFor, resolvedCount }: {
  rfxId: string; issues: Issue[]; vendors: VendorView[]; drafts: Record<string, ClarificationDraft>; changes: ChangeLogEntry[]; quoteIdFor: Record<string, string>; resolvedCount: number;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [composer, setComposer] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [pending, start] = useTransition();
  const open = issues.filter((i) => i.status === "open");
  const easy = open.filter((i) => i.confidence === "high" && !i.askable);
  const shown = issues.filter((i) => !filter || i.vendor_code === filter).sort((a, b) => a.vendor_code.localeCompare(b.vendor_code) || (a.line_no ?? 0) - (b.line_no ?? 0));
  const askableVendors = new Set(Object.keys(drafts));
  const name = (code: string) => vendors.find((v) => v.code === code)?.name.split(" ")[0] ?? code;

  return (
    <>
      <PageHeader
        title="Review queue"
        subtitle={`${open.length} item${open.length === 1 ? "" : "s"} need a look${issues.length > open.length ? ` · ${issues.length - open.length} asked, waiting for the supplier` : ""} · ${resolvedCount} resolved`}
        actions={
          easy.length > 0 && (
            <Button variant="secondary" disabled={pending} onClick={() => start(() => acceptAllHighConfidence(rfxId))} className="border-ok-line bg-ok">
              <CheckCheck size={15} /> Accept routine items ({easy.length})
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[null, ...vendors.map((v) => v.code)].map((c) => (
          <button key={c ?? "all"} onClick={() => setFilter(c)} className={`rounded-full px-3 py-1 text-sm ${filter === c ? "bg-accent-soft font-medium text-accent" : "border border-line text-muted hover:bg-panel"}`}>
            {c ? name(c) : "All"}{c && ` (${issues.filter((i) => i.vendor_code === c).length})`}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-xs text-muted">
            <tr>{["Kind", "Supplier", "What we found", "Source", "Reading", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} className="border-t border-line align-top">
                <td className="px-3 py-2.5"><Badge tone={i.kind === "missing" || i.kind === "unreadable" || i.kind === "no_history" ? "bad" : i.kind === "gst" ? "ok" : "warn"}>{KIND[i.kind] ?? i.kind}</Badge></td>
                <td className="px-3 py-2.5 font-medium">{name(i.vendor_code)}</td>
                <td className="px-3 py-2.5">
                  <p>{i.title}</p>
                  <p className="text-xs text-muted">{i.detail}</p>
                  {i.status === "asked" && <Badge tone="clar" className="mt-1">asked · waiting for reply</Badge>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">
                  {i.source || i.line_item_id ? (
                    <button onClick={() => setDrawer({ issueId: i.source ? i.id : null, quoteId: i.line_item_id ? quoteIdFor[`${i.vendor_id}|${i.line_item_id}`] ?? null : null, vendorCode: i.vendor_code, lineId: i.line_item_id, title: i.title, issueIds: [i.id], issueTitles: [i.title] })}
                      className="inline-flex items-center gap-1 text-accent hover:underline">
                      <Eye size={13} /> {i.source ? `${i.source.ref}` : `line ${i.line_no}`}
                    </button>
                  ) : "Whole reply"}
                </td>
                <td className="px-3 py-2.5">{i.confidence ? <Badge tone={i.confidence === "high" ? "ok" : i.confidence === "medium" ? "warn" : "bad"}>{{ high: "clear", medium: "check", low: "unclear" }[i.confidence as "high" | "medium" | "low"] ?? i.confidence}</Badge> : <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {i.status === "open" && !["missing", "no_history", "unreadable"].includes(i.kind) && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => acceptIssue(rfxId, i.id))}><Check size={13} /> Accept</Button>
                  )}
                  {i.askable && askableVendors.has(i.vendor_code) && i.status === "open" && (
                    <Button size="sm" onClick={() => setComposer(i.vendor_code)}><Mail size={13} /> Ask supplier</Button>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted">No open items.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="mt-5 p-4">
        <h2 className="font-semibold">Recent changes</h2>
        <p className="text-xs text-muted">Every manual change is logged and can be undone.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {changes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className={`flex-1 ${c.undone ? "text-muted line-through" : ""}`}>{c.label}</span>
              <span className="text-xs text-muted">{new Date(c.created_at).toLocaleTimeString("en-IN", { timeStyle: "short" })}</span>
              {!c.undone && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => undoChange(rfxId, c.id))}><Undo2 size={13} /> Undo</Button>}
            </li>
          ))}
          {!changes.length && <li className="py-2 text-muted">No changes yet.</li>}
        </ul>
      </Card>

      {drawer && <SourceDrawer key={`${drawer.quoteId}|${drawer.issueId}`} rfxId={rfxId} target={drawer} onClose={() => setDrawer(null)} onAskVendor={(c) => { setDrawer(null); setComposer(c); }} />}
      {composer !== null && <ClarifyComposer key={composer} rfxId={rfxId} vendorCode={composer} vendors={vendors} drafts={drafts} onClose={() => setComposer(null)} />}
    </>
  );
}
