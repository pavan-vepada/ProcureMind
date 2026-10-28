import Link from "next/link";
import { notFound } from "next/navigation";
import { NextAction } from "@/components/next-action";
import { CompleteTourStep } from "@/components/shell/complete-tour-step";
import { getWorkspace } from "@/lib/data";

const VIEWS = ["need", "rfi", "rfp"] as const;
type View = (typeof VIEWS)[number];

/** S3: seeded context (FR-1.2). Need, RFI and RFP share one layout; the strip is the navigation. */
export default async function Context(props: PageProps<"/rfx/context/[view]">) {
  const { view } = await props.params;
  if (!VIEWS.includes(view as View)) notFound();
  const { rfx, vendors, rfi } = await getWorkspace();

  if (view === "need") {
    const req = rfx.internal_request;
    return (
      <>
        <CompleteTourStep step={1} />
        <h1 className="text-xl font-semibold">Internal request</h1>
        <article className="mt-4 max-w-3xl rounded-xl border border-line">
          <header className="border-b border-line bg-panel px-5 py-3 text-sm">
            <p>
              <span className="text-muted">From:</span> {req.from} · Day {req.day}
            </p>
            <p className="mt-1 font-medium">{req.subject}</p>
          </header>
          <p className="whitespace-pre-line px-5 py-4 leading-relaxed">{req.body}</p>
        </article>
        <NextAction href="/rfx/context/rfi" label="See the RFI results" />
      </>
    );
  }

  if (view === "rfi") {
    const shortlisted = rfi.filter((r) => r.shortlisted).length;
    return (
      <>
        <h1 className="text-xl font-semibold">
          RFI results · {rfi.length} vendors asked, {shortlisted} shortlisted
        </h1>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel text-left text-muted">
              <tr>
                {["Vendor", "ISO 9001", "FSC", "Capacity / month", "Shortlisted", "Why"].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfi.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2">{r.vendor_name}</td>
                  <td className="px-4 py-2">{r.iso_9001 ? "✓" : "✕"}</td>
                  <td className="px-4 py-2">{r.fsc ? "✓" : "✕"}</td>
                  <td className="px-4 py-2">{r.monthly_capacity}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-md px-2 py-0.5 ${r.shortlisted ? "bg-ok" : "text-muted"}`}>
                      {r.shortlisted ? "✓ Yes" : "✕ No"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <NextAction href="/rfx/context/rfp" label="See the RFP summaries" />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold">RFP summaries · {vendors.length} shortlisted vendors</h1>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {vendors.map((v) => (
          <article key={v.id} className="rounded-xl border border-line p-5">
            <p className="text-sm text-muted">{v.code}</p>
            <h2 className="font-semibold">{v.name}</h2>
            <p className="mt-1 text-sm text-muted">{v.rfi_note}</p>
            <p className="mt-3 text-sm leading-relaxed">{v.rfp_summary}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Back to the <Link href="/rfx" className="text-accent hover:underline">RFx overview</Link>.
      </p>
      <NextAction href="/rfx/rfq" label={rfx.drafted_at ? "Open the RFQ" : "Draft RFQ with co-pilot"} />
    </>
  );
}
