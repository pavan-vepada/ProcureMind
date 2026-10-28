import { NextAction } from "@/components/next-action";
import { getWorkspace } from "@/lib/data";

/** S2: where a new user lands, inside their own copy of the demo RFx. */
export default async function Workspace() {
  const { user, rfx, vendors, rfi } = await getWorkspace();
  const name = user.email?.split("@")[0] ?? "there";
  const cards = [
    { label: "Stage", value: "RFQ, not drafted yet", highlight: true },
    { label: "Vendors", value: `${vendors.length} shortlisted from ${rfi.length} (RFI)` },
    { label: "Line items", value: "30 to be drafted" },
    { label: "Replies", value: `0 of ${vendors.length} · due Day 7` },
  ];

  return (
    <>
      <section className="rounded-xl border border-line p-5">
        <h1 className="text-2xl font-semibold">Welcome, {name}. This is your own copy of the demo RFx.</h1>
        <p className="mt-2 text-muted">
          {rfx.buyer_company} needs new shipper boxes for both plants. Follow the tour on the right, or click the
          highlighted button at the bottom of each screen.
        </p>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.highlight ? "border-accent bg-accent-soft" : "border-line"}`}>
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 font-medium">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-line p-5">
          <h2 className="font-semibold">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Day {rfx.internal_request.day} · Internal request from {rfx.internal_request.from}</li>
            <li>RFI: {rfi.length} vendors asked, {vendors.length} shortlisted</li>
            <li>RFP: {vendors.length} proposals summarised</li>
            <li className="text-muted">Next: read the request, then draft the RFQ with the co-pilot</li>
          </ul>
        </section>
        <section className="rounded-xl border border-line bg-info p-5 text-sm">
          <h2 className="font-semibold">Your demo copy</h2>
          <p className="mt-3">Everything you do here is private to your account and saved as you go.</p>
          <p className="mt-3">↺ Reset demo puts it back to the start so you can replay the story.</p>
        </section>
      </div>

      <NextAction href="/rfx/context/need" label="Read the internal request" />
    </>
  );
}
