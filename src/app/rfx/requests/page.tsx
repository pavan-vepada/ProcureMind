import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { PENDING_REQUESTS, dataset } from "@/lib/demo/datasets";
import { requireUser } from "@/lib/data";

export const metadata = { title: "Requests" };

/** Internal requests from the plants: waiting ones can become an RFx; started ones link to their event. */
export default async function RequestsPage() {
  const { supabase } = await requireUser();
  const { data: rows } = await supabase.from("rfx").select("id, code, title, dataset");
  const startedBy = new Map((rows ?? []).filter((r) => r.dataset).map((r) => [r.dataset as string, r]));
  const waiting = PENDING_REQUESTS.filter((k) => !startedBy.has(k)).map((k) => dataset(k)!);
  const started = PENDING_REQUESTS.filter((k) => startedBy.has(k)).map((k) => ({ ds: dataset(k)!, rfx: startedBy.get(k)! }));

  return (
    <div className="pt-6">
      <PageHeader title="Requests" subtitle="Needs sent in by the plants and teams. Each one becomes a sourcing event." />
      <div className="space-y-4">
        {waiting.map((d) => (
          <Card key={d.key} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-3xl">
                <p className="text-[13px] text-muted">{d.request.from}</p>
                <h2 className="mt-0.5 text-[17px] font-semibold">{d.request.subject}</h2>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{d.request.body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge><FileSpreadsheet size={11} /> Volume sheet · {d.lines.length} items</Badge>
                  {d.vendors.map((v) => <Badge key={v.code}>{v.name}</Badge>)}
                </div>
              </div>
              <ButtonLink href={`/rfx/new?request=${d.key}`} variant="primary">Start RFx</ButtonLink>
            </div>
          </Card>
        ))}
        {!waiting.length && <Card className="p-6 text-sm text-muted">No requests waiting. <Link href="/rfx/new" className="text-accent hover:underline">Start an RFx from your own description</Link>.</Card>}
      </div>
      {started.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-[15px] font-semibold">Already started</h2>
          <Card className="divide-y divide-line">
            {started.map(({ ds, rfx }) => (
              <Link key={ds.key} href={`/rfx/${rfx.id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-page">
                <span>{ds.request.subject}</span>
                <span className="font-mono text-xs text-muted">{rfx.code}</span>
              </Link>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
