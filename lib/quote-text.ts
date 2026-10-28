import type { RawQuote } from "@/lib/engine/types";
import { inr } from "@/lib/format";

/** A price as the vendor wrote it, e.g. "₹1,850 per box of 100" or "$0.512 per piece". */
export function asQuoted(raw: RawQuote): string {
  const amount = raw.currency === "USD" ? `$${raw.price.toFixed(3)}` : raw.price >= 1000 ? `₹${raw.price.toLocaleString("en-IN")}` : inr(raw.price);
  const unit = raw.unit === "bundle" ? `per box of ${raw.bundle_size ?? "?"}` : raw.unit === "per_1000" ? "per 1,000" : raw.unit === "kg" ? "per kg" : "per piece";
  return `${amount} ${unit}${raw.gst_included ? " incl. GST" : ""}`;
}
