import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/data";

export const metadata = { title: "Search" };

type Hit = { href: string; title: string; detail: string };

/** Search across sourcing events, suppliers and line items. */
export default async function SearchPage(props: PageProps<"/rfx/search">) {
  const q = String((await props.searchParams).q ?? "").trim().slice(0, 80);
  const { supabase } = await requireUser();
  let events: Hit[] = [], suppliers: Hit[] = [], items: Hit[] = [];
  if (q) {
    // Escape the characters that mean something in a filter pattern.
    const like = `%${q.replace(/[%_,()\\]/g, " ")}%`;
    const [r, v, l] = await Promise.all([
      supabase.from("rfx").select("id, code, title").or(`title.ilike.${like},code.ilike.${like}`).limit(20),
      supabase.from("vendors").select("rfx_id, code, name, rfx:rfx(code, title)").ilike("name", like).limit(20),
      supabase.from("line_items").select("rfx_id, line_no, description, rfx:rfx(code)").ilike("description", like).limit(30),
    ]);
    events = (r.data ?? []).map((x) => ({ href: `/rfx/${x.id}`, title: x.title, detail: x.code }));
    suppliers = ((v.data ?? []) as unknown as { rfx_id: string; code: string; name: string; rfx: { code: string; title: string } | null }[])
      .map((x) => ({ href: `/rfx/${x.rfx_id}/vendors/${x.code}`, title: x.name, detail: `${x.rfx?.code} · ${x.rfx?.title}` }));
    items = ((l.data ?? []) as unknown as { rfx_id: string; line_no: number; description: string; rfx: { code: string } | null }[])
      .map((x) => ({ href: `/rfx/${x.rfx_id}/compare`, title: x.description, detail: `${x.rfx?.code} · item ${x.line_no}` }));
  }
  const total = events.length + suppliers.length + items.length;

  return (
    <div className="max-w-4xl pt-6">
      <PageHeader title={q ? `Results for “${q}”` : "Search"} subtitle={q ? `${total} ${total === 1 ? "match" : "matches"}` : "Search events, suppliers and items from the bar above."} />
      {[["Sourcing events", events], ["Suppliers", suppliers], ["Items", items]].map(([label, hits]) =>
        (hits as Hit[]).length ? (
          <section key={label as string} className="mb-5">
            <h2 className="mb-2 text-[15px] font-semibold">{label as string}</h2>
            <Card className="divide-y divide-line">
              {(hits as Hit[]).map((h, i) => (
                <Link key={`${h.href}-${i}`} href={h.href} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-page">
                  <span className="truncate">{h.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{h.detail}</span>
                </Link>
              ))}
            </Card>
          </section>
        ) : null,
      )}
      {q && !total && <Card className="p-6 text-sm text-muted">Nothing matches “{q}”. Try a supplier name, an RFx code or an item such as “partition”.</Card>}
    </div>
  );
}
