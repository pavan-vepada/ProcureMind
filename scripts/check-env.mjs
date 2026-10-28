// Checks that .env.local values have the right shape, without printing any of them.
// Usage: node scripts/check-env.mjs
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const env = process.env;

const checks = [
  ["NEXT_PUBLIC_SUPABASE_URL", (v) => /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(v), "should look like https://<project>.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", (v) => /^(eyJ|sb_publishable_)/.test(v), "should start with eyJ… (anon) or sb_publishable_…"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", (v) => !v.startsWith("sb_secret_") && !isServiceRole(v), "this is the SECRET key; use the anon / publishable one"],
  ["SUPABASE_DB_URL", (v) => /^postgres(ql)?:\/\//.test(v), "should start with postgresql://"],
  ["SUPABASE_DB_URL", (v) => !v.includes("[YOUR-PASSWORD]") && !v.includes("[") , "still contains the [YOUR-PASSWORD] placeholder"],
  ["SUPABASE_DB_URL", (v) => v.includes("pooler.supabase.com"), "should be the Session pooler string (host ends in pooler.supabase.com)"],
  ["SUPABASE_DB_URL", (v) => /:5432\//.test(v), "Session pooler uses port 5432 (6543 is the Transaction pooler)"],
];

function isServiceRole(v) {
  try {
    return JSON.parse(Buffer.from(v.split(".")[1], "base64url").toString()).role === "service_role";
  } catch {
    return false;
  }
}

let ok = true;
for (const [name, test, hint] of checks) {
  const value = (env[name] ?? "").trim();
  if (!value) {
    console.log(`✕ ${name}: empty`);
    ok = false;
  } else if (!test(value)) {
    console.log(`✕ ${name}: ${hint}`);
    ok = false;
  }
}
for (const name of ["OPENAI_API_KEY", "AI_MODEL"]) {
  console.log(`${env[name]?.trim() ? "✓" : "·"} ${name}: ${env[name]?.trim() ? "set" : "empty (fine for now)"}`);
}
console.log(ok ? "✓ Supabase settings look right" : "Fix the items marked ✕ in .env.local");
process.exit(ok ? 0 : 1);
