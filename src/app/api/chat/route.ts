import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { addMessage } from "@/lib/chat/store";
import { eventBus } from "@/lib/events/eventBus";
import { isGatewayOnline, chatCompletion } from "@/lib/openclaw/client";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, sender TEXT NOT NULL,
      content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  schemaReady = true;
}

/** Fetch agent info for building a system prompt */
async function getAgentInfo(agentId: string) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      `SELECT a.name, a.emoji, a.domain, a.capabilities, a.soul,
              t.title as current_task_title, t.status as current_task_status
       FROM agents a
       LEFT JOIN tasks t ON a.current_task_id = t.id
       WHERE a.id = $1`,
      [agentId]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

/** Fetch recent chat history for context */
async function getRecentHistory(agentId: string, limit = 10) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      `SELECT sender, content FROM chat_messages
       WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [agentId, limit]
    );
    return result.rows.reverse();
  } catch {
    return [];
  }
}

/** Try to get AI response via OpenClaw with real-time streaming via eventBus */
async function getAIReplyStreaming(
  agentId: string,
  replyId: string,
  agentInfo: Record<string, unknown>,
  history: { sender: string; content: string }[],
  userMessage: string
): Promise<string | null> {
  try {
    const online = await isGatewayOnline();
    if (!online) return null;

    const systemPrompt = buildSystemPrompt(agentInfo);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history) {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
    messages.push({ role: "user", content: userMessage });

    const stream = await chatCompletion({
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      reply += chunk;

      // Emit each token chunk via eventBus for real-time streaming
      eventBus.emit("chat_message", {
        event: "chat_stream",
        agentId,
        messageId: replyId,
        chunk,
        content: reply,
      });
    }

    return reply.trim() || null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(agentInfo: Record<string, unknown>): string {
  const name = agentInfo.name || "Agent";
  const domain = agentInfo.domain || "general";
  const capabilities = agentInfo.capabilities || "";
  const soul = agentInfo.soul || "";
  const task = agentInfo.current_task_title;

  let prompt = `You are ${name}, an autonomous AI agent working in the ${domain} domain for Shannon's organization (Vorentoe LLC).`;
  if (capabilities) prompt += ` Your capabilities: ${capabilities}.`;
  if (soul) prompt += ` ${soul}`;
  if (task) prompt += ` You are currently working on: "${task}" (status: ${agentInfo.current_task_status}).`;
  prompt += ` Be helpful, concise, and proactive. If asked about task progress, give specific updates. Keep responses under 3 sentences unless more detail is needed.`;
  return prompt;
}

/** Generate a contextual fallback reply when AI is unavailable */
function generateFallbackReply(
  agentInfo: Record<string, unknown> | null,
  userMessage: string
): string {
  const name = agentInfo?.name || "Agent";
  const task = agentInfo?.current_task_title as string | undefined;
  const msg = userMessage.toLowerCase();

  if (msg.includes("status") || msg.includes("update") || msg.includes("progress")) {
    if (task) {
      return `I'm currently working on "${task}". Making steady progress. I'll flag you if I hit any blockers or need your input.`;
    }
    return `No active task assigned right now. Let me know if there's something you'd like me to pick up.`;
  }

  if (msg.includes("help") || msg.includes("can you") || msg.includes("please")) {
    return `Understood. I'll look into that and get back to you shortly.`;
  }

  if (msg.includes("approve") || msg.includes("review")) {
    return `Noted. I'll prepare the deliverable for your review and move it to the review queue.`;
  }

  if (msg.includes("block") || msg.includes("issue") || msg.includes("problem")) {
    return `I'll investigate and report back with findings. If I need your approval to proceed, I'll flag the task.`;
  }

  if (task) {
    return `Got it. I'm on it — currently focused on "${task}". I'll update you when there's progress to share.`;
  }

  return `Message received. I'll take action on this and keep you posted, ${name === "Agent" ? "Shannon" : "Shannon"}.`;
}

export async function POST(request: Request) {
  try {
    const { agentId, content } = await request.json();

    if (!agentId || !content) {
      return NextResponse.json(
        { error: "agentId and content are required" },
        { status: 400 }
      );
    }

    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    // Save user message
    if (pool) {
      try {
        await ensureSchema();
        await pool.query(
          `INSERT INTO chat_messages (id, agent_id, sender, content, status, created_at, updated_at)
           VALUES ($1, $2, 'user', $3, 'sent', $4, $4)`,
          [userMessageId, agentId, content, now]
        );
      } catch (dbError) {
        console.error("[Chat] DB insert failed:", dbError);
        addMessage({ agentId, sender: "user", content });
      }
    } else {
      addMessage({ agentId, sender: "user", content });
    }

    // Emit user message event so SSE clients see it instantly
    eventBus.emit("chat_message", {
      event: "new_message",
      agentId,
      message: {
        id: userMessageId,
        agentId,
        sender: "user",
        content,
        timestamp: now,
        status: "sent",
      },
    });

    // Generate agent reply (async, non-blocking for the response)
    generateAndSaveReply(agentId, content).catch((err) =>
      console.error("[Chat] Reply generation failed:", err)
    );

    return NextResponse.json({
      success: true,
      messageId: userMessageId,
      timestamp: now,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function generateAndSaveReply(agentId: string, userMessage: string) {
  const replyId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Emit typing indicator
  eventBus.emit("chat_message", {
    event: "typing_start",
    agentId,
    messageId: replyId,
  });

  const agentInfo = await getAgentInfo(agentId);
  const history = await getRecentHistory(agentId);

  // Try AI-powered streaming reply first, fall back to contextual template
  let reply = await getAIReplyStreaming(agentId, replyId, agentInfo || {}, history, userMessage);
  if (!reply) {
    reply = generateFallbackReply(agentInfo, userMessage);
  }

  const now = new Date().toISOString();

  if (pool) {
    try {
      await ensureSchema();
      await pool.query(
        `INSERT INTO chat_messages (id, agent_id, sender, content, status, created_at, updated_at)
         VALUES ($1, $2, 'agent', $3, 'sent', $4, $4)`,
        [replyId, agentId, reply, now]
      );
    } catch (dbError) {
      console.error("[Chat] Reply DB insert failed:", dbError);
      addMessage({ agentId, sender: "agent", content: reply });
    }
  } else {
    addMessage({ agentId, sender: "agent", content: reply });
  }

  // Emit the completed message so SSE clients get it instantly
  eventBus.emit("chat_message", {
    event: "new_message",
    agentId,
    message: {
      id: replyId,
      agentId,
      sender: "agent",
      content: reply,
      timestamp: now,
      status: "sent",
    },
  });

  // Emit typing end
  eventBus.emit("chat_message", {
    event: "typing_end",
    agentId,
  });
}
