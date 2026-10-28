// Number check (architecture A3 step 6): every figure in AI-written prose must exist in the computed result.

const TOKEN = /(₹|\$)?\s?(\d[\d,]*(?:\.\d+)?)\s*(cr\b|crore|lakh|l\b|%)?/gi;

export function numbersInText(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const n = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const unit = (m[3] ?? "").toLowerCase();
    out.push(unit === "cr" || unit === "crore" ? n * 1e7 : unit === "l" || unit === "lakh" ? n * 1e5 : n);
  }
  return out;
}

/** True if every number in `text` matches an allowed value (money within rounding, small integers exactly). */
export function numbersAreGrounded(text: string, allowed: number[]): { ok: boolean; unknown: number[] } {
  const unknown = numbersInText(text).filter((v) => {
    if (Number.isInteger(v) && v <= 31) return !allowed.some((a) => a === v);
    return !allowed.some((a) => Math.abs(v - a) <= Math.max(Math.abs(a) * 0.006, 0.005));
  });
  return { ok: unknown.length === 0, unknown };
}
