import { Check } from "lucide-react";
import Link from "next/link";
import { getAnalysis } from "@/lib/data";
import { PHASE_LABEL, phaseOf, STEPS, stepIndex } from "@/lib/lifecycle";
import { RfxTabs } from "./rfx-tabs";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export async function generateMetadata({ params }: LayoutProps<"/rfx/[id]">) {
  const { id } = await params;
  const { rfx } = await getAnalysis(id);
  return { title: `${rfx.code} · ${rfx.title}` };
}

/** The frame of one RFx: breadcrumb, title, stage and the tabs. */
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
      <div className="no-print -mx-7 border-b border-line bg-surface px-7 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">
              <Link href="/rfx" className="hover:text-ink">Sourcing events</Link> / <span className="font-mono">{rfx.code}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-[21px] font-semibold leading-7">{rfx.title}</h1>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${phase === "analysis" || phase === "out" ? "bg-accent-soft text-accent-hover" : phase === "awarded" ? "bg-ink text-white" : "bg-panel text-ink-soft"}`}>{PHASE_LABEL[phase]}</span>
              {rfx.dataset && <span className="rounded border border-[#d8d4c9] px-1.5 text-[11px] text-muted">Sample</span>}
              {reading > 0 && <span className="text-[13px] text-muted">Reading {reading} {reading > 1 ? "replies" : "reply"}…</span>}
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {a.vendors.length} suppliers · created {date(rfx.created_at)}
              {due && ` · replies due ${date(due)}`}
            </p>
          </div>
          <ol className="flex items-center gap-1.5 text-[13px]" aria-label="Stage">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className={`flex items-center gap-1 ${i < step ? "text-ink-soft" : i === step ? "font-semibold text-ink" : "text-faint"}`} aria-current={i === step ? "step" : undefined}>
                  {i < step && <Check size={13} strokeWidth={2.5} className="text-accent" />}
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="text-faint">·</span>}
              </li>
            ))}
          </ol>
        </div>
        <RfxTabs tabs={tabs} />
      </div>
      <div className="pt-5">{children}</div>
    </div>
  );
}
