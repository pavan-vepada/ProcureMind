// Deletes the throwaway accounts created by the integration tests (emails containing "+pmtest-").
// Their demo data goes with them (on delete cascade). Usage: node scripts/cleanup-test-users.mjs
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL.replace(/[?&]sslmode=[^&]*/, ""),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  const { rowCount } = await client.query("delete from auth.users where email like '%+pmtest-%'");
  console.log(`removed ${rowCount} test account(s)`);
} finally {
  await client.end();
}
