import type { StageKey } from "@/lib/lifecycle";

export type InternalRequest = { from: string; day: number; subject: string; body: string };

export type Rfx = {
  id: string;
  code: string;
  title: string;
  buyer_company: string;
  stage: StageKey;
  tour_step: number;
  tour_hidden: boolean;
  internal_request: InternalRequest;
};

export type VendorStatus = "not_sent" | "sent" | "replied" | "clarification_requested";

export type Vendor = {
  id: string;
  code: string;
  name: string;
  email: string;
  reply_format: "excel" | "pdf" | "word" | "photo" | "email";
  rfi_note: string;
  rfp_summary: string;
  status: VendorStatus;
};

export type RfiResponse = {
  id: string;
  sort: number;
  vendor_name: string;
  iso_9001: boolean;
  fsc: boolean;
  monthly_capacity: string;
  shortlisted: boolean;
  reason: string;
};
