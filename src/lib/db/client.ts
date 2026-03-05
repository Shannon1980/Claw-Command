import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { connectionString } from "./config";

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
