"use client";

import { Download, Lock, Printer, Sparkles, Unlock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { lockAndSend, updateLineQty } from "@/app/rfx/actions";
import { Badge, Button, Card, Dots, PageHeader, Progress } from "@/components/ui";
import type { DraftEvent } from "@/lib/copilot/draft";
import type { Question } from "@/lib/engine/questionnaire";
import type { Line } from "@/lib/engine/types";
import type { CopilotNote, Message, Rfx, VendorRecord } from "@/lib/types";
import { SendView } from "./send-view";

type DraftLine = Extract<DraftEvent, { type: "line" }>["line"];
const size = (l: { length_mm: number; width_mm: number; height_mm: number }) => `${l.length_mm}×${l.width_mm}${l.height_mm ? `×${l.height_mm}` : ""}`;

export function RfqWorkspace({ rfx, lines, questions, vendors, outgoing, hasSheet }: {
  rfx: Rfx; lines: Line[]; questions: Question[]; vendors: VendorRecord[]; outgoing: Message[]; hasSheet: boolean;
}) {
  const router = useRouter();
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("");
  const [live, setLive] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState<CopilotNote[]>([]);
  const [cover, setCover] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"lines" | "questions" | "terms">("lines");
  // Between the end of the stream and the saved draft arriving, keep showing progress (not the old draft state).
  const [saving, startSaving] = useTransition();
  const busy = streaming || saving;
  const locked = !!rfx.rules_locked_at;
  const drafted = !!rfx.drafted_at && !busy;

  async function draft() {
    setStreaming(true);
    setLive([]);
    setNotes([]);
    setError(null);
    setStatus("Starting the co-pilot…");
    try {
      const res = await fetch(`/api/rfx/${rfx.id}/draft`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const e = JSON.parse(buf.slice(0, nl)) as DraftEvent;
          buf = buf.slice(nl + 1);
          if (e.type === "status") setStatus(e.text);
          if (e.type === "line") setLive((x) => [...x, e.line]);
          if (e.type === "note") setNotes((x) => [...x, e.note]);
          if (e.type === "cover_email") setCover(e.text);
          if (e.type === "error") setError(e.text);
          if (e.type === "done") setStatus("Saving the draft");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed");
    }
    startSaving(() => {
      setStreaming(false);
      router.refresh();
    });
  }

  if (!rfx.drafted_at && !busy && live.length === 0) {
    return (
      <>
        <Card className="flex flex-col items-center px-8 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Sparkles />
          </span>
          <h2 className="mt-4 text-xl font-semibold">Let the co-pilot draft the RFQ</h2>
          <p className="mt-2 max-w-xl text-muted">
            {hasSheet
              ? `It reads the request from ${rfx.internal_request.from}, the attached volume sheet and the ${vendors.length} supplier proposals, then drafts the line items, questionnaire, terms and cover email. Every quantity and size is checked against the volume sheet.`
              : "It reads your request and proposes the line items with sizes and yearly quantities, plus the questionnaire, terms and cover email. Anything it had to assume is flagged for you to confirm."}
          </p>
          {error && <p className="mt-4 max-w-xl rounded-lg bg-bad px-4 py-2 text-sm">{error}</p>}
          <Button variant="primary" size="lg" className="mt-6" onClick={draft}>
            <Sparkles size={16} /> Draft RFQ with co-pilot
          </Button>
        </Card>
      </>
    );
  }

  const shown: (DraftLine | Line)[] = busy || !drafted ? live : lines;
  const allNotes = busy ? notes : rfx.copilot_notes;
  return (
    <>
      {locked && <SendView rfx={rfx} vendors={vendors} outgoing={outgoing} />}
      <PageHeader
        title={locked ? "RFQ as sent" : "RFQ draft"}
        subtitle={
          busy ? (
            <span className="text-accent">✦ {status} <Dots /></span>
          ) : (
            <>
              {rfx.draft_source === "ai" ? "Drafted by the co-pilot" : "Prepared draft (AI unavailable)"} from {hasSheet ? "the internal request and volume sheet" : "your request"}
              {locked && <> · <Lock size={12} className="inline" /> Locked</>}
            </>
          )
        }
        actions={
          drafted && (
            <>
              <a href={`/api/rfx/${rfx.id}/template`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium hover:bg-panel">
                <Download size={15} /> Excel template
              </a>
              <Link href={`/rfx/${rfx.id}/rfq/print`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium hover:bg-panel">
                <Printer size={15} /> RFQ PDF
              </Link>
              {!locked && <Button variant="ghost" onClick={draft}><Sparkles size={15} /> Redraft</Button>}
            </>
          )
        }
      />
      {busy && <Progress value={hasSheet ? (live.length / Math.max(lines.length, 8)) * 100 : Math.min(90, live.length * 12)} className="mb-4" />}
      {error && <p className="mb-4 rounded-lg bg-bad px-4 py-2 text-sm">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex gap-1.5">
            {([["lines", `Line items (${shown.length})`], ["questions", `Questionnaire (${questions.length})`], ["terms", "Terms & cover email"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-panel"}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === "lines" && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-panel text-left text-xs text-muted">
                  <tr>{["#", "Item", "Description", "Ply / GSM", "Flute", "Size mm", "Plant 1 pcs/yr", "Plant 2 pcs/yr"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shown.map((l) => (
                    <tr key={l.line_no} className="animate-[fadein_.35s_ease] border-t border-line">
                      <td className="px-3 py-1.5 text-muted">{l.line_no}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{l.item_code}</td>
                      <td className="px-3 py-1.5">
                        {l.description} {l.is_new && <Badge tone="info">new</Badge>}
                      </td>
                      <td className="px-3 py-1.5">{l.ply} / {l.gsm}</td>
                      <td className="px-3 py-1.5">{l.flute}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{size(l)}</td>
                      {(["qty_p1", "qty_p2"] as const).map((f) => (
                        <td key={f} className="px-3 py-1">
                          {"id" in l && !locked && drafted ? <QtyCell rfxId={rfx.id} line={l} field={f} /> : <span>{l[f].toLocaleString("en-IN")}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {streaming && (
                    <tr className="border-t border-line">
                      <td colSpan={8} className="px-3 py-2 text-accent">✦ drafting <Dots /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {tab === "questions" && (
            <Card className="divide-y divide-line">
              {questions.map((q) => (
                <div key={q.q_no} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-8 text-muted">Q{q.q_no}</span>
                  <span className="flex-1">{q.text}</span>
                  {q.required && <Badge tone="accent">required</Badge>}
                  <span className="w-16 text-right text-muted">{q.points} pts</span>
                </div>
              ))}
            </Card>
          )}

          {tab === "terms" && (
            <Card className="p-5 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <Term label="Payment terms" value={`${rfx.payment_days ?? 60} days`} />
                <Term label="Quote validity" value={`${rfx.validity_days ?? 90} days`} />
                <Term label="Reply within" value={`${rfx.due_day} days of sending`} />
              </div>
              <h3 className="mt-5 font-medium">Cover email</h3>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-panel p-4 font-sans leading-relaxed">{cover || rfx.cover_email}</pre>
            </Card>
          )}

          {allNotes.length > 0 && (
            <Card className="mt-4 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={14} className="text-accent" /> Co-pilot notes</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {allNotes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge tone={n.kind === "gap" ? "warn" : "info"}>{n.kind === "gap" ? "gap" : "note"}</Badge> {n.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <RulesPanel rfx={rfx} questions={questions} vendors={vendors} disabled={!drafted} />
      </div>
    </>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function QtyCell({ rfxId, line, field }: { rfxId: string; line: Line; field: "qty_p1" | "qty_p2" }) {
  const [v, setV] = useState(String(line[field]));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const changed = Number(v) !== line[field];
  return (
    <input
      value={v}
      title={err ?? "Click to edit"}
      onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={() => changed && start(async () => setErr((await updateLineQty(rfxId, line.id, field, Number(v))).error))}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`w-24 rounded-md border px-2 py-1 text-right tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft ${
        err ? "border-[#ef4444] bg-bad" : changed || pending ? "border-[#f5d58a] bg-warn" : "border-transparent hover:border-line"
      }`}
    />
  );
}

function RulesPanel({ rfx, questions, vendors, disabled }: { rfx: Rfx; questions: Question[]; vendors: VendorRecord[]; disabled: boolean }) {
  const locked = !!rfx.rules_locked_at;
  const [required, setRequired] = useState<number[]>(rfx.rules?.required_q ?? [1, 3]);
  const [minScore, setMinScore] = useState(rfx.rules?.min_score ?? 70);
  const [pending, start] = useTransition();
  const lockedAt = rfx.rules_locked_at && new Date(rfx.rules_locked_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Card className="h-fit bg-panel p-4 xl:sticky xl:top-4">
      <h2 className="flex items-center gap-2 font-semibold">{locked ? <Lock size={15} /> : <Unlock size={15} />} Evaluation rules</h2>
      <p className="mt-1 text-xs text-muted">{locked ? `Locked ${lockedAt}. Quoted in the award memo.` : "Fixed before any price is seen, so the award is defensible."}</p>

      <div className="mt-4 rounded-lg border border-line bg-surface p-3">
        <p className="text-sm font-medium">Questionnaire pass rules</p>
        {questions.filter((q) => q.q_no <= 4).map((q) => (
          <label key={q.q_no} className="mt-2 flex items-start gap-2 text-sm">
            <input type="checkbox" disabled={locked || disabled} checked={required.includes(q.q_no)} className="mt-0.5 accent-[#4f46e5]"
              onChange={(e) => setRequired((r) => (e.target.checked ? [...r, q.q_no].sort() : r.filter((x) => x !== q.q_no)))} />
            <span>Required: {q.text}</span>
          </label>
        ))}
        <label className="mt-3 flex items-center gap-2 text-sm">
          Score at least
          <input type="number" min={0} max={100} value={minScore} disabled={locked || disabled} onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-16 rounded-md border border-line px-2 py-1 text-right" />%
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm">
        <p className="font-medium">Comparison basis</p>
        <ul className="mt-2 space-y-1 text-muted">
          <li>• ₹ per piece</li>
          <li>• Before GST</li>
          <li>• Delivered to each plant</li>
          <li>• 1 USD = ₹84.00, locked {locked ? `on ${rfx.rules?.fx_date}` : "at send"}</li>
          <li>• Price tier = each plant&apos;s own volume</li>
        </ul>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm">
        <p className="font-medium">Vendors invited ({vendors.length})</p>
        <ul className="mt-2 space-y-1 text-muted">{vendors.map((v) => <li key={v.id}>• {v.name}</li>)}</ul>
      </div>

      {!locked ? (
        <Button variant="primary" size="lg" className="mt-4 w-full" disabled={disabled || pending} onClick={() => start(() => lockAndSend(rfx.id, { required_q: required, min_score: minScore }))}>
          <Lock size={15} /> {pending ? "Locking and sending…" : `Lock rules & send to ${vendors.length} vendors`}
        </Button>
      ) : (
        <p className="mt-4 rounded-lg bg-ok px-3 py-2 text-sm">✓ Locked and sent to {vendors.length} vendors</p>
      )}
    </Card>
  );
}
