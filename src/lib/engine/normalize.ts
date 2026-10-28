import { inr } from "@/lib/format";
import type { Assumptions, Line, RawQuote, Step, VendorTerms } from "./types";
import { lineWeight } from "./weight";

export const GST_RATE = 0.18;

const UNIT_LABEL = { piece: "piece", bundle: "box", per_1000: "1,000 pieces", kg: "kg" } as const;

function quoted(raw: RawQuote, price: number) {
  const amount = raw.currency === "USD" ? `$${price.toFixed(3)}` : inr(price);
  return `${amount} per ${UNIT_LABEL[raw.unit]}`;
}

export type Normalized = { value: number; steps: Step[]; estimate: boolean; freightEstimate: boolean };

/**
 * Converts one quoted price to the locked comparison basis (FR-3.6):
 * ₹ per piece, before GST, delivered to the plant, at the tier for `qty` pieces a year.
 * Every step is recorded so the conversion chain can be shown (FR-3.7).
 */
export function normalize(raw: RawQuote, line: Line, qty: number, vendor: VendorTerms, a: Assumptions): Normalized {
  const steps: Step[] = [];
  let p = raw.price;
  let estimate = false;
  let freightEstimate = false;
  steps.push({ label: `Quoted ${quoted(raw, p)}`, value: p });

  const tier = [...raw.tiers].sort((x, y) => y.min_qty - x.min_qty).find((t) => qty >= t.min_qty);
  if (tier) {
    p = tier.price;
    steps.push({ label: `Volume tier for ${qty.toLocaleString("en-IN")} pcs/yr (≥ ${tier.min_qty.toLocaleString("en-IN")}): ${quoted(raw, p)}`, value: p });
  }

  if (raw.unit === "bundle") {
    const n = raw.bundle_size ?? 1;
    p = p / n;
    steps.push({ label: `1 box = ${n} pieces → per piece`, value: p });
  } else if (raw.unit === "per_1000") {
    p = p / 1000;
    steps.push({ label: "Per 1,000 → per piece", value: p });
  } else if (raw.unit === "kg") {
    const w = lineWeight(line, a.weight_overrides);
    p = p * w;
    estimate = true;
    steps.push({ label: `× ${w.toFixed(3)} kg per piece (estimated from GSM × board area)`, value: p, note: "estimate" });
  }

  if (raw.currency === "USD") {
    p = p * a.fx_rate;
    steps.push({ label: `× ₹${a.fx_rate.toFixed(2)} per USD (locked rate)`, value: p });
  }

  if (raw.gst_included) {
    p = p / (1 + GST_RATE);
    steps.push({ label: "18% GST removed", value: p });
  }

  const d = vendor.discount;
  if (d) {
    const mode = a.discount_mode[vendor.code] ?? "not_applied";
    const applies = mode === "all_lines" || (mode === "as_stated" && (d.min_qty === null || qty >= d.min_qty));
    if (applies) {
      p = p * (1 - d.pct / 100);
      steps.push({ label: `${d.pct}% volume discount applied`, value: p, note: "assumption" });
    } else if (mode === "not_applied") {
      steps.push({ label: `${d.pct}% discount not applied (scope unclear)`, value: p, note: "unclear" });
    }
  }

  if (vendor.freight === "extra" || vendor.freight === "unclear") {
    const f = a.freight[vendor.code];
    if (f) {
      p = p + f.per_piece;
      freightEstimate = f.source === "estimate";
      steps.push({
        label: `+ ${inr(f.per_piece)} freight per piece (${f.source === "vendor" ? "stated by vendor" : "buyer estimate"})`,
        value: p,
        note: f.source === "estimate" ? "assumption" : undefined,
      });
    } else {
      steps.push({ label: "Freight extra, amount unknown (not included)", value: p, note: "unclear" });
    }
  }

  steps.push({ label: "Delivered, before GST, per piece", value: p });
  return { value: p, steps, estimate, freightEstimate };
}
