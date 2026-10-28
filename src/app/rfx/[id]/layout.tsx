import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { getAnalysis } from "@/lib/data";
import { PHASE_LABEL, phaseOf, STEPS, stepIndex } from "@/lib/lifecycle";
import { RfxTabs } from "./rfx-tabs";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The frame of one RFx: header with status and progress, and the tabs. */
export default async function RfxLayout({ children, params }: LayoutProps<"/rfx/[id]">) {
  const { id } = await params;
  const a = await getAnalysis(id);
  const { rfx } = a;
  const phase = phaseOf(rfx);
  const step = stepIndex(phase);
  const replies = new Set(a.messages.filter((m) => m.direction === "in" && m.vendor_id).map((m) => m.vendor_id)).size;
  const read = a.comparison.vendors.filter((v) => v.processed).length;
  const reading = a.runs.filter((r) => r.status === "queued" || r.status === "running").length;
  const open = a.issues.filter((i) => i.status === "open").length;
  const due = rfx.sent_at ? new Date(Date.parse(rfx.sent_at) + rfx.due_day * 864e5).toISOString() : null;

  const tabs = [
    { href: `/rfx/${id}`, label: "Overview", enabled: true },
    { href: `/rfx/${id}/rfq`, label: "RFQ", enabled: true, count: rfx.drafted_at ? undefined : "draft" },
    { href: `/rfx/${id}/replies`, label: "Replies", enabled: !!rfx.sent_at || replies > 0, why: "Send the RFQ first", count: rfx.sent_at ? `${replies}/${a.vendors.length}` : undefined, live: reading > 0 },
    { href: `/rfx/${id}/compare`, label: "Comparison", enabled: read > 0, why: "Available once a reply has been read" },
    { href: `/rfx/${id}/review`, label: "Review", enabled: read > 0, why: "Available once a reply has been read", count: open ? String(open) : undefined, warn: open > 0 },
    { href: `/rfx/${id}/award`, label: "Award", enabled: a.hasMemo || a.scenarios.length > 0, why: "Save a scenario in the comparison first" },
  ];

  return (
    <div>
      <div className="no-print border-b border-line pt-5">
        <Link href="/rfx" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Sourcing events</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted">{rfx.code}</span>
              <Badge tone={phase === "awarded" ? "ok" : phase === "analysis" ? "accent" : phase === "out" ? "info" : "neutral"}>{PHASE_LABEL[phase]}</Badge>
              {reading > 0 && <Badge tone="accent">AI reading {reading} repl{reading > 1 ? "ies" : "y"}</Badge>}
            </div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{rfx.title}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {rfx.category} · {a.vendors.length} vendors · created {date(rfx.created_at)}
              {due && ` · replies due ${date(due)}`}
            </p>
          </div>
          <ol className="flex items-center gap-1.5 text-xs">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${i < step ? "bg-ok text-[#166534]" : i === step ? "bg-accent text-white" : "bg-panel text-muted"}`}>
                  {i < step ? "✓" : i + 1} {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
              </li>
            ))}
          </ol>
        </div>
        <RfxTabs tabs={tabs} />
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
