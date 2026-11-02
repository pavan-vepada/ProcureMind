import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { SUPPLIER_DIRECTORY } from "@/lib/demo/datasets";
import { requireUser } from "@/lib/data";

export const metadata = { title: "Suppliers" };

type VendorRow = { name: string; code: string; rfx_id: string; rfx: { code: string; title: string } | null };

/** The supplier directory, with the sourcing events each supplier is part of. */
export default async function SuppliersPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("vendors").select("name, code, rfx_id, rfx:rfx(code, title)").order("name");
  const byName = new Map<string, VendorRow[]>();
  for (const v of (data ?? []) as unknown as VendorRow[]) byName.set(v.name, [...(byName.get(v.name) ?? []), v]);
  const names = [...new Set([...SUPPLIER_DIRECTORY.map((s) => s.name), ...byName.keys()])].sort();

  return (
    <div className="pt-6">
      <PageHeader title="Suppliers" subtitle={`${names.length} corrugated packaging suppliers`} />
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.6fr)] gap-x-4 border-b border-line px-5 py-2.5 text-xs font-semibold tracking-[0.04em] text-muted md:grid">
          <span>SUPPLIER</span><span>NOTES</span><span>SOURCING EVENTS</span>
        </div>
        <ul className="divide-y divide-line">
          {names.map((name) => {
            const dir = SUPPLIER_DIRECTORY.find((s) => s.name === name);
            const events = byName.get(name) ?? [];
            return (
              <li key={name} className="grid gap-x-4 gap-y-1 px-5 py-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.6fr)]">
                <span>
                  <span className="block font-semibold">{name}</span>
                  {dir && <span className="block text-xs text-muted">{dir.email}</span>}
                </span>
                <span className="text-ink-soft">{dir?.note ?? "—"}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {events.map((e) => (
                    <Link key={e.rfx_id} href={`/rfx/${e.rfx_id}/vendors/${e.code}`} className="text-accent hover:underline">{e.rfx?.code}</Link>
                  ))}
                  {!events.length && <span className="text-muted">Not invited yet</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
