import type { Rfx } from "@/lib/types";

/** The one highlighted next action for wherever the story is (principle 2). */
export function nextStep(rfx: Rfx, s: { replies: number; memo: boolean }): { href: string; label: string } {
  if (!rfx.drafted_at) return rfx.tour_step === 0 ? { href: "/rfx/context/need", label: "Read the internal request" } : { href: "/rfx/rfq", label: "Draft RFQ with co-pilot" };
  if (!rfx.sent_at) return { href: "/rfx/rfq", label: "Review the rules and send" };
  if (!s.replies) return { href: "/rfx/send", label: "Fast-forward 9 days" };
  if (s.memo) return { href: "/rfx/award", label: "Open the award memo" };
  return { href: "/rfx/compare", label: "Open the comparison" };
}
