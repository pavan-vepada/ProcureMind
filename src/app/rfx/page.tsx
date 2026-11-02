import { AlertTriangle, FilePlus2, FileSignature, Inbox, Plus, Send, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { listWorkspace } from "@/lib/data";
import { money } from "@/lib/format";
import { phaseOf } from "@/lib/lifecycle";
import { RfxTable } from "./rfx-table";

export const metadata = { title: "Sourcing events" };

type Action = { key: string; icon: LucideIcon; tone: "warn" | "neutral" | "accent"; title: string; detail: string; at: string | null; href: string; cta: string; primary?: boolean };

const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

/** Home: what needs the buyer's attention, then every sourcing event at whatever stage it is. */
export default async function Home() {
  const { summaries, pending } = await listWorkspace();
  const active = summaries.filter((s) => phaseOf(s.rfx) !== "awarded");
  const reading = summaries.reduce((n, s) => n + s.reading, 0);
  const openIssues = summaries.reduce((n, s) => n + s.openIssues, 0);
  const savings = summaries.reduce((n, s) => n + (s.savingVsLastYear ?? 0), 0);

  // The worklist: one line per thing the buyer can move forward.
  const actions: Action[] = [];
  for (const s of summaries) {
    const r = s.rfx;
    const phase = phaseOf(r);
    const detail = `${r.code} · ${r.title}`;
    if (s.reading > 0) actions.push({ key: `${r.id}-read`, icon: Inbox, tone: "neutral", title: `${s.reading} ${s.reading === 1 ? "reply" : "replies"} being read`, detail, at: r.updated_at, href: `/rfx/${r.id}/replies`, cta: "Open replies" });
    if (phase === "analysis" && s.openIssues > 0) actions.push({ key: `${r.id}-review`, icon: AlertTriangle, tone: "warn", title: `Review ${s.openIssues} flagged ${s.openIssues === 1 ? "item" : "items"}`, detail, at: r.updated_at, href: `/rfx/${r.id}/review`, cta: "Review" });
    if (phase === "analysis" && s.openIssues === 0) actions.push({ key: `${r.id}-award`, icon: FileSignature, tone: "neutral", title: "Ready for an award recommendation", detail, at: r.updated_at, href: `/rfx/${r.id}/compare`, cta: "Open comparison" });
    if (phase === "ready") actions.push({ key: `${r.id}-send`, icon: Send, tone: "neutral", title: `RFQ ready to send to ${s.vendors} suppliers`, detail, at: r.updated_at, href: `/rfx/${r.id}/rfq`, cta: "Review & send" });
    if (phase === "drafting") actions.push({ key: `${r.id}-draft`, icon: FilePlus2, tone: "neutral", title: "RFQ not drafted yet", detail, at: r.updated_at, href: `/rfx/${r.id}/rfq`, cta: "Draft RFQ" });
  }
  for (const p of pending) {
    actions.push({ key: `req-${p.key}`, icon: FilePlus2, tone: "accent", title: `New request: ${p.request.subject}`, detail: `${p.request.from} · ${p.lines.length} items · ${p.vendors.length} suppliers shortlisted`, at: null, href: `/rfx/new?request=${p.key}`, cta: "Start RFx", primary: true });
  }

  const rows = summaries.map((s) => ({
    id: s.rfx.id, code: s.rfx.code, title: s.rfx.title, sample: !!s.rfx.dataset, phase: phaseOf(s.rfx), updated: s.rfx.updated_at,
    vendors: s.vendors, replied: s.replied, read: s.read, reading: s.reading, openIssues: s.openIssues,
    best: s.best, saving: s.savingVsLastYear !== null ? money(s.savingVsLastYear) : null, awarded: s.awardedTotal !== null ? money(s.awardedTotal) : null,
  }));

  return (
    <div className="flex flex-col gap-5 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold leading-8">Sourcing events</h1>
          <p className="text-sm text-muted">Packaging · Pune and Nashik plants</p>
        </div>
        <ButtonLink href="/rfx/new" variant="primary"><Plus size={16} strokeWidth={2.2} /> New RFx</ButtonLink>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-4">
        <Stat label="Active events" value={String(active.length)} note={`${summaries.length - active.length} awarded`} />
        <Stat label="Replies being read" value={String(reading)} />
        <Stat label="Open items" value={String(openIssues)} />
        <Stat label="Savings vs last year" value={savings ? money(savings) : "—"} />
      </dl>

      <section className="rounded-lg border border-line bg-surface" aria-labelledby="worklist">
        <div className="flex h-11 items-center justify-between border-b border-line px-4.5">
          <h2 id="worklist" className="text-[15px] font-semibold">Needs your action</h2>
          <span className="text-[13px] text-muted">{actions.length} {actions.length === 1 ? "item" : "items"}</span>
        </div>
        <ul className="divide-y divide-[#f0ede6]">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.key} className="flex min-h-13 items-center gap-3.5 px-4.5 py-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${a.tone === "warn" ? "bg-warn text-warn-ink" : a.tone === "accent" ? "bg-accent-soft text-accent" : "bg-panel text-ink-soft"}`}>
                  <Icon size={15} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 leading-[19px]">
                  <span className="block truncate font-semibold">{a.title}</span>
                  <span className="block truncate text-[13px] text-muted">{a.detail}</span>
                </span>
                {a.at && <span className="hidden w-20 text-right text-[13px] text-muted sm:block">{ago(a.at)}</span>}
                <Link href={a.href} className={`inline-flex h-8 w-28 shrink-0 items-center justify-center rounded-md text-[13px] ${a.primary ? "bg-accent font-semibold text-white hover:bg-accent-hover" : "border border-[#d8d4c9] bg-surface font-medium hover:bg-panel"}`}>
                  {a.cta}
                </Link>
              </li>
            );
          })}
          {!actions.length && <li className="px-4.5 py-6 text-sm text-muted">Nothing needs your attention right now.</li>}
        </ul>
      </section>

      <RfxTable rows={rows} />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-line px-4.5 py-3 not-last:border-r">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-mono text-xl font-medium tabular-nums">
        {value} {note && <span className="font-sans text-[13px] font-normal text-muted">· {note}</span>}
      </dd>
    </div>
  );
}
