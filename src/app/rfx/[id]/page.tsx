import { ArrowRight, FileText, Mail, PenLine } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { getAnalysis } from "@/lib/data";
import { dataset } from "@/lib/demo/datasets";
import { money } from "@/lib/format";
import { phaseOf } from "@/lib/lifecycle";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const STATUS: Record<string, [string, "neutral" | "info" | "ok" | "clar"]> = {
  not_sent: ["Not invited yet", "neutral"], sent: ["Invited, awaiting reply", "info"], replied: ["Replied", "ok"], clarification_requested: ["Clarification asked", "clar"],
};

/** Overview of one RFx: where it stands, the one thing to do next, and its context. */
export default async function Overview(props: PageProps<"/rfx/[id]">) {
  const { id } = await props.params;
  const a = await getAnalysis(id);
  const { rfx, comparison } = a;
  const phase = phaseOf(rfx);
  const replies = a.messages.filter((m) => m.direction === "in");
  const read = comparison.vendors.filter((v) => v.processed);
  const reading = a.runs.filter((r) => r.status === "queued" || r.status === "running").length;
  const open = a.issues.filter((i) => i.status === "open").length;
  const complete = read.filter((v) => v.valid && v.linesQuoted === a.input.lines.length).sort((x, y) => x.total - y.total);
  const samplesLeft = !!dataset(rfx.dataset) && a.vendors.some((v) => v.status === "sent");
  let memoTotal: number | null = null;
  if (a.hasMemo) {
    const { data } = await a.supabase.from("award_memos").select("content").eq("rfx_id", id).limit(1).single();
    memoTotal = (data?.content as { total?: number } | null)?.total ?? null;
  }

  const status = {
    drafting: { title: "The RFQ hasn't been drafted yet", text: "Line items, questionnaire, terms and cover email are drafted from the request below.", href: `/rfx/${id}/rfq`, cta: "Draft the RFQ", icon: PenLine },
    ready: { title: `Draft ready: ${a.input.lines.length} lines for ${a.vendors.length} suppliers`, text: "Check the line items and the evaluation rules, then lock the rules and send.", href: `/rfx/${id}/rfq`, cta: "Review and send", icon: FileText },
    out: {
      title: `${replies.length ? new Set(replies.map((m) => m.vendor_id)).size : 0} of ${a.vendors.length} suppliers have replied`,
      text: reading ? `Reading ${reading} repl${reading > 1 ? "ies" : "y"} now.` : samplesLeft ? "Waiting for the remaining suppliers. Upload a reply you received, or simulate the sample replies." : "Upload replies as they arrive; each one is read as it lands.",
      href: `/rfx/${id}/replies`, cta: "Open replies", icon: Mail,
    },
    analysis: {
      title: `${read.length} of ${a.vendors.length} quotes on one basis${complete[0] ? ` · best complete offer ${money(complete[0].total)}` : ""}`,
      text: `${open ? `${open} ${open === 1 ? "item needs" : "items need"} a look. ` : ""}Compare, check sources, ask what-ifs, then recommend the award.`,
      href: `/rfx/${id}/compare`, cta: "Open comparison", icon: ArrowRight,
    },
    awarded: { title: `Awarded${memoTotal ? ` · ${money(memoTotal)} a year` : ""}`, text: "The award memo has the split by supplier, savings, rules used, risks and evidence for every figure.", href: `/rfx/${id}/award`, cta: "Open award memo", icon: FileText },
  }[phase];

  const activity = [
    { at: rfx.created_at, text: `Request from ${rfx.internal_request.from}: “${rfx.internal_request.subject}”` },
    rfx.drafted_at && { at: rfx.drafted_at, text: `RFQ drafted: ${a.input.lines.length} lines` },
    rfx.sent_at && { at: rfx.sent_at, text: `Rules locked and RFQ sent to ${a.vendors.length} suppliers` },
    ...a.messages.filter((m) => m.direction === "in" || m.kind === "clarification_request").map((m) => {
      const v = a.vendors.find((x) => x.id === m.vendor_id)?.name ?? "Unknown sender";
      const what = m.kind === "clarification_request" ? `Clarification asked to ${v}` : m.kind === "clarification_reply" ? `${v} answered the clarification` : m.kind === "upload" ? `Reply uploaded for ${v}` : `Quote received from ${v}${m.late ? " (late)" : ""}`;
      return { at: m.received_at, text: what };
    }),
    ...a.scenarios.map((s) => ({ at: s.created_at, text: `Scenario saved: “${s.name}”` })),
  ].filter(Boolean).sort((x, y) => Date.parse((y as { at: string }).at) - Date.parse((x as { at: string }).at)) as { at: string; text: string }[];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center gap-5 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent"><status.icon size={19} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold">{status.title}</h2>
            <p className="mt-0.5 text-sm text-muted">{status.text}</p>
          </div>
          <div className="flex gap-2">
            {phase === "analysis" && open > 0 && <ButtonLink href={`/rfx/${id}/review`}>Review {open} {open === 1 ? "item" : "items"}</ButtonLink>}
            <ButtonLink href={status.href} variant="primary">{status.cta}</ButtonLink>
          </div>
        </Card>

        {read.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-semibold">Suppliers</h2>
              <Link href={`/rfx/${id}/compare`} className="text-sm text-accent hover:underline">Full comparison →</Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-panel/60 text-left text-xs text-muted">
                <tr><th className="px-5 py-2 font-medium">Supplier</th><th className="font-medium">Items quoted</th><th className="font-medium">Total value</th><th className="font-medium">Questionnaire</th><th className="font-medium">Payment</th><th className="pr-5 font-medium">Open items</th></tr>
              </thead>
              <tbody>
                {comparison.vendors.map((s) => (
                  <tr key={s.vendor.id} className="border-t border-line">
                    <td className="px-5 py-2.5"><Link href={`/rfx/${id}/vendors/${s.vendor.code}`} className="font-medium hover:text-accent">{s.vendor.name}</Link></td>
                    <td>{s.processed ? `${s.linesQuoted} / ${a.input.lines.length}` : <span className="text-muted">—</span>}</td>
                    <td className="tabular-nums">{s.processed ? money(s.total) : <span className="text-muted">—</span>}</td>
                    <td>{s.processed ? <Badge tone={s.valid ? "ok" : "bad"}>{s.valid ? `Pass · ${s.questionnaire.score}%` : s.invalidReasons[0]?.startsWith("ISO") ? "ISO expired" : `Fail · ${s.questionnaire.score}%`}</Badge> : <span className="text-muted">{STATUS[s.vendor.status]?.[0]}</span>}</td>
                    <td>{s.vendor.payment_days ? `${s.vendor.payment_days} days` : "—"}</td>
                    <td className="pr-5">{s.openIssues ? <span className="text-warn-ink">{s.openIssues}</span> : <span className="text-muted">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="font-semibold">Internal request</h2>
          <p className="mt-1 text-xs text-muted">From {rfx.internal_request.from}</p>
          <p className="mt-2 font-medium">{rfx.internal_request.subject}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/85">{rfx.internal_request.body}</p>
        </Card>

        {a.rfi.length > 0 && (
          <Card className="overflow-hidden">
            <h2 className="border-b border-line px-5 py-3 font-semibold">RFI results · {a.rfi.filter((r) => r.shortlisted).length} of {a.rfi.length} shortlisted</h2>
            <table className="w-full text-sm">
              <thead className="bg-panel/60 text-left text-xs text-muted">
                <tr>{["Supplier", "ISO 9001", "FSC", "Capacity / month", "Shortlisted", "Why"].map((h) => <th key={h} className="px-5 py-2 font-medium first:pl-5">{h}</th>)}</tr>
              </thead>
              <tbody>
                {a.rfi.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-5 py-2">{r.vendor_name}</td>
                    <td className="px-5">{r.iso_9001 ? "✓" : "✕"}</td>
                    <td className="px-5">{r.fsc ? "✓" : "✕"}</td>
                    <td className="px-5">{r.monthly_capacity}</td>
                    <td className="px-5">{r.shortlisted ? <Badge tone="ok">Yes</Badge> : <span className="text-muted">No</span>}</td>
                    <td className="px-5 text-muted">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="font-semibold">Suppliers on this RFx</h2>
          <ul className="mt-3 space-y-3">
            {a.vendors.map((v) => (
              <li key={v.id}>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/rfx/${id}/vendors/${v.code}`} className="font-medium hover:text-accent">{v.name}</Link>
                  <Badge tone={STATUS[v.status]?.[1] ?? "neutral"}>{STATUS[v.status]?.[0] ?? v.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">{v.rfp_summary}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Activity</h2>
          <ol className="mt-3 space-y-3 border-l border-line pl-4">
            {activity.slice(0, 14).map((e, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-faint" />
                <p>{e.text}</p>
                <p className="text-xs text-muted">{when(e.at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
