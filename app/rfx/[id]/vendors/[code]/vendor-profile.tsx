"use client";

import { ArrowRight, Mail, Paperclip } from "lucide-react";
import { useState } from "react";
import { ClarifyComposer } from "@/components/clarify-composer";
import Link from "next/link";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import type { ClarificationDraft } from "@/lib/clarify";
import type { Answer, Certificate, Question } from "@/lib/engine/questionnaire";
import { money } from "@/lib/format";
import type { Attachment, IssueRecord, Message, RfiResponse, VendorRecord } from "@/lib/types";
import type { VendorView } from "../../compare/data";

const STATUS: Record<string, [string, "neutral" | "info" | "ok" | "clar"]> = {
  not_sent: ["Not invited yet", "neutral"], sent: ["Invited, awaiting reply", "info"], replied: ["Replied", "ok"], clarification_requested: ["Clarification asked", "clar"],
};
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function VendorProfile(p: {
  rfxId: string; lineCount: number; vendor: VendorRecord; view: VendorView; summary: { score: number; passed: boolean; failures: string[]; met: Record<number, boolean>; answered: boolean };
  questions: Question[]; answers: Answer[]; certs: Certificate[]; messages: Message[]; files: Attachment[]; issues: IssueRecord[]; rfi: RfiResponse | null;
  drafts: Record<string, ClarificationDraft>; vendors: VendorView[]; requestedPayment: number; today: string;
}) {
  const [composer, setComposer] = useState<string | null>(null);
  const { vendor: v, view } = p;
  const open = p.issues.filter((i) => i.status !== "resolved");
  const timeline = [
    { label: "Shortlisted", done: true },
    ...p.messages.map((m) => ({
      label: `${m.kind === "rfq" ? "RFQ sent" : m.kind === "reply" ? "Quote received" : m.kind === "upload" ? "Reply uploaded" : m.kind === "clarification_request" ? "Clarification asked" : "Clarification reply"} · ${when(m.received_at)}`,
      done: true,
    })),
  ];

  return (
    <>
      <Link href={`/rfx/${p.rfxId}/compare`} className="text-sm text-muted hover:text-ink">← Comparison</Link>
      <PageHeader
        title={v.name}
        subtitle={<>{v.email} · <Badge tone={STATUS[v.status][1]}>{STATUS[v.status][0]}</Badge></>}
        actions={p.drafts[v.code] && <Button variant="secondary" onClick={() => setComposer(v.code)}><Mail size={15} /> Ask vendor</Button>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {timeline.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="rounded-lg border border-[#c6ebd3] bg-ok px-2.5 py-1 text-xs">{t.label}</span>
            {i < timeline.length - 1 && <ArrowRight size={12} className="text-muted" />}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-4 text-sm">
            <h2 className="font-semibold">RFP summary</h2>
            <p className="mt-2 leading-relaxed">{v.rfp_summary}</p>
            {p.rfi && <p className="mt-2 text-xs text-muted">RFI: {p.rfi.reason} · capacity {p.rfi.monthly_capacity}</p>}
          </Card>
          <Card className="p-4 text-sm">
            <h2 className="font-semibold">Quote</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Fact label="Lines quoted" value={view.processed ? `${view.linesQuoted} of ${p.lineCount}` : "No reply yet"} warn={view.processed && view.linesQuoted < p.lineCount} />
              <Fact label="Total value" value={view.processed ? money(view.total) : "—"} />
              <Fact label="Payment" value={v.payment_days ? `${v.payment_days} days` : "—"} warn={!!v.payment_days && v.payment_days < p.requestedPayment} note={v.payment_days && v.payment_days < p.requestedPayment ? `requested ${p.requestedPayment}` : undefined} />
              <Fact label="Lead time" value={v.lead_time_days ? `${v.lead_time_days} days` : "—"} />
              <Fact label="Validity" value={v.validity_days ? `${v.validity_days} days` : "—"} />
              <Fact label="Freight" value={v.freight ?? "—"} warn={v.freight === "extra"} />
            </div>
            {v.discount && <p className="mt-2 rounded-lg bg-warn px-3 py-2 text-xs">{v.discount.pct}% discount: “{v.discount.condition}”</p>}
          </Card>
          <Card className="p-4 text-sm">
            <h2 className="font-semibold">Replies and files</h2>
            <ul className="mt-2 space-y-2">
              {p.messages.map((m) => (
                <li key={m.id}>
                  <p><span className="text-muted">Day {m.day} ·</span> {m.subject}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.files.filter((f) => f.message_id === m.id).map((f) => (
                      <a key={f.id} href={`/api/files/${f.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"><Paperclip size={11} /> {f.filename}</a>
                    ))}
                  </div>
                </li>
              ))}
              {!p.messages.length && <li className="text-muted">Nothing sent or received yet.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden text-sm">
            <div className={`flex items-center justify-between px-4 py-3 ${p.summary.answered ? (view.valid ? "bg-ok" : "bg-bad") : "bg-panel"}`}>
              <h2 className="font-semibold">Questionnaire</h2>
              <span className="font-semibold">{p.summary.answered ? `${view.valid ? "Pass" : "Fail"} · ${p.summary.score}%` : "Not answered yet"}</span>
            </div>
            {p.summary.answered && p.summary.failures.length > 0 && <ul className="border-b border-line px-4 py-2 text-xs text-[#b91c1c]">{p.summary.failures.map((f) => <li key={f}>✕ {f}</li>)}</ul>}
            <table className="w-full">
              <tbody>
                {p.questions.map((q) => {
                  const a = p.answers.find((x) => x.q_no === q.q_no);
                  const met = p.summary.met[q.q_no];
                  return (
                    <tr key={q.q_no} className="border-t border-line align-top">
                      <td className="w-10 px-4 py-1.5 text-muted">Q{q.q_no}</td>
                      <td className="py-1.5">{q.text}{q.required && <Badge tone="accent" className="ml-1">required</Badge>}<p className="text-xs text-muted">{a?.answer ?? "—"}</p></td>
                      <td className="px-4 py-1.5 text-right">{a ? (met ? <span className="text-[#15803d]">✓</span> : <span className="text-[#b91c1c]">✕</span>) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="p-4 text-sm">
            <h2 className="font-semibold">Certificates</h2>
            <ul className="mt-2 space-y-1">
              {p.certs.map((c) => {
                const expired = !!c.valid_until && c.valid_until < p.today;
                return <li key={c.name} className="flex justify-between"><span>{c.name}</span><Badge tone={expired ? "bad" : "ok"}>{c.valid_until ? `${expired ? "expired" : "valid to"} ${c.valid_until}` : "no date"}</Badge></li>;
              })}
              {!p.certs.length && <li className="text-muted">None on file.</li>}
            </ul>
          </Card>
          <Card className={`p-4 text-sm ${open.length ? "border-[#f5e2a8] bg-warn/40" : ""}`}>
            <h2 className="font-semibold">Open items ({open.length})</h2>
            <ul className="mt-2 space-y-1">{open.map((i) => <li key={i.id}>• {i.title}{i.status === "asked" && <Badge tone="clar" className="ml-1.5">asked</Badge>}</li>)}</ul>
            {!open.length && <p className="mt-1 text-muted">Nothing open.</p>}
            {p.drafts[v.code] && <Button size="sm" className="mt-3" onClick={() => setComposer(v.code)}><Mail size={13} /> Ask vendor</Button>}
          </Card>
        </div>
      </div>
      {composer !== null && <ClarifyComposer key={composer} rfxId={p.rfxId} vendorCode={composer} vendors={p.vendors} drafts={p.drafts} onClose={() => setComposer(null)} />}
    </>
  );
}

function Fact({ label, value, warn, note }: { label: string; value: string; warn?: boolean; note?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${warn ? "border-[#f5e2a8] bg-warn" : "border-line"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}{warn && " ⚠"}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
