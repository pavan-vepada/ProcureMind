import { ArrowRight, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { listWorkspace } from "@/lib/data";
import { money } from "@/lib/format";
import { phaseOf } from "@/lib/lifecycle";
import { RfxTable } from "./rfx-table";

/** Home: every RFx the buyer is running, at whatever stage, plus requests waiting to become an RFx. */
export default async function Home() {
  const { user, summaries, pending } = await listWorkspace();
  const first = user.email?.split("@")[0].split(/[+._-]/)[0] ?? "";
  const name = first ? first[0].toUpperCase() + first.slice(1) : "";
  const active = summaries.filter((s) => phaseOf(s.rfx) !== "awarded");
  const reading = summaries.reduce((n, s) => n + s.reading, 0);
  const openIssues = summaries.reduce((n, s) => n + s.openIssues, 0);
  const savings = summaries.reduce((n, s) => n + (s.savingVsLastYear ?? 0), 0);

  const rows = summaries.map((s) => ({
    id: s.rfx.id, code: s.rfx.code, title: s.rfx.title, category: s.rfx.category, phase: phaseOf(s.rfx), updated: s.rfx.updated_at,
    vendors: s.vendors, replied: s.replied, read: s.read, reading: s.reading, openIssues: s.openIssues,
    best: s.best, saving: s.savingVsLastYear !== null ? money(s.savingVsLastYear) : null, awarded: s.awardedTotal !== null ? money(s.awardedTotal) : null,
  }));

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Sunrise Consumer Goods · Procurement</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name ? `Good to see you, ${name}` : "Sourcing events"}</h1>
        </div>
        <ButtonLink href="/rfx/new" variant="primary" size="lg"><Plus size={17} /> New RFx</ButtonLink>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active RFx" value={String(active.length)} sub={`${summaries.length - active.length} awarded`} />
        <Stat label="Replies being read by AI" value={String(reading)} sub={reading ? "Open the RFx to watch live" : "All caught up"} tone={reading ? "accent" : undefined} />
        <Stat label="Items needing a look" value={String(openIssues)} sub="Across all RFx" tone={openIssues ? "warn" : undefined} />
        <Stat label="Savings identified" value={savings ? money(savings) : "—"} sub="vs last year's contracts" tone={savings ? "ok" : undefined} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
        <RfxTable rows={rows} />

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Inbox size={17} /> Requests waiting for you</h2>
            <p className="mt-1 text-sm text-muted">Internal requests from the plants. Turn one into an RFx and the co-pilot drafts it.</p>
            <div className="mt-4 space-y-3">
              {pending.map((p) => (
                <Link key={p.key} href={`/rfx/new?request=${p.key}`} className="group block rounded-xl border border-line p-4 transition hover:border-accent hover:bg-accent-soft/40">
                  <p className="text-xs text-muted">{p.request.from}</p>
                  <p className="mt-0.5 font-medium">{p.request.subject}</p>
                  <p className="mt-1 text-xs text-muted">{p.lines.length} items · {p.vendors.length} suppliers shortlisted</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent">Start RFx <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
              {!pending.length && <p className="rounded-lg bg-panel p-3 text-sm text-muted">No requests waiting. You can still start an RFx from your own description.</p>}
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">How Procure Mind works</h2>
            <ol className="mt-3 space-y-2 text-muted">
              <li><span className="font-medium text-ink">1.</span> The co-pilot drafts the RFQ from the plant&apos;s request.</li>
              <li><span className="font-medium text-ink">2.</span> Vendors reply any way they like: Excel, PDF, Word, a photo, an email.</li>
              <li><span className="font-medium text-ink">3.</span> AI reads every reply; code converts every price to one basis, with the source one click away.</li>
              <li><span className="font-medium text-ink">4.</span> Ask what-ifs in plain words, then recommend the award.</li>
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "accent" | "warn" | "ok" }) {
  const t = tone === "accent" ? "border-[#c7d2fe] bg-accent-soft" : tone === "warn" ? "border-[#f5e2a8] bg-warn/60" : tone === "ok" ? "border-[#c6ebd3] bg-ok/70" : "border-line bg-surface";
  return (
    <div className={`rounded-xl border p-4 ${t}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
