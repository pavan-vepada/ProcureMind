// Data access layer: every read of the user's data goes through here, after checking the session.
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dataset, PENDING_REQUESTS } from "@/lib/demo/datasets";
import { money } from "@/lib/format";
import type { MemoContent } from "@/lib/memo";
import type { RfiResponse, Rfx } from "@/lib/types";
import { loadAnalysis } from "@/lib/workspace/analysis";
import { seedWorkspace } from "@/lib/workspace/seed";

/** The signed-in user, verified with Supabase. Redirects to the landing page if signed out. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  return { supabase, user: data.user };
});

/** A new buyer gets a workspace with sample RFx at every stage, created once. */
export async function ensureWorkspace() {
  const { supabase } = await requireUser();
  const ready = async () => {
    const { data } = await supabase.from("workspace_seeds").select("ready_at").maybeSingle();
    return data ? Boolean(data.ready_at) : null; // null = not started
  };
  const state = await ready();
  if (state) return;
  if (state === null && (await seedWorkspace(supabase))) return;
  // Another request is building it; show the workspace only once it is complete.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const s = await ready();
    if (s) return;
    if (s === null) return ensureWorkspace(); // that attempt failed and cleaned up; build it here
  }
}

export type RfxSummary = {
  rfx: Rfx;
  vendors: number;
  replied: number;
  read: number;
  reading: number;
  openIssues: number;
  best: { label: string; vendor: string | null } | null;
  savingVsLastYear: number | null;
  awardedTotal: number | null;
};

/** The buyer's RFx list with live numbers for each. */
export const listWorkspace = cache(async () => {
  await ensureWorkspace();
  const { supabase, user } = await requireUser();
  const { data: rows } = await supabase.from("rfx").select("*").order("updated_at", { ascending: false });
  const rfxs = (rows ?? []) as Rfx[];
  const summaries: RfxSummary[] = await Promise.all(
    rfxs.map(async (rfx) => {
      const a = await loadAnalysis(supabase, rfx);
      const replied = new Set(a.messages.filter((m) => m.direction === "in" && m.vendor_id).map((m) => m.vendor_id)).size;
      const processed = a.comparison.vendors.filter((v) => v.processed);
      const valid = processed.filter((v) => v.valid && v.linesQuoted === a.input.lines.length).sort((x, y) => x.total - y.total);
      let awardedTotal: number | null = null;
      let savingVsLastYear: number | null = a.scenarios.at(-1)?.result.last_year?.savings ?? null;
      if (a.hasMemo) {
        // Once awarded, the memo's numbers are the ones that count.
        const { data: memo } = await supabase.from("award_memos").select("content").eq("rfx_id", rfx.id).limit(1).single();
        const m = memo?.content as Pick<MemoContent, "total" | "savings_vs_last_year"> | undefined;
        awardedTotal = m?.total ?? null;
        savingVsLastYear = m?.savings_vs_last_year?.amount ?? null;
      }
      return {
        rfx,
        vendors: a.vendors.length,
        replied,
        read: processed.length,
        reading: a.runs.filter((r) => r.status === "queued" || r.status === "running").length,
        openIssues: a.issues.filter((i) => i.status === "open").length,
        best: valid[0] ? { label: money(valid[0].total), vendor: valid[0].vendor.name } : null,
        savingVsLastYear,
        awardedTotal,
      };
    }),
  );
  const started = new Set(rfxs.map((r) => r.dataset));
  const pending = PENDING_REQUESTS.filter((k) => !started.has(k)).map((k) => dataset(k)!);
  return { user, summaries, pending };
});

/** A friendly name from the login email ("pavan.v@…" → "Pavan"). There are no profile names yet. */
export function displayName(email: string | undefined): string {
  const first = email?.split("@")[0].split(/[+._-]/)[0] ?? "";
  return first ? first[0].toUpperCase() + first.slice(1) : "Buyer";
}

export type Notice = { id: string; at: string; text: string; detail: string; href: string };

/** What the app frame needs on every page: who is signed in, waiting requests, recent activity. */
export const getShellData = cache(async () => {
  await ensureWorkspace();
  const { supabase, user } = await requireUser();
  const [{ data: started }, { data: runs }] = await Promise.all([
    supabase.from("rfx").select("dataset"),
    supabase.from("processing_runs").select("id, finished_at, rfx_id, vendor:vendors(name), rfx:rfx(code, title), message:messages(kind)")
      .eq("status", "done").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(8),
  ]);
  const startedSets = new Set((started ?? []).map((r) => r.dataset));
  type RunRow = { id: string; finished_at: string; rfx_id: string; vendor: { name: string } | null; rfx: { code: string; title: string } | null; message: { kind: string } | null };
  const notices: Notice[] = ((runs ?? []) as unknown as RunRow[]).map((r) => ({
    id: r.id,
    at: r.finished_at,
    text: r.message?.kind === "clarification_reply" ? `${r.vendor?.name ?? "A supplier"} answered your clarification` : `Quote from ${r.vendor?.name ?? "a supplier"} read`,
    detail: `${r.rfx?.code ?? ""} · ${r.rfx?.title ?? ""}`,
    href: `/rfx/${r.rfx_id}/replies`,
  }));
  return {
    email: user.email ?? "",
    name: displayName(user.email),
    pendingRequests: PENDING_REQUESTS.filter((k) => !startedSets.has(k)).length,
    notices,
  };
});

/** One RFx with its vendors and RFI results. 404 if it isn't the user's. */
export const getRfx = cache(async (id: string) => {
  const { supabase, user } = await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: rfx } = await supabase.from("rfx").select("*").eq("id", id).maybeSingle<Rfx>();
  if (!rfx) notFound();
  const [{ data: vendors }, { data: rfi }] = await Promise.all([
    supabase.from("vendors").select("*").eq("rfx_id", id).order("code"),
    supabase.from("rfi_responses").select("*").eq("rfx_id", id).order("sort"),
  ]);
  return { supabase, user, rfx, vendors: vendors ?? [], rfi: (rfi ?? []) as RfiResponse[] };
});

/** Everything the analysis screens need for one RFx. */
export const getAnalysis = cache(async (id: string) => {
  const r = await getRfx(id);
  const a = await loadAnalysis(r.supabase, r.rfx);
  return { ...r, ...a };
});
