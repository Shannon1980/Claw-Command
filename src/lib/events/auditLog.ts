import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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

  try {
    await pool.query(
      `INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        params.userId || null,
        params.action,
        params.resourceType,
        params.resourceId,
        JSON.stringify(params.details || {}),
        params.ipAddress || null,
        now,
      ]
    );
  } catch (error) {
    console.error("[Audit Log] Failed to log event:", error);
  }
}
