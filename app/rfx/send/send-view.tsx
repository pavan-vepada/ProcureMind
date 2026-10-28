"use client";

import { CheckCircle2, FastForward, Paperclip } from "lucide-react";
import { useState, useTransition } from "react";
import { fastForward } from "@/app/rfx/actions";
import { NextAction } from "@/components/next-action";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import type { Message, Rfx, VendorRecord } from "@/lib/types";

const STATUS: Record<string, [string, "neutral" | "info" | "ok" | "clar"]> = {
  not_sent: ["Not sent", "neutral"], sent: ["Sent", "info"], replied: ["Replied", "ok"], clarification_requested: ["Clarification requested", "clar"],
};

export function SendView({ rfx, vendors, outgoing, hasReplies }: { rfx: Rfx; vendors: VendorRecord[]; outgoing: Message[]; hasReplies: boolean }) {
  const [sel, setSel] = useState(outgoing[0]?.id);
  const [pending, start] = useTransition();
  const m = outgoing.find((x) => x.id === sel) ?? outgoing[0];
  const sentAt = rfx.sent_at && new Date(rfx.sent_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title="Sent to vendors" subtitle="Sending is simulated inside the demo: nothing leaves the app." />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#c6ebd3] bg-ok px-4 py-3 text-sm">
        <CheckCircle2 size={16} className="text-[#16a34a]" />
        Rules locked {sentAt} · RFQ sent to {vendors.length} vendors · Replies due Day {rfx.due_day}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {outgoing.map((o) => {
            const v = vendors.find((x) => x.id === o.vendor_id)!;
            return (
              <button key={o.id} onClick={() => setSel(o.id)}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${o.id === m?.id ? "border-accent bg-accent-soft" : "border-line hover:bg-panel"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{v.code} · {v.name}</span>
                  <Badge tone={STATUS[v.status][1]}>{STATUS[v.status][0]}</Badge>
                </div>
                <p className="mt-1 truncate text-muted">{v.email}</p>
              </button>
            );
          })}
        </div>

        {m && (
          <Card className="p-5 text-sm">
            <p><span className="text-muted">To:</span> {m.to_addr}</p>
            <p className="mt-1"><span className="text-muted">Subject:</span> <span className="font-medium">{m.subject}</span></p>
            <pre className="mt-4 whitespace-pre-wrap border-t border-line pt-4 font-sans leading-relaxed">{m.body}</pre>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <Badge><Paperclip size={11} /> {rfx.code}.pdf</Badge>
              <Badge><Paperclip size={11} /> {rfx.code}-response-template.xlsx</Badge>
            </div>
          </Card>
        )}
      </div>

      {hasReplies ? (
        <NextAction href="/rfx/inbox" label="Open the inbox" />
      ) : (
        <div className="mt-8 flex items-center justify-end gap-3">
          <span className="text-sm text-muted">Jumps the demo clock 9 days. Five messy replies land and processing starts by itself.</span>
          <Button variant="primary" size="lg" disabled={pending} onClick={() => start(() => fastForward())}>
            <FastForward size={16} /> {pending ? "Fast-forwarding…" : "Fast-forward 9 days"}
          </Button>
        </div>
      )}
    </>
  );
}
