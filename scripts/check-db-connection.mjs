#!/usr/bin/env node
/**
 * Verify database connection. Run locally to confirm DATABASE_URL works.
 * Usage: npm run db:check
 * Or: node scripts/check-db-connection.mjs (loads .env.local via dotenv-cli)
 */
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function check() {
  if (!url) {
    console.error("❌ No DATABASE_URL or POSTGRES_URL in .env.local");
    process.exit(1);
  }

  // Normalize sslmode to verify-full (silences pg deprecation warning)
  let connectionString = url;
  try {
    const u = new URL(url);
    u.searchParams.set("sslmode", "verify-full");
    connectionString = u.toString();
  } catch {
    /* keep original */
  }

  const masked = connectionString.replace(/:[^:@]+@/, ":****@");
  console.log("Checking connection to:", masked);

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 as ok");
    console.log("✅ Connected successfully. DB responded:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    if (err.code === "EAI_AGAIN") {
      console.error("   (DNS resolution failed — check network or try again)");
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

check();
