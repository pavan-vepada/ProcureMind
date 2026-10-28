"use client";

import { CheckCircle2, Mail, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendClarification } from "@/app/rfx/actions";
import { Badge, Button, Dots, Progress } from "@/components/ui";
import type { ClarificationDraft } from "@/lib/clarify";
import type { Run } from "@/lib/types";

type VendorLite = { code: string; name: string; askable: number; status: string };

/** S10 / Improvement A: one consolidated email per vendor; the reply closes the loop (FR-4.7, FR-4.8). */
/** Mount with key={vendorCode} so each opening starts from that vendor's fresh draft. */
export function ClarifyComposer({ rfxId, vendorCode, vendors, drafts, onClose }: {
  rfxId: string; vendorCode: string; vendors: VendorLite[]; drafts: Record<string, ClarificationDraft>; onClose: () => void;
}) {
  const router = useRouter();
  const withItems = vendors.filter((v) => drafts[v.code]);
  const initial = drafts[vendorCode] ? vendorCode : withItems[0]?.code ?? null;
  const [code, setCode] = useState(initial);
  const [subject, setSubject] = useState(initial ? drafts[initial].subject : "");
  const [body, setBody] = useState(initial ? drafts[initial].body : "");
  const [phase, setPhase] = useState<"edit" | "sending" | "waiting" | "done" | "sent">("edit");
  const [run, setRun] = useState<Run | null>(null);
  const [frozen] = useState(drafts); // the drafts change once the email is sent; keep the one being shown
  const draft = code ? frozen[code] : undefined;

  function pick(c: string) {
    setCode(c);
    setSubject(frozen[c].subject);
    setBody(frozen[c].body);
  }

  async function send() {
    if (!code || !draft) return;
    setPhase("sending");
    const r = await sendClarification(rfxId, code, subject, body, draft.issueIds);
    if (r.error) return setPhase("edit");
    if (!r.runId) return setPhase("sent");
    setPhase("waiting");
    const runId = r.runId;
    const poll = setInterval(async () => {
      const res = await fetch(`/api/runs?rfx=${rfxId}`, { cache: "no-store" });
      if (!res.ok) return;
      const rr = ((await res.json()).runs as Run[]).find((x) => x.id === runId);
      if (rr) setRun(rr);
      if (rr && (rr.status === "done" || rr.status === "failed")) {
        clearInterval(poll);
        setPhase("done");
        // The page refreshes when the buyer closes this dialog, so the result stays on screen until then.
      }
    }, 1000);
    await fetch(`/api/runs/${runId}/process`, { method: "POST", body: "{}" });
  }

  const vendor = vendors.find((v) => v.code === code);
  const close = () => {
    if (phase !== "edit") router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[1px]" onClick={() => phase !== "sending" && phase !== "waiting" && close()}>
      <div role="dialog" aria-modal="true" aria-label="Ask vendor for clarification" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-4xl animate-[fadein_.2s_ease] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail size={18} /> Ask vendor for clarification</h2>
          <button onClick={close} className="rounded-md p-1.5 text-muted hover:bg-panel" aria-label="Close"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[210px_1fr] overflow-hidden">
          <nav className="space-y-1.5 overflow-y-auto border-r border-line bg-panel p-3">
            <p className="px-1 text-xs text-muted">Vendors with open items</p>
            {vendors.filter((v) => frozen[v.code]).map((v) => (
              <button key={v.code} disabled={phase !== "edit"} onClick={() => pick(v.code)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${v.code === code ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-[#c7d2fe]"}`}>
                <span className="font-medium">{v.name.split(" ")[0]}</span> · {frozen[v.code].items.length} item{frozen[v.code].items.length > 1 ? "s" : ""}
                <span className="block truncate text-xs text-muted">{v.name}</span>
              </button>
            ))}
            {!withItems.length && <p className="px-1 text-sm text-muted">Nothing to chase. 🎉</p>}
          </nav>

          <div className="min-h-0 overflow-y-auto p-6">
            {!draft && phase === "edit" && <p className="text-muted">No open items for this vendor.</p>}
            {draft && phase === "edit" && (
              <>
                <p className="text-sm"><span className="text-muted">To:</span> {draft.to}</p>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-line px-3 text-sm font-medium outline-none focus:border-accent" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="mt-2 w-full rounded-lg border border-line p-3 text-sm leading-relaxed outline-none focus:border-accent" />
                <div className="mt-2 flex flex-wrap gap-1.5">{draft.items.map((t, i) => <Badge key={i} tone="warn">✓ {t.split(/[.:;(]/)[0]}</Badge>)}</div>
              </>
            )}
            {(phase === "sending" || phase === "waiting") && (
              <div className="py-10 text-center">
                <p className="text-lg font-medium">{phase === "sending" ? "Sending" : `${vendor?.name} replied`} <Dots /></p>
                <p className="mt-1 text-sm text-muted">{run?.step ?? "Email sent. Status: clarification requested."}</p>
                <Progress value={run?.progress ?? 15} className="mx-auto mt-4 max-w-sm" />
              </div>
            )}
            {phase === "done" && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto text-[#16a34a]" size={36} />
                <p className="mt-3 text-lg font-medium">{run?.status === "failed" ? "The reply couldn't be read" : "Loop closed"}</p>
                <p className="mt-1 text-sm text-muted">{run?.status === "failed" ? run.error : `${vendor?.name}'s reply was read. ${run?.step?.replace(/^Done · /, "")}. Only those cells changed; old values are kept in history.`}</p>
                <Button variant="primary" className="mt-5" onClick={() => { onClose(); router.push(`/rfx/${rfxId}/compare`); router.refresh(); }}>See the updated comparison</Button>
              </div>
            )}
            {phase === "sent" && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto text-[#16a34a]" size={36} />
                <p className="mt-3 text-lg font-medium">Sent</p>
                <p className="mt-1 text-sm text-muted">{vendor?.name} is now marked “Clarification requested”. Their answer will land in the inbox; you can also upload it there.</p>
                <Button className="mt-5" onClick={close}>Close</Button>
              </div>
            )}
          </div>
        </div>

        {draft && phase === "edit" && (
          <footer className="flex items-center justify-between border-t border-line px-6 py-3">
            <span className="text-xs text-muted">When the vendor replies, the reply is read automatically and only the affected cells update.</span>
            <div className="flex gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={send}><Send size={14} /> Send</Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
