import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { connectionString } from "./config";

/**
 * Shared connection pool for the entire application.
 * Every API route and utility should import `pool` from here
 * instead of creating its own `new Pool(...)`.
 */
export const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
export type Database = NonNullable<typeof db>;
