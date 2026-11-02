// Applies database/migrations/*.sql in name order, each once, each in its own transaction.
// Usage: npm run db:migrate   (reads SUPABASE_DB_URL from .env.local)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is missing. Add it to .env.local (see .env.example).");
  process.exit(1);
}

// Supabase requires TLS; its certificate chain isn't in Node's default store, so we don't verify it here.
// This script only runs from the developer's machine.
const connectionString = url.replace(/[?&]sslmode=[^&]*/, "");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

const dir = "database/migrations";
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

await client.connect();
try {
  await client.query(
    "create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select name from public.schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`failed ${file}: ${err.message}`);
      process.exit(1);
    }
  }
  console.log("database is up to date");
} finally {
  await client.end();
}
