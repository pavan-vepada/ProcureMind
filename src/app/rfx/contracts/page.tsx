import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/data";

export const metadata = { title: "Contracts" };

type ContractRow = { id: string; contract_no: string; vendor_code: string; valid_from: string; valid_to: string; rfx_id: string; rfx: { code: string } | null; contract_lines: { count: number }[] };
const date = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Last year's contracts. Procure Mind uses them for "same as last year" quotes, only where an item's specification is unchanged. */
export default async function ContractsPage() {
  const { supabase } = await requireUser();
  const [{ data: contracts }, { data: vendors }] = await Promise.all([
    supabase.from("contracts").select("id, contract_no, vendor_code, valid_from, valid_to, rfx_id, rfx:rfx(code), contract_lines(count)").order("contract_no"),
    supabase.from("vendors").select("rfx_id, code, name"),
  ]);
  const nameOf = new Map((vendors ?? []).map((v) => [`${v.rfx_id}|${v.code}`, v.name as string]));
  const rows = (contracts ?? []) as unknown as ContractRow[];

  return (
    <div className="pt-6">
      <PageHeader title="Contracts" subtitle="Last year's prices. Used to fill “same as last year” quotes, only where an item's specification hasn't changed." />
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.8fr)] gap-x-4 border-b border-line px-5 py-2.5 text-xs font-semibold tracking-[0.04em] text-muted md:grid">
          <span>CONTRACT</span><span>SUPPLIER</span><span>VALID</span><span className="text-right">ITEMS</span><span>EVENT</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id} className="grid gap-x-4 gap-y-1 px-5 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.8fr)]">
              <span className="font-mono">#{c.contract_no}</span>
              <span>{nameOf.get(`${c.rfx_id}|${c.vendor_code}`) ?? c.vendor_code}</span>
              <span className="text-ink-soft">{date(c.valid_from)} – {date(c.valid_to)}</span>
              <span className="font-mono tabular-nums md:text-right">{c.contract_lines[0]?.count ?? 0}</span>
              <Link href={`/rfx/${c.rfx_id}`} className="font-mono text-accent hover:underline">{c.rfx?.code}</Link>
            </li>
          ))}
          {!rows.length && <li className="px-5 py-10 text-center text-sm text-muted">No contracts on file.</li>}
        </ul>
      </Card>
    </div>
  );
}
