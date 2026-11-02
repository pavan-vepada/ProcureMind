const inrFmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹1,234.50 (Indian digit grouping). */
export const inr = (n: number) => `₹${inrFmt.format(n)}`;

export const qty = (n: number) => intFmt.format(n);

/** ₹1.24 Cr / ₹8.0 L / ₹45,000 for large totals. */
export function money(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  return `${sign}₹${intFmt.format(abs)}`;
}

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export const dayLabel = (d: number) => `Day ${d}`;
