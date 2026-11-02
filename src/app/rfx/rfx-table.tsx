"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PHASE_LABEL, type Phase } from "@/lib/lifecycle";

type Row = {
  id: string; code: string; title: string; sample: boolean; phase: Phase; updated: string; vendors: number; replied: number;
  read: number; reading: number; openIssues: number; best: { label: string; vendor: string | null } | null; saving: string | null; awarded: string | null;
};

const FILTERS: { key: Phase | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "drafting", label: "Drafting" },
  { key: "out", label: "Out for quote" },
  { key: "analysis", label: "Analysing" },
  { key: "awarded", label: "Awarded" },
];
// Written out in full so the stylesheet generator can see it.
const COLS = "lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_24px]";

const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function Stage({ phase }: { phase: Phase }) {
  const mark =
    phase === "awarded" ? <Check size={14} strokeWidth={2.6} /> :
    phase === "analysis" ? <span className="h-2 w-2 rounded-full bg-accent" /> :
    phase === "out" ? <span className="h-2 w-2 rounded-full border-2 border-accent" /> :
    <span className="h-2 w-2 rounded-full border-2 border-faint" />;
  return <span className="flex items-center gap-2">{mark}{PHASE_LABEL[phase]}</span>;
}

export function RfxTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Phase | "all">("all");
  const shown = useMemo(
    () => rows.filter((r) => filter === "all" || r.phase === filter || (filter === "drafting" && r.phase === "ready")),
    [rows, filter],
  );

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface" aria-labelledby="all-events">
      <div className="flex flex-wrap items-center gap-1 border-b border-line py-2 pr-3 pl-4.5">
        <h2 id="all-events" className="mr-3 text-[15px] font-semibold">All events</h2>
        {FILTERS.map((f) => {
          const n = f.key === "all" ? rows.length : rows.filter((r) => r.phase === f.key || (f.key === "drafting" && r.phase === "ready")).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
              className={`h-[30px] rounded px-2.5 text-[13px] ${filter === f.key ? "bg-panel font-semibold text-ink" : "text-ink-soft hover:bg-panel/60"}`}>
              {f.label} {n}
            </button>
          );
        })}
      </div>
      <div className={`hidden ${COLS} items-center gap-x-4 border-b border-line px-4.5 py-2.5 text-xs font-semibold tracking-[0.04em] text-muted lg:grid`}>
        <span>EVENT</span><span>STAGE</span><span>REPLIES</span><span>BEST COMPLETE OFFER</span><span>VS LAST YEAR</span><span>UPDATED</span><span />
      </div>
      <ul className="divide-y divide-[#f0ede6]">
        {shown.map((r) => (
          <li key={r.id}>
            <Link href={`/rfx/${r.id}`} aria-label={`${r.phase === "awarded" ? "View" : "Continue"} ${r.title}`}
              className={`grid grid-cols-[1fr_24px] ${COLS} items-center gap-x-4 px-4.5 py-2.5 text-sm transition-colors hover:bg-page`}>
              <span className="min-w-0 leading-[19px]">
                <span className="block truncate font-semibold" title={r.title}>{r.title}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{r.code}</span>
                  {r.sample && <span className="rounded border border-[#d8d4c9] px-1.5 text-[11px] leading-4 text-muted">Sample</span>}
                </span>
              </span>
              <span className="hidden lg:block"><Stage phase={r.phase} /></span>
              <span className="hidden lg:block">
                {r.phase === "drafting" || r.phase === "ready" ? <span className="text-muted">{r.vendors} to invite</span> : <>{r.replied} of {r.vendors} · {r.read} read</>}
                {r.reading > 0 && <span className="block text-xs text-muted">reading {r.reading} now</span>}
                {r.openIssues > 0 && r.phase !== "awarded" && <span className="block text-xs text-warn-ink">{r.openIssues} open</span>}
              </span>
              <span className="hidden leading-[19px] lg:block">
                {r.awarded ?? r.best?.label ? (
                  <>
                    <span className="block font-mono font-medium tabular-nums">{r.awarded ?? r.best?.label}</span>
                    <span className="block truncate text-xs text-muted">{r.awarded ? "awarded" : r.best?.vendor}</span>
                  </>
                ) : <span className="text-muted">—</span>}
              </span>
              <span className="hidden font-mono tabular-nums lg:block">{r.saving ? `−${r.saving}` : <span className="font-sans text-muted">—</span>}</span>
              <span className="hidden text-muted lg:block">{ago(r.updated)}</span>
              <ChevronRight size={16} className="text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
        {!shown.length && <li className="px-4.5 py-10 text-center text-sm text-muted">No events in this stage.</li>}
      </ul>
    </section>
  );
}
