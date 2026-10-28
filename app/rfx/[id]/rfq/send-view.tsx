"use client";

import { CheckCircle2, ChevronDown, Paperclip } from "lucide-react";
import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import type { Message, Rfx, VendorRecord } from "@/lib/types";

/** What went out when the RFQ was sent: one email per vendor, with the RFQ and template attached. */
export function SendView({ rfx, vendors, outgoing }: { rfx: Rfx; vendors: VendorRecord[]; outgoing: Message[] }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(outgoing[0]?.id);
  const m = outgoing.find((x) => x.id === sel) ?? outgoing[0];
  const sentAt = rfx.sent_at && new Date(rfx.sent_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 bg-ok/60 px-5 py-3 text-left text-sm">
        <CheckCircle2 size={17} className="text-[#16a34a]" />
        <span className="flex-1">Rules locked and RFQ emailed to {vendors.length} vendors on {sentAt}</span>
        <span className="flex items-center gap-1 text-muted">{open ? "Hide" : "View"} emails <ChevronDown size={14} className={open ? "rotate-180" : ""} /></span>
      </button>
      {open && m && (
        <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1.5">
            {outgoing.map((o) => {
              const v = vendors.find((x) => x.id === o.vendor_id);
              return (
                <button key={o.id} onClick={() => setSel(o.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${o.id === m.id ? "border-accent bg-accent-soft" : "border-line hover:bg-panel"}`}>
                  <span className="font-medium">{v?.name}</span>
                  <span className="block truncate text-xs text-muted">{o.to_addr}</span>
                </button>
              );
            })}
          </div>
          <div className="rounded-lg border border-line p-4 text-sm">
            <p><span className="text-muted">To:</span> {m.to_addr}</p>
            <p className="mt-1"><span className="text-muted">Subject:</span> <span className="font-medium">{m.subject}</span></p>
            <pre className="mt-3 whitespace-pre-wrap border-t border-line pt-3 font-sans leading-relaxed">{m.body}</pre>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <Badge><Paperclip size={11} /> {rfx.code}.pdf</Badge>
              <Badge><Paperclip size={11} /> {rfx.code}-response-template.xlsx</Badge>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
