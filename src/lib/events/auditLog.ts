import { pool } from "@/lib/db/client";

let schemaReady = false;

async function ensureAuditLogSchema() {
  if (schemaReady || !pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  schemaReady = true;
}

export async function logAuditEvent(params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  if (!pool) return;

  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const payload = [
    id,
    params.userId || null,
    params.action,
    params.resourceType,
    params.resourceId,
    JSON.stringify(params.details || {}),
    params.ipAddress || null,
    now,
  ];

  try {
    await ensureAuditLogSchema();

    await Promise.all([
      pool.query(
        `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        payload
      ),
      pool.query(
        `INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        payload
      ),
    ]);
  } catch (error) {
    console.error("[Audit Log] Failed to log event:", error);
  }
}
