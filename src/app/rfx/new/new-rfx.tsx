"use client";

import { ArrowLeft, FileSpreadsheet, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { startFromNeed, startFromRequest } from "@/app/rfx/actions";
import { Badge, Button, Card } from "@/components/ui";

type Pending = { key: string; from: string; subject: string; body: string; lines: number; vendors: string[] };
type Supplier = { name: string; email: string; note: string };

const EXAMPLE = "We need about 40,000 5-ply shipper boxes a year (450 × 300 × 280 mm) for the new hand-wash refills, split roughly 60/40 between Plant 1 and Plant 2, plus matching 3-ply partitions (4 × 3 cells).";

export function NewRfx({ pending, suppliers, preselect }: { pending: Pending[]; suppliers: Supplier[]; preselect: string | null }) {
  const [mode, setMode] = useState<"request" | "need">(pending.length ? "request" : "need");
  const [chosen, setChosen] = useState<string | null>(preselect && pending.some((p) => p.key === preselect) ? preselect : pending[0]?.key ?? null);
  const [title, setTitle] = useState("");
  const [need, setNeed] = useState("");
  const [picked, setPicked] = useState<string[]>(suppliers.slice(0, 4).map((s) => s.email));
  const [error, setError] = useState<string | null>(null);
  const [pending_, start] = useTransition();
  const req = pending.find((p) => p.key === chosen);

  return (
    <div className="mx-auto max-w-4xl pt-8">
      <Link href="/rfx" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Sourcing events</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">New RFx</h1>
      <p className="mt-1 text-muted">Start from a request the plants sent you, or describe what you need. The co-pilot drafts the RFQ either way.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ModeCard active={mode === "request"} onClick={() => setMode("request")} icon={<FileSpreadsheet size={18} />} title="From an internal request"
          text={pending.length ? `${pending.length} waiting · volume sheet and shortlist attached` : "No requests waiting right now"} disabled={!pending.length} />
        <ModeCard active={mode === "need"} onClick={() => setMode("need")} icon={<PenLine size={18} />} title="Describe a need" text="In your own words; the co-pilot proposes the lines" />
      </div>

      {mode === "request" && req && (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <button key={p.key} onClick={() => setChosen(p.key)} className={`rounded-lg border px-3 py-2 text-left text-sm ${p.key === chosen ? "border-accent bg-accent-soft" : "border-line hover:bg-panel"}`}>
                {p.subject}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-line bg-panel/60 p-5">
            <p className="text-xs text-muted">From {req.from}</p>
            <p className="mt-1 font-medium">{req.subject}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{req.body}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge tone="info"><FileSpreadsheet size={11} /> Volume sheet · {req.lines} items</Badge>
              {req.vendors.map((v) => <Badge key={v}>{v}</Badge>)}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-muted">The co-pilot will draft line items, questionnaire, terms and the cover email.</p>
            <Button variant="primary" size="lg" disabled={pending_} onClick={() => start(() => startFromRequest(req.key))}>
              <Sparkles size={16} /> {pending_ ? "Creating…" : "Create RFx and draft"}
            </Button>
          </div>
        </Card>
      )}

      {mode === "need" && (
        <Card className="mt-6 p-6">
          <label className="block text-sm">
            <span className="font-medium">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hand-wash refill shippers"
              className="mt-1.5 h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
          </label>
          <label className="mt-4 block text-sm">
            <span className="font-medium">What do you need?</span>
            <span className="ml-2 text-muted">Sizes, ply and yearly volumes per plant help the co-pilot.</span>
            <textarea value={need} onChange={(e) => setNeed(e.target.value)} rows={5} placeholder={EXAMPLE}
              className="mt-1.5 w-full rounded-lg border border-line p-3 leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
          </label>
          {!need && <button onClick={() => { setNeed(EXAMPLE); setTitle("Hand-wash refill shippers"); }} className="mt-1 text-xs text-accent hover:underline">Use an example</button>}
          <p className="mt-5 text-sm font-medium">Suppliers to invite</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {suppliers.map((s) => (
              <label key={s.email} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm ${picked.includes(s.email) ? "border-accent bg-accent-soft/50" : "border-line hover:bg-panel"}`}>
                <input type="checkbox" className="mt-0.5 accent-[#4f46e5]" checked={picked.includes(s.email)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.email] : p.filter((x) => x !== s.email)))} />
                <span><span className="font-medium">{s.name}</span><span className="block text-xs text-muted">{s.note}</span></span>
              </label>
            ))}
          </div>
          {error && <p className="mt-4 rounded-lg bg-bad px-3 py-2 text-sm">{error}</p>}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-muted">Replies to this RFx come in by upload (any Excel, PDF, Word, photo or email text).</p>
            <Button variant="primary" size="lg" disabled={pending_}
              onClick={() => start(async () => { const r = await startFromNeed({ title, request: need, suppliers: picked }); if (r?.error) setError(r.error); })}>
              <Sparkles size={16} /> {pending_ ? "Creating…" : "Create RFx and draft"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, text, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:bg-panel"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-accent text-white" : "bg-panel text-muted"}`}>{icon}</span>
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-sm text-muted">{text}</p>
    </button>
  );
}
