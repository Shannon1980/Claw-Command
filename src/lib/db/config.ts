/**
 * Database connection string.
 * Supports DATABASE_URL (preferred) or POSTGRES_URL (Vercel/Neon default).
 */
export const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;
