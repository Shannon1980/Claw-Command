/**
 * Database connection string.
 * Supports DATABASE_URL (preferred) or POSTGRES_URL (Vercel/Neon default).
 * Normalizes sslmode to verify-full to avoid pg v9 deprecation warning.
 */
function getConnectionString(): string | undefined {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    return raw;
  }
}

export const connectionString = getConnectionString();
