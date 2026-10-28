import { z } from "zod";
import context from "@/seed/context.json";
import { STAGE_KEYS } from "@/lib/lifecycle";

const Vendor = z.object({
  code: z.string().regex(/^V[1-5]$/),
  name: z.string().min(1),
  email: z.email(),
  reply_format: z.enum(["excel", "pdf", "word", "photo", "email"]),
  rfi_note: z.string().min(1),
  rfp_summary: z.string().min(1),
});

const RfiResponse = z.object({
  vendor_name: z.string().min(1),
  iso_9001: z.boolean(),
  fsc: z.boolean(),
  monthly_capacity: z.string().min(1),
  shortlisted: z.boolean(),
  reason: z.string().min(1),
});

export const DemoContext = z
  .object({
    rfx: z.object({
      code: z.string().min(1),
      title: z.string().min(1),
      buyer_company: z.string().min(1),
      stage: z.enum(STAGE_KEYS),
      internal_request: z.object({
        from: z.string().min(1),
        day: z.int(),
        subject: z.string().min(1),
        body: z.string().min(1),
      }),
    }),
    vendors: z.array(Vendor).length(5),
    rfi: z.array(RfiResponse).length(12),
  })
  .refine(
    (c) => new Set(c.vendors.map((v) => v.code)).size === c.vendors.length,
    "vendor codes must be unique",
  )
  .refine((c) => {
    const shortlisted = c.rfi.filter((r) => r.shortlisted).map((r) => r.vendor_name).sort();
    const vendors = c.vendors.map((v) => v.name).sort();
    return JSON.stringify(shortlisted) === JSON.stringify(vendors);
  }, "the RFI shortlist must be exactly the 5 vendors");

/** Arguments for the seed_demo database function, built from the checked demo context. */
export function buildSeedArgs(raw: unknown = context) {
  const c = DemoContext.parse(raw);
  return {
    p_rfx: c.rfx,
    p_vendors: c.vendors,
    p_rfi: c.rfi.map((r, i) => ({ ...r, sort: i + 1 })),
  };
}
