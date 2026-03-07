import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: webhookId } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const whResult = await pool.query(`SELECT * FROM webhooks WHERE id = $1`, [webhookId]);
    if (whResult.rows.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const webhook = whResult.rows[0];
    const payload = JSON.stringify({
      event: "test",
      webhook_id: webhookId,
      timestamp: new Date().toISOString(),
      message: "This is a test delivery",
    });

    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(payload)
      .digest("hex");

    let status = 0;
    let responseBody = "";

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature-256": `sha256=${signature}`,
        },
        body: payload,
      });
      status = response.status;
      responseBody = await response.text();
    } catch (fetchErr) {
      responseBody = String(fetchErr);
    }

    // Record delivery
    const deliveryId = `del-${Date.now()}`;
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, response_code, response_body, created_at)
       VALUES ($1, $2, 'test', $3, $4, $5, $6)`,
      [deliveryId, webhookId, payload, status, responseBody, now]
    );

    return NextResponse.json({ ok: status >= 200 && status < 300, status, body: responseBody });
  } catch (error) {
    console.error("[Webhook Test API] error:", error);
    return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 });
  }
}
