// Runs against the real Supabase project (needs .env.local). Skipped when it isn't configured.
// Creates two throwaway accounts and checks FR-0.3 (each user sees only their data),
// FR-0.4 (demo copy on first use) and FR-0.5 (reset restores the start).
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSeedArgs } from "@/lib/demo/seed";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function newAccount() {
  const client = createClient(url!, key!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `test-${randomUUID()}@procuremind-tests.dev`,
    password: randomUUID(),
  });
  if (error) throw error;
  if (!data.session) throw new Error("No session after sign-up: switch off email confirmation in Supabase.");
  return client;
}

describe.skipIf(!url || !key)("accounts and demo copies (Supabase)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([newAccount(), newAccount()]);
    for (const client of [alice, bob]) {
      const { error } = await client.rpc("seed_demo", buildSeedArgs());
      if (error) throw error;
    }
  });

  it("gives each new account its own demo RFx with 5 vendors and 12 RFI results", async () => {
    const rfx = await alice.from("rfx").select("id, stage, tour_step");
    expect(rfx.data).toHaveLength(1);
    expect(rfx.data![0]).toMatchObject({ stage: "rfq", tour_step: 0 });
    expect((await alice.from("vendors").select("id")).data).toHaveLength(5);
    expect((await alice.from("rfi_responses").select("id")).data).toHaveLength(12);
  });

  it("never shows one account's rows to another", async () => {
    const aliceRfx = (await alice.from("rfx").select("id").single()).data!;
    const bobRfx = (await bob.from("rfx").select("id").single()).data!;
    expect(aliceRfx.id).not.toBe(bobRfx.id);

    const peek = await bob.from("vendors").select("id").eq("rfx_id", aliceRfx.id);
    expect(peek.data).toEqual([]);
  });

  it("doesn't let one account change another's rows", async () => {
    const aliceRfx = (await alice.from("rfx").select("id").single()).data!;
    await bob.from("rfx").update({ tour_step: 7 }).eq("id", aliceRfx.id);
    const after = (await alice.from("rfx").select("tour_step").single()).data!;
    expect(after.tour_step).toBe(0);
  });

  it("refuses the demo copy to signed-out visitors", async () => {
    const anon = createClient(url!, key!, { auth: { persistSession: false } });
    expect((await anon.from("rfx").select("id")).data ?? []).toEqual([]);
    expect((await anon.rpc("seed_demo", buildSeedArgs())).error).not.toBeNull();
  });

  it("resets to the start: progress cleared, still exactly one RFx", async () => {
    await alice.from("rfx").update({ tour_step: 4, stage: "analysis" }).not("id", "is", null);
    const { error } = await alice.rpc("seed_demo", buildSeedArgs());
    expect(error).toBeNull();
    const rfx = await alice.from("rfx").select("stage, tour_step");
    expect(rfx.data).toEqual([{ stage: "rfq", tour_step: 0 }]);
  });
});
