/**
 * AI classification for email actions.
 * Uses OpenAI API if OPENAI_API_KEY is set, otherwise returns a default.
 */

import type { GmailMessage } from "./gmail";

export type EmailActionType = "move" | "delete" | "archive" | "draft_reply" | "none";

export interface ClassifiedAction {
  action: EmailActionType;
  targetFolder?: string;
  reason?: string;
}

export async function classifyEmail(
  message: GmailMessage,
  rules: { aiPrompt?: string | null; actions: unknown[] }[]
): Promise<ClassifiedAction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No AI: use first rule's first action as default, or skip
    const firstRule = rules.find((r) => r.actions && Array.isArray(r.actions) && (r.actions as unknown[]).length > 0);
    const firstAction = firstRule?.actions?.[0] as { action?: string; targetFolder?: string } | undefined;
    return {
      action: (firstAction?.action as EmailActionType) ?? "none",
      targetFolder: firstAction?.targetFolder,
      reason: "No OPENAI_API_KEY; using rule default",
    };
  }

  const systemPrompt = `You classify emails to suggest actions. Respond with JSON only: { "action": "move"|"delete"|"archive"|"draft_reply"|"none", "targetFolder": "optional label/folder name", "reason": "brief explanation" }.
Rules/context from user: ${rules.map((r) => r.aiPrompt || "General triage").join("; ")}`;

  const userPrompt = `Subject: ${message.subject}
From: ${message.from}
Snippet: ${message.snippet}

What action should we take?`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content) as ClassifiedAction;
    return {
      action: parsed.action ?? "none",
      targetFolder: parsed.targetFolder,
      reason: parsed.reason,
    };
  } catch (err) {
    console.error("[Email AI] Classify error:", err);
    return { action: "none", reason: String(err) };
  }
}
