/**
 * Email worker: fetch emails, AI classify, execute actions.
 * Called by cron or manual trigger via /api/email/worker/run
 */

import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import {
  listMessages,
  archiveMessage,
  trashMessage,
  moveMessage,
  type GmailMessage,
} from "./gmail";
import { classifyEmail } from "./ai";
import { refreshAndPersistTokens } from "./token-refresh";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

function generateId(): string {
  return `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function runEmailWorker(): Promise<{
  processed: number;
  actions: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let actions = 0;

  const accountsRes = await pool.query(
    `SELECT id, provider, email, access_token, refresh_token FROM email_accounts WHERE provider = 'gmail'`
  );

  for (const acc of accountsRes.rows) {
    let accessToken = acc.access_token;
    if (!accessToken) {
      errors.push(`Account ${acc.email}: no access token`);
      continue;
    }

    // Refresh token if we have refresh_token (tokens expire ~1hr)
    if (acc.refresh_token) {
      try {
        const refreshed = await refreshAndPersistTokens(
          acc.id,
          accessToken,
          acc.refresh_token
        );
        accessToken = refreshed.accessToken;
      } catch (refreshErr) {
        errors.push(`Account ${acc.email}: token refresh failed: ${refreshErr}`);
        continue;
      }
    }

    const rulesRes = await pool.query(
      `SELECT id, name, actions, ai_prompt FROM email_rules WHERE account_id = $1 AND enabled = true`,
      [acc.id]
    );

    if (rulesRes.rows.length === 0) {
      continue;
    }

    try {
      const messages = await listMessages(
        { accessToken, refreshToken: acc.refresh_token },
        { maxResults: 10, labelIds: ["INBOX"] }
      );

      for (const msg of messages) {
        processed++;
        const rules = rulesRes.rows.map((r) => ({
          aiPrompt: r.ai_prompt,
          actions: typeof r.actions === "string" ? JSON.parse(r.actions || "[]") : r.actions ?? [],
        }));

        const classified = await classifyEmail(msg, rules);

        if (classified.action === "none") continue;

        const actionId = generateId();
        try {
          await executeAction(
            { accessToken, refreshToken: acc.refresh_token },
            acc.id,
            rulesRes.rows[0]?.id ?? null,
            msg,
            classified,
            actionId
          );
          actions++;
        } catch (actErr) {
          errors.push(`Action ${actionId}: ${String(actErr)}`);
          await pool.query(
            `INSERT INTO email_actions (id, account_id, rule_id, message_id, thread_id, action, status, details, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7, $8)`,
            [
              actionId,
              acc.id,
              rulesRes.rows[0]?.id ?? null,
              msg.id,
              msg.threadId,
              classified.action,
              JSON.stringify({ error: String(actErr), reason: classified.reason }),
              new Date().toISOString(),
            ]
          );
        }
      }
    } catch (err) {
      errors.push(`Account ${acc.email}: ${String(err)}`);
    }
  }

  return { processed, actions, errors };
}

async function executeAction(
  config: { accessToken: string; refreshToken?: string },
  accountId: string,
  ruleId: string | null,
  msg: GmailMessage,
  classified: { action: string; targetFolder?: string },
  actionId: string
): Promise<void> {
  const now = new Date().toISOString();

  switch (classified.action) {
    case "archive":
      await archiveMessage(config, msg.id);
      break;
    case "trash":
    case "delete":
      await trashMessage(config, msg.id);
      break;
    case "move":
      if (classified.targetFolder) {
        await moveMessage(config, msg.id, [classified.targetFolder], ["INBOX"]);
      } else {
        await archiveMessage(config, msg.id);
      }
      break;
    default:
      return; // draft_reply / none - skip for now
  }

  await pool.query(
    `INSERT INTO email_actions (id, account_id, rule_id, message_id, thread_id, action, status, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8)`,
    [
      actionId,
      accountId,
      ruleId,
      msg.id,
      msg.threadId,
      classified.action,
      JSON.stringify({ targetFolder: classified.targetFolder }),
      now,
    ]
  );
}
