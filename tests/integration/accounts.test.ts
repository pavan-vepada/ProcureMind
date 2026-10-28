// Runs against the real Supabase project (needs .env.local). Skipped when it isn't configured.
// Creates throwaway accounts and checks the sample workspace and per-account privacy (FR-0.3, FR-0.4).
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Rfx } from "@/lib/types";
import { loadAnalysis } from "@/lib/workspace/analysis";
import { seedWorkspace } from "@/lib/workspace/seed";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_EMAIL;

async function newAccount() {
  const client = createClient(url!, key!, { auth: { persistSession: false } });
  const [name, domain] = testEmail!.split("@");
  const { data, error } = await client.auth.signUp({ email: `${name}+pmtest-${randomUUID().slice(0, 8)}@${domain}`, password: randomUUID() });
  if (error) throw error;
  if (!data.session) throw new Error("No session after sign-up: switch off email confirmation in Supabase.");
  return client;
}

describe.skipIf(!url || !key || !testEmail)("sample workspace and privacy (Supabase)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([newAccount(), newAccount()]);
    expect(await seedWorkspace(alice)).toBe(true);
  }, 120_000);

  afterAll(() => {
    if (process.env.SUPABASE_DB_URL) execFileSync("node", ["scripts/cleanup-test-users.mjs"], { stdio: "inherit" });
  });

  it("creates 4 sample RFx at different stages", async () => {
    const { data } = await alice.from("rfx").select("code, stage, drafted_at, sent_at");
    expect(data).toHaveLength(4);
    expect(new Set(data!.map((r) => r.stage))).toEqual(new Set(["analysis", "replies", "rfq", "po"]));
  });

  it("doesn't create the workspace twice", async () => {
    expect(await seedWorkspace(alice)).toBe(false);
    expect((await alice.from("rfx").select("id")).data).toHaveLength(4);
  });

  it("has the analysis RFx fully read: 5 vendors, prices, flags, a saved scenario", async () => {
    const { data: rfx } = await alice.from("rfx").select("*").eq("stage", "analysis").single<Rfx>();
    const a = await loadAnalysis(alice, rfx!);
    expect(a.comparison.vendors.filter((v) => v.processed)).toHaveLength(5);
    expect(a.comparison.vendors.find((v) => v.vendor.code === "V3")!.linesQuoted).toBe(27);
    expect(a.comparison.vendors.filter((v) => v.valid).map((v) => v.vendor.code)).toEqual(["V1", "V2", "V5"]);
    expect(a.issues.filter((i) => i.status === "open").length).toBeGreaterThan(5);
    expect(a.scenarios).toHaveLength(1);
  });

  it("leaves one reply in the replies-stage RFx waiting to be read live", async () => {
    const { data: rfx } = await alice.from("rfx").select("id").eq("stage", "replies").single();
    const { data: runs } = await alice.from("processing_runs").select("status").eq("rfx_id", rfx!.id);
    expect(runs!.filter((r) => r.status === "queued")).toHaveLength(1);
    expect(runs!.filter((r) => r.status === "done")).toHaveLength(2);
  });

  it("has an award memo on the awarded RFx", async () => {
    const { data: rfx } = await alice.from("rfx").select("id").eq("stage", "po").single();
    expect((await alice.from("award_memos").select("id").eq("rfx_id", rfx!.id)).data).toHaveLength(1);
  });

  it("never shows one account's rows to another, or to signed-out visitors", async () => {
    expect((await bob.from("rfx").select("id")).data).toEqual([]);
    expect((await bob.from("quote_values").select("id")).data).toEqual([]);
    const anon = createClient(url!, key!, { auth: { persistSession: false } });
    expect((await anon.from("rfx").select("id")).data ?? []).toEqual([]);
  });

  it("doesn't let one account change another's rows", async () => {
    const { data: rfx } = await alice.from("rfx").select("id, title").limit(1).single();
    await bob.from("rfx").update({ title: "hijacked" }).eq("id", rfx!.id);
    expect((await alice.from("rfx").select("title").eq("id", rfx!.id).single()).data!.title).toBe(rfx!.title);
  });
});
