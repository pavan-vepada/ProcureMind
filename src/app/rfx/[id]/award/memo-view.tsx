"use client";

import { FileCheck2, Printer, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SourceDrawer, type DrawerTarget } from "@/components/source-drawer";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { inr, money, pct } from "@/lib/format";
import type { MemoContent } from "@/lib/memo";
import type { Rfx } from "@/lib/types";

export function MemoView({ rfx, memo }: { rfx: Rfx; memo: { id: string; created_at: string; content: MemoContent } | null }) {
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  if (!memo) {
    return (
      <Card className="flex flex-col items-center px-8 py-16 text-center">
        <FileCheck2 className="text-accent" size={32} />
        <h1 className="mt-3 text-xl font-semibold">No award memo yet</h1>
        <p className="mt-1 max-w-md text-muted">Ask a what-if in the comparison, save it as a scenario, then click “Recommend award”.</p>
        <ButtonLink href={`/rfx/${rfx.id}/compare`} variant="primary" className="mt-5">Go to the comparison</ButtonLink>
      </Card>
    );
  }
  const m = memo.content;
  const open = (row: MemoContent["rows"][number]) => setDrawer({ quoteId: row.quote_id, vendorCode: row.vendor, title: `Line ${row.line_no} · ${row.description}`, value: row.unit_price });
  const evidence = (code: string) => m.rows.find((r) => r.vendor === code);

  return (
    <>
      <Card className="p-8 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Award recommendation</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{rfx.code} · {rfx.title}</h1>
            <p className="mt-1 text-sm text-muted">Prepared by Pavan{m.prepared_at ? ` · ${new Date(m.prepared_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""} · Scenario: “{m.scenario_name}”</p>
          </div>
          <div className="no-print flex gap-2">
            <Button onClick={() => window.print()}><Printer size={15} /> Download PDF</Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Stat label="Total award value" value={money(m.total)} sub="per year, before GST, delivered" accent />
          <Stat label="Saving vs last year" value={m.savings_vs_last_year ? money(m.savings_vs_last_year.amount) : "—"} sub={m.savings_vs_last_year ? `${pct(m.savings_vs_last_year.pct)} on ${m.savings_vs_last_year.lines} comparable lines` : "no comparable contracts"} />
          <Stat label="Saving vs cheapest single vendor" value={m.savings_vs_single ? money(m.savings_vs_single.amount) : "—"} sub={m.savings_vs_single ? `vs awarding everything to ${m.savings_vs_single.vendor}` : ""} />
        </div>

        <h2 className="mt-8 font-semibold">Award by vendor</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-1.5 font-medium">Vendor</th><th className="font-medium">Lines awarded</th><th className="text-right font-medium">Annual value</th><th className="text-right font-medium">Share</th></tr></thead>
          <tbody>
            {m.award.map((a) => (
              <tr key={a.code} className="border-t border-line">
                <td className="py-2 font-medium">{a.name}</td>
                <td className="py-2 text-muted">{a.lines.slice(0, 10).join(", ")}{a.lines.length > 10 ? "…" : ""} ({a.lines.length})</td>
                <td className="py-2 text-right tabular-nums">
                  <button onClick={() => evidence(a.code) && open(evidence(a.code)!)} className="underline decoration-dotted underline-offset-2 hover:text-accent">{money(a.value)}</button>
                </td>
                <td className="py-2 text-right">{pct(a.share * 100, 0)}</td>
              </tr>
            ))}
            {m.excluded.map((e) => (
              <tr key={e.code} className="border-t border-line text-muted"><td className="py-2">{e.name}</td><td className="py-2" colSpan={3}>Not awarded: {e.reason}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line p-4 text-sm">
            <h3 className="font-semibold">Why this award</h3>
            <p className="mt-2 leading-relaxed">{m.why}</p>
            <p className={`mt-2 flex items-center gap-1 text-xs ${m.why_checked ? "text-[#15803d]" : "text-muted"}`}><ShieldCheck size={12} /> {m.why_checked ? "Written by AI; every number checked against the calculation" : "Written by code from the calculation"}</p>
          </div>
          <div className="rounded-xl border border-[#c9dcf7] bg-info p-4 text-sm">
            <h3 className="font-semibold">Evaluation rules used</h3>
            {m.rules.locked_at && <p className="text-xs text-muted">Locked {new Date(m.rules.locked_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}, before any price was seen</p>}
            <ul className="mt-2 space-y-1">{m.rules.text.map((t) => <li key={t}>• {t}</li>)}</ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#f5e2a8] bg-warn/50 p-4 text-sm">
          <h3 className="font-semibold">Risks and assumptions</h3>
          <ul className="mt-2 space-y-1">{m.risks.map((r) => <li key={r}>• {r}</li>)}</ul>
        </div>

        <details className="mt-6 text-sm" open>
          <summary className="cursor-pointer font-semibold">Evidence: every line, click any price for the vendor&apos;s own words</summary>
          <table className="mt-2 w-full">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1 font-medium">Line</th><th className="font-medium">Item</th><th className="font-medium">Vendor</th><th className="text-right font-medium">Qty / yr</th><th className="text-right font-medium">₹ / piece</th><th className="text-right font-medium">Annual</th></tr></thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.line_no} className="border-t border-line">
                  <td className="py-1.5 text-muted">{r.line_no}</td>
                  <td className="py-1.5">{r.description}</td>
                  <td className="py-1.5">{m.award.find((x) => x.code === r.vendor)?.name ?? r.vendor}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.qty.toLocaleString("en-IN")}</td>
                  <td className="py-1.5 text-right tabular-nums"><button onClick={() => open(r)} className="underline decoration-dotted underline-offset-2 hover:text-accent">{inr(r.unit_price)}</button></td>
                  <td className="py-1.5 text-right tabular-nums">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted"><Badge tone="ok">Award ✓</Badge> Next stage: purchase order in the ERP (on the roadmap).</p>
      </Card>
      {drawer && <SourceDrawer key={drawer.quoteId ?? ""} rfxId={rfx.id} target={drawer} onClose={() => setDrawer(null)} onAskVendor={() => setDrawer(null)} />}
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-[#c6ebd3] bg-ok" : "border-line"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
