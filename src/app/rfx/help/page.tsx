import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Help" };

const STEPS = [
  ["Start an RFx", "From a plant's request (volume sheet and shortlist attached) or from a need in your own words. The RFQ is drafted for you: items, quantities per plant, questionnaire, terms and cover email."],
  ["Lock the rules, then send", "Choose the required certificates and the pass score. They're locked when the RFQ goes out, before any price is seen, and quoted in the award memo."],
  ["Replies are read as they arrive", "Suppliers can reply however they like: Excel, PDF, Word, a phone photo or plain email. Upload any reply on the Replies tab."],
  ["Compare on one basis", "Every price is converted to ₹ per piece, before GST, delivered. Click any price to see the supplier's own words and each conversion step."],
  ["Clear the open items", "The Review tab lists everything that needs a look. Accept it, edit it, or ask the supplier: one email per supplier covers every open point, and their reply updates only the affected prices."],
  ["Ask, decide, award", "Ask what-if questions beside the comparison, save the answer as a scenario, and turn it into an award memo with savings, risks and evidence for every figure."],
];

/** How to use Procure Mind, and how its numbers are produced. */
export default function HelpPage() {
  return (
    <div className="max-w-3xl pt-6">
      <PageHeader title="Help & guides" />
      <Card className="p-6">
        <h2 className="text-[15px] font-semibold">How a sourcing event works</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel font-mono text-[13px] font-medium">{i + 1}</span>
              <span className="text-sm leading-relaxed"><b className="font-semibold">{title}.</b> <span className="text-ink-soft">{text}</span></span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-[15px] font-semibold">How the numbers are produced</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          A language model reads each supplier&apos;s documents and finds the prices, units and terms. Every number it reports must appear in the
          original document. All conversions, totals and savings are then calculated by fixed rules, the same way every time, and every figure
          links back to its source. Anything unclear is flagged for you, never assumed.
        </p>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-[15px] font-semibold">Sample data</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Events marked <span className="rounded border border-[#d8d4c9] px-1.5 text-[11px] text-muted">Sample</span> use a fictional company,
          Sunrise Consumer Goods, and fictional suppliers. On a sample event still out for quote, <b className="font-semibold">Simulate supplier replies</b> brings
          in the replies they would send. To start over, choose <b className="font-semibold">Restore sample workspace</b> in your account menu.
          {" "}Try your own files too: upload any quote on an event&apos;s Replies tab, or <Link href="/rfx/new" className="text-accent hover:underline">start a new RFx</Link>.
        </p>
      </Card>
    </div>
  );
}
