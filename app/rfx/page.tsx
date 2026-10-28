import { FileText, Inbox, ListChecks, Users } from "lucide-react";
import { NextAction } from "@/components/next-action";
import { Card } from "@/components/ui";
import { getAnalysis } from "@/lib/data";
import { money } from "@/lib/format";
import { nextStep } from "@/lib/next-step";

/** S2: where a new user lands, inside their own copy of the demo RFx. */
export default async function Workspace() {
  const a = await getAnalysis();
  const { user, rfx, vendors, rfi, comparison, messages } = a;
  const first = user.email?.split("@")[0].split(/[+._-]/)[0] ?? "";
  const name = first ? first[0].toUpperCase() + first.slice(1) : "there";
  const replies = messages.filter((m) => m.direction === "in").length;
  const processed = comparison.vendors.filter((v) => v.processed).length;
  const { count: memo } = await a.supabase.from("award_memos").select("id", { count: "exact", head: true });
  const next = nextStep(rfx, { replies, memo: (memo ?? 0) > 0 });
  const stageText = !rfx.drafted_at ? "RFQ not drafted yet" : !rfx.sent_at ? "RFQ drafted, not sent" : !replies ? `Sent to ${vendors.length} vendors` : `${processed} of ${vendors.length} replies read`;

  const cards = [
    { icon: ListChecks, label: "Stage", value: stageText, highlight: true },
    { icon: Users, label: "Vendors", value: `${vendors.length} shortlisted from ${rfi.length}` },
    { icon: FileText, label: "Line items", value: rfx.drafted_at ? `${a.input.lines.length} lines · ${a.input.questions.length}-question questionnaire` : "30 to be drafted" },
    { icon: Inbox, label: "Replies", value: replies ? `${replies} received · ${a.issues.filter((i) => i.status === "open").length} items need a look` : `0 of ${vendors.length} · due Day ${rfx.due_day}` },
  ];
  const activity = [
    `Day ${rfx.internal_request.day} · Internal request from ${rfx.internal_request.from}`,
    `RFI: ${rfi.length} vendors asked, ${vendors.length} shortlisted · RFP: ${vendors.length} proposals summarised`,
    rfx.drafted_at && `RFQ drafted by the ${rfx.draft_source === "ai" ? "co-pilot" : "prepared draft"}: ${a.input.lines.length} lines`,
    rfx.sent_at && `Day 0 · Rules locked and RFQ sent to ${vendors.length} vendors`,
    ...messages.filter((m) => m.direction === "in").map((m) => `Day ${m.day} · ${vendors.find((v) => v.id === m.vendor_id)?.name ?? "Unknown"}: ${m.kind === "clarification_reply" ? "clarification reply" : m.kind === "upload" ? "uploaded reply" : "quote received"}${m.late ? " (late)" : ""}`),
  ].filter(Boolean) as string[];

  return (
    <>
      <Card className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name}. This is your own copy of the demo RFx.</h1>
        <p className="mt-2 max-w-3xl text-muted">
          {rfx.buyer_company} needs new shipper boxes and inner packaging for both plants. Follow the tour on the right, or click the
          indigo button at the bottom of each screen.
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className={`p-4 ${c.highlight ? "border-accent bg-accent-soft" : ""}`}>
            <p className="flex items-center gap-2 text-sm text-muted">
              <c.icon size={15} /> {c.label}
            </p>
            <p className="mt-1.5 font-medium">{c.value}</p>
          </Card>
        ))}
      </div>

      {processed > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="font-semibold">Vendors at a glance</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            {comparison.vendors.map((s) => (
              <div key={s.vendor.id} className="rounded-lg border border-line p-3 text-sm">
                <p className="text-xs text-muted">{s.vendor.code}</p>
                <p className="font-medium">{s.vendor.name}</p>
                <p className="mt-1 text-muted">{s.processed ? `${s.linesQuoted}/30 · ${money(s.total)}` : "Not read yet"}</p>
                {s.processed && <p className={`mt-1 text-xs ${s.valid ? "text-[#15803d]" : "text-[#b91c1c]"}`}>{s.valid ? "Passes the rules" : s.invalidReasons[0]}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {activity.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="bg-info p-5 text-sm">
          <h2 className="font-semibold">Your demo copy</h2>
          <p className="mt-3">Everything you do here is private to your account and saved as you go.</p>
          <p className="mt-3">↺ Reset demo puts it back to the start so you can replay the story.</p>
        </Card>
      </div>

      <NextAction href={next.href} label={next.label} />
    </>
  );
}
