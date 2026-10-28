"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { PHASE_LABEL, STEPS, stepIndex, type Phase } from "@/lib/lifecycle";

type Row = {
  id: string; code: string; title: string; category: string; phase: Phase; updated: string; vendors: number; replied: number;
  read: number; reading: number; openIssues: number; best: { label: string; vendor: string | null } | null; saving: string | null; awarded: string | null;
};

const FILTERS: { key: Phase | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "drafting", label: "Drafting" },
  { key: "out", label: "Out for quote" },
  { key: "analysis", label: "Analysing" },
  { key: "awarded", label: "Awarded" },
];
const TONE: Record<Phase, "neutral" | "accent" | "info" | "warn" | "ok"> = { drafting: "neutral", ready: "neutral", out: "info", analysis: "accent", awarded: "ok" };

const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function RfxTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Phase | "all">("all");
  const [q, setQ] = useState("");
  const shown = useMemo(
    () => rows.filter((r) => (filter === "all" || r.phase === filter || (filter === "drafting" && r.phase === "ready")) && (!q || `${r.code} ${r.title}`.toLowerCase().includes(q.toLowerCase()))),
    [rows, filter, q],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {FILTERS.map((f) => {
          const n = f.key === "all" ? rows.length : rows.filter((r) => r.phase === f.key || (f.key === "drafting" && r.phase === "ready")).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-panel"}`}>
              {f.label} <span className="text-xs opacity-70">{n}</span>
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-2 rounded-lg border border-line px-2.5">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RFx" className="h-8 w-44 text-sm outline-none" />
        </label>
      </div>
      <ul className="divide-y divide-line">
        {shown.map((r) => {
          const step = stepIndex(r.phase);
          return (
            <li key={r.id}>
              <Link href={`/rfx/${r.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-panel/70 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted">{r.code}</span>
                    <Badge tone={TONE[r.phase]}>{PHASE_LABEL[r.phase]}</Badge>
                    {r.reading > 0 && <Badge tone="accent">AI reading {r.reading}</Badge>}
                  </div>
                  <p className="mt-1 truncate font-medium">{r.title}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <span key={s.key} title={s.label} className={`h-1.5 w-8 rounded-full ${i < step ? "bg-accent" : i === step ? "bg-accent/40" : "bg-line"}`} />
                    ))}
                    <span className="ml-2 text-xs text-muted">{r.category} · updated {ago(r.updated)}</span>
                  </div>
                </div>
                <div className="hidden text-sm lg:block">
                  <p className="text-xs text-muted">Replies</p>
                  <p>{r.phase === "drafting" || r.phase === "ready" ? `${r.vendors} vendors to invite` : `${r.replied} of ${r.vendors} received · ${r.read} read`}</p>
                  {r.openIssues > 0 && <p className="text-xs text-[#b45309]">{r.openIssues} {r.openIssues === 1 ? "item needs" : "items need"} a look</p>}
                </div>
                <div className="hidden text-sm lg:block">
                  <p className="text-xs text-muted">{r.awarded ? "Awarded value" : "Best complete offer"}</p>
                  <p className="font-medium tabular-nums">{r.awarded ?? r.best?.label ?? "—"}</p>
                  {r.saving && <p className="text-xs text-[#15803d]">{r.saving} saved vs last year</p>}
                  {!r.awarded && r.best?.vendor && <p className="truncate text-xs text-muted">{r.best.vendor}</p>}
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-accent opacity-80 group-hover:opacity-100">
                  {r.phase === "awarded" ? "View" : "Continue"} <ChevronRight size={16} />
                </span>
              </Link>
            </li>
          );
        })}
        {!shown.length && <li className="px-5 py-12 text-center text-sm text-muted">No RFx match.</li>}
      </ul>
    </Card>
  );
}
