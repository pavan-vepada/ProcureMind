"use client";

import { AlertTriangle, ChevronRight, Mail, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
// useRef is used by Cell for hover positioning.
import { setAssumptions } from "@/app/rfx/actions";
import { ClarifyComposer } from "@/components/clarify-composer";
import { SourceDrawer, type DrawerTarget } from "@/components/source-drawer";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { inr, money } from "@/lib/format";
import { AskPanel } from "./ask-panel";
import type { CellView, CompareData, RowView, VendorView } from "./data";

const LEGEND: [string, string][] = [
  ["bg-ok", "Cheapest valid"],
  ["bg-warn", "Needs a look"],
  ["bg-bad", "Missing / unreadable"],
];
const BADGE_LEGEND: [string, "info" | "est" | "clar" | "accent", string][] = [
  ["contract", "info", "Pulled from last year's contract"],
  ["estimate", "est", "Per kg → per piece using estimated box weight"],
  ["clarification", "clar", "Updated from the vendor's clarification"],
  ["edited", "accent", "Entered by you"],
];

export function CompareView({ data, focusVendor }: { data: CompareData; focusVendor: string | null }) {
  const [mode, setMode] = useState<"normalized" | "quoted">("normalized");
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [composer, setComposer] = useState<string | null>(null);
  const [hover, setHover] = useState<{ cell: CellView; rect: DOMRect; code: string } | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const processed = data.vendors.filter((v) => v.processed);

  // Flash cells whose value just changed (e.g. after a clarification reply or an assumption change).
  const [prevRows, setPrevRows] = useState(data.rows);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  if (data.rows !== prevRows) {
    const before = new Map<string, number | null>(prevRows.flatMap((r) => Object.entries(r.cells).map(([code, c]): [string, number | null] => [`${r.line.id}|${code}`, c.avg])));
    const changed = new Set<string>();
    for (const r of data.rows)
      for (const [code, c] of Object.entries(r.cells)) {
        const k = `${r.line.id}|${code}`;
        if (before.has(k) && before.get(k) !== c.avg) changed.add(k);
      }
    setPrevRows(data.rows);
    setFlash(changed);
  }
  useEffect(() => {
    if (!flash.size) return;
    const t = setTimeout(() => setFlash(new Set()), 2400);
    return () => clearTimeout(t);
  }, [flash]);

  const openCell = (r: RowView, code: string) => {
    const c = r.cells[code];
    setDrawer({
      quoteId: c.quoteId, issueId: !c.quoteId ? c.issueIds[0] : null, vendorCode: code, lineId: r.line.id, title: `Line ${r.line.line_no} · ${r.line.description}`,
      value: c.avg, steps1: c.steps1, steps2: c.steps2, qty: [r.line.qty_p1, r.line.qty_p2], issueIds: c.issueIds, issueTitles: c.issueTitles, badges: c.badges,
    });
  };
  const openByLine = (lineNo: number, code: string) => {
    const r = data.rows.find((x) => x.line.line_no === lineNo);
    if (r) openCell(r, code);
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_400px] xl:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
            {(["normalized", "quoted"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1 ${mode === m ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}>
                {m === "normalized" ? "Normalized ₹/piece" : "As quoted"}
              </button>
            ))}
          </div>
          {data.openIssues > 0 && (
            <ButtonLink href={`/rfx/${data.rfxId}/review`} size="sm" className="border border-[#f5e2a8] bg-warn text-[#713f12] hover:bg-[#ffedb8]">
              <AlertTriangle size={14} /> {data.openIssues} item{data.openIssues > 1 ? "s" : ""} need a look <ChevronRight size={14} />
            </ButtonLink>
          )}
          <Button size="sm" variant={showAssumptions ? "soft" : "secondary"} onClick={() => setShowAssumptions(!showAssumptions)}>
            <SlidersHorizontal size={14} /> Assumptions
          </Button>
          <span className="ml-auto text-xs text-muted">{processed.length} of {data.vendors.length} vendors read · ₹ per piece, before GST, delivered</span>
        </div>

        <AssumptionsBar data={data} open={showAssumptions} />

        {/* Legend: always visible (FR-4.12) */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span>Legend:</span>
          {LEGEND.map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm border border-line ${c}`} /> {l}</span>)}
          {BADGE_LEGEND.map(([b, tone, title]) => <Badge key={b} tone={tone} title={title}>{b}</Badge>)}
          <Badge title="Converted from US dollars at the locked rate">$→₹</Badge>
          <Badge title="Price per box of 100 converted to per piece">per-box fixed</Badge>
          <Badge title="18% GST removed">GST removed</Badge>
          <Badge title="Volume tier price applies">tier</Badge>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-panel text-left text-xs text-muted">
                <th className="sticky left-0 z-10 w-8 bg-panel px-2 py-2 font-medium">#</th>
                <th className="sticky left-8 z-10 min-w-52 bg-panel px-2 py-2 font-medium">Line item</th>
                <th className="px-2 py-2 text-right font-medium">Qty P1 / P2</th>
                {data.vendors.map((v) => (
                  <th key={v.id} className={`min-w-36 px-2 py-2 font-medium ${focusVendor === v.code ? "bg-accent-soft" : ""}`}>
                    <div className="flex items-center gap-1">
                      <Link href={`/rfx/${data.rfxId}/vendors/${v.code}`} className="truncate text-ink hover:text-accent" title={v.name}>{v.name.split(" ").slice(0, 2).join(" ")}</Link>
                      {v.askable > 0 && (
                        <button onClick={() => setComposer(v.code)} title="Ask vendor" className="ml-auto rounded p-0.5 text-muted hover:bg-accent-soft hover:text-accent"><Mail size={13} /></button>
                      )}
                    </div>
                    <span className="font-normal">{{ excel: "Excel", pdf: "PDF", word: "Word", photo: "Photo", email: "Email" }[v.format]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SummaryRow label="Lines quoted" vendors={data.vendors} render={(v) => (v.processed ? <span className={v.linesQuoted < data.lineCount ? "font-medium text-[#b45309]" : ""}>{v.linesQuoted} / {data.lineCount}{v.linesQuoted < data.lineCount ? " ⚠" : ""}</span> : <Pending v={v} />)} tone={(v) => (v.processed && v.linesQuoted < data.lineCount ? "bg-warn" : "")} />
              <SummaryRow label="Total value" vendors={data.vendors} render={(v) => (v.processed ? <span className="font-semibold tabular-nums">{money(v.total)}{v.linesQuoted < data.lineCount ? <span className="text-muted">*</span> : ""}</span> : <Pending v={v} />)} />
              <SummaryRow label="Questionnaire" vendors={data.vendors} render={(v) => (v.answered ? <span title={v.invalidReasons.join("\n")}>{v.valid ? `Pass · ${v.score}%` : v.invalidReasons[0]?.startsWith("ISO") ? "ISO expired" : `Fail · ${v.score}%`}</span> : v.processed ? "—" : <Pending v={v} />)} tone={(v) => (v.answered ? (v.valid ? "bg-ok" : "bg-bad") : "")} />
              <SummaryRow label="Payment · lead time" vendors={data.vendors} render={(v) => (v.processed ? <span>{v.payment_days ?? "?"} d{v.payment_days && v.payment_days < 60 ? " ⚠" : ""} · {v.lead_time_days ?? "?"} d{v.freight === "extra" ? " · freight extra" : ""}</span> : <Pending v={v} />)} tone={(v) => (v.payment_days && v.payment_days < 60 ? "bg-warn" : "")} border />
              {data.rows.map((r) => (
                <tr key={r.line.id} className="border-t border-line hover:bg-panel/40">
                  <td className="sticky left-0 bg-surface px-2 py-1.5 text-muted">{r.line.line_no}</td>
                  <td className="sticky left-8 bg-surface px-2 py-1.5">
                    <span className="line-clamp-1">{r.line.description}</span>
                    <span className="text-[11px] text-muted">{r.line.ply}-ply{r.line.is_new ? " · new" : ""}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs text-muted tabular-nums">{(r.line.qty_p1 / 1000).toFixed(0)}k / {(r.line.qty_p2 / 1000).toFixed(0)}k</td>
                  {data.vendors.map((v) => (
                    <Cell key={v.id} c={r.cells[v.code]} cheapest={r.cheapest === v.code} mode={mode} flash={flash.has(`${r.line.id}|${v.code}`)}
                      onClick={() => openCell(r, v.code)}
                      onHover={(rect) => setHover(rect ? { cell: r.cells[v.code], rect, code: v.code } : null)} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">* Total excludes lines the vendor hasn&apos;t priced. Click any value to see where it came from. Hover for the conversion.</p>
      </div>

      <AskPanel data={data} onOpenLine={openByLine} />

      {hover && hover.cell.steps1.length > 0 && <ChainTooltip cell={hover.cell} rect={hover.rect} />}
      {drawer && <SourceDrawer key={`${drawer.quoteId}|${drawer.issueId}|${drawer.lineId}|${drawer.vendorCode}`} rfxId={data.rfxId} target={drawer} onClose={() => setDrawer(null)} onAskVendor={(code) => { setDrawer(null); setComposer(code); }} />}
      {composer !== null && <ClarifyComposer key={composer} rfxId={data.rfxId} vendorCode={composer} vendors={data.vendors} drafts={data.drafts} onClose={() => setComposer(null)} />}
    </div>
  );
}

function Pending({ v }: { v: VendorView }) {
  return <span className="text-muted">{v.status === "replied" ? "reading…" : "awaiting reply"}</span>;
}

function SummaryRow({ label, vendors, render, tone, border }: { label: string; vendors: VendorView[]; render: (v: VendorView) => React.ReactNode; tone?: (v: VendorView) => string; border?: boolean }) {
  return (
    <tr className={`bg-panel/50 ${border ? "border-b-2 border-line" : ""}`}>
      <td className="sticky left-0 bg-panel/50" />
      <td className="sticky left-8 bg-panel/50 px-2 py-1.5 text-xs font-medium text-muted" colSpan={2}>{label}</td>
      {vendors.map((v) => <td key={v.id} className={`px-2 py-1.5 text-xs ${tone?.(v) ?? ""}`}>{render(v)}</td>)}
    </tr>
  );
}

const STATUS_TEXT = { missing: "missing · Ask", unreadable: "unreadable · Ask", no_history: "no history · Ask", pending: "" };

function Cell({ c, cheapest, mode, flash, onClick, onHover }: { c: CellView; cheapest: boolean; mode: "normalized" | "quoted"; flash: boolean; onClick: () => void; onHover: (r: DOMRect | null) => void }) {
  const ref = useRef<HTMLTableCellElement>(null);
  const empty = c.avg === null;
  const bg = c.status === "pending" ? "bg-panel/40" : empty ? "bg-bad" : cheapest ? "bg-ok" : c.status === "flagged" ? "bg-warn" : "";
  const shown = c.badges.filter((b) => ["contract", "estimate", "clarification", "edited"].includes(b));
  return (
    <td ref={ref} onClick={c.status === "pending" ? undefined : onClick}
      onMouseEnter={() => ref.current && onHover(ref.current.getBoundingClientRect())} onMouseLeave={() => onHover(null)}
      className={`cursor-pointer px-2 py-1.5 align-top transition-colors hover:ring-2 hover:ring-inset hover:ring-accent/50 ${bg} ${flash ? "animate-[flash_2.4s_ease]" : ""}`}>
      {c.status === "pending" ? (
        <span className="text-xs text-muted">…</span>
      ) : empty ? (
        <span className="text-xs font-medium text-[#b91c1c]">{STATUS_TEXT[c.status as keyof typeof STATUS_TEXT] ?? "missing"}</span>
      ) : (
        <>
          <span className={`tabular-nums ${cheapest ? "font-semibold" : ""}`}>{mode === "normalized" ? inr(c.avg!) : c.quoted}</span>
          {c.status === "flagged" && <span className="ml-1 text-[#b45309]">⚠</span>}
          {shown.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-1">
              {shown.map((b) => <Badge key={b} tone={b === "contract" ? "info" : b === "estimate" ? "est" : b === "clarification" ? "clar" : "accent"}>{b}</Badge>)}
            </span>
          )}
        </>
      )}
    </td>
  );
}

function ChainTooltip({ cell, rect }: { cell: CellView; rect: DOMRect }) {
  const left = Math.min(rect.left, window.innerWidth - 380);
  const below = rect.bottom + 260 < window.innerHeight;
  return (
    <div className="pointer-events-none fixed z-30 w-[360px] rounded-xl border border-line bg-surface p-3 text-xs shadow-xl"
      style={{ left, top: below ? rect.bottom + 6 : undefined, bottom: below ? undefined : window.innerHeight - rect.top + 6 }}>
      <p className="mb-1.5 font-medium">Conversion chain{cell.p1 !== cell.p2 ? " (Plant 1)" : ""}</p>
      <ol className="space-y-1">
        {cell.steps1.map((s, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className={s.note === "estimate" ? "text-[#6d28d9]" : s.note === "unclear" ? "text-[#b45309]" : ""}>{s.label}</span>
            <span className="tabular-nums text-muted">{inr(s.value)}</span>
          </li>
        ))}
      </ol>
      {cell.p1 !== cell.p2 && cell.p2 !== null && <p className="mt-1.5 text-muted">Plant 2: {inr(cell.p2)} per piece (its own tier)</p>}
      {cell.issueTitles.length > 0 && <p className="mt-1.5 text-[#b45309]">⚠ {cell.issueTitles[0]}</p>}
    </div>
  );
}

function AssumptionsBar({ data, open }: { data: CompareData; open: boolean }) {
  const a = data.assumptions;
  const [fx, setFx] = useState(String(a.fx_rate));
  const [savedFx, setSavedFx] = useState(a.fx_rate);
  const [pending, start] = useTransition();
  if (a.fx_rate !== savedFx) {
    setSavedFx(a.fx_rate);
    setFx(String(a.fx_rate));
  }
  const freightVendors = data.vendors.filter((v) => v.freight === "extra" || a.freight[v.code]);
  const discountVendors = data.vendors.filter((v) => v.discount);
  const summary = useMemo(() => [
    `1 USD = ₹${a.fx_rate.toFixed(2)}`,
    ...freightVendors.map((v) => `${short(v.name)} freight ${a.freight[v.code] ? `${inr(a.freight[v.code].per_piece)}/pc (${a.freight[v.code].source === "vendor" ? "stated" : "estimate"})` : "unknown"}`),
    ...discountVendors.map((v) => `${short(v.name)} ${v.discount!.pct}% discount: ${{ not_applied: "not applied", as_stated: "as stated", all_lines: "all lines" }[a.discount_mode[v.code] ?? "not_applied"]}`),
    "box weights from specs (estimate)",
  ], [a, freightVendors, discountVendors]);

  if (!open) {
    return <div className="mb-3 truncate rounded-lg bg-panel px-3 py-1.5 text-xs text-muted">Assumptions: {summary.join(" · ")}</div>;
  }
  return (
    <div className="mb-3 grid gap-3 rounded-xl border border-line bg-panel p-4 text-sm md:grid-cols-3">
      <label className="block">
        <span className="text-xs text-muted">Exchange rate (₹ per USD)</span>
        <div className="mt-1 flex gap-2">
          <input value={fx} onChange={(e) => setFx(e.target.value.replace(/[^\d.]/g, ""))} className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-right" />
          <Button size="sm" disabled={pending || Number(fx) === a.fx_rate || !(Number(fx) > 0)} onClick={() => start(() => setAssumptions(data.rfxId, { fx_rate: Number(fx) }, `Exchange rate ₹${a.fx_rate} → ₹${fx} per USD`))}>Apply</Button>
        </div>
      </label>
      {freightVendors.map((v) => <FreightInput key={v.code} rfxId={data.rfxId} code={v.code} name={short(v.name)} value={a.freight[v.code]} />)}
      {discountVendors.map((v) => (
        <label key={v.code} className="block">
          <span className="text-xs text-muted">{short(v.name)} {v.discount!.pct}% discount (“{v.discount!.condition.slice(0, 50)}…”)</span>
          <select value={a.discount_mode[v.code] ?? "not_applied"} disabled={pending}
            onChange={(e) => start(() => setAssumptions(data.rfxId, { discount_mode: { [v.code]: e.target.value as "not_applied" } }, `${short(v.name)} discount: ${e.target.value.replace("_", " ")}`))}
            className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2">
            <option value="not_applied">Not applied until confirmed</option>
            <option value="as_stated">Apply as stated (≥ threshold)</option>
            <option value="all_lines">Apply to all lines</option>
          </select>
        </label>
      ))}
      <p className="text-xs text-muted md:col-span-3">Change once, everything updates: every price, total, answer and saved scenario is recalculated from the stored quotes. Each change is logged and can be undone in the review queue.</p>
    </div>
  );
}

const short = (name: string) => name.split(" ")[0];

function FreightInput({ rfxId, code, name, value }: { rfxId: string; code: string; name: string; value?: { per_piece: number; source: string } }) {
  const [v, setV] = useState(value ? String(value.per_piece) : "");
  const [pending, start] = useTransition();
  return (
    <label className="block">
      <span className="text-xs text-muted">{name} freight, ₹ per piece ({value?.source === "vendor" ? "stated by vendor" : "buyer estimate"})</span>
      <div className="mt-1 flex gap-2">
        <input value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ""))} className="h-9 w-24 rounded-lg border border-line bg-surface px-2 text-right" />
        <Button size="sm" disabled={pending || Number(v) === value?.per_piece || !(Number(v) >= 0)} onClick={() => start(() => setAssumptions(rfxId, { freight: { [code]: { per_piece: Number(v), source: "estimate" } } }, `${name} freight estimate set to ₹${v} per piece`))}>Apply</Button>
      </div>
    </label>
  );
}
