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

/** Generate a dynamic, natural-sounding reply when AI is unavailable.
 *  Avoids repetitive canned responses by using varied templates,
 *  incorporating context (agent name, task, conversation history),
 *  and randomizing phrasing.
 */
function generateDynamicReply(
  agentInfo: Record<string, unknown> | null,
  userMessage: string,
  history: { sender: string; content: string }[]
): string {
  const name = (agentInfo?.name as string) || "Agent";
  const task = agentInfo?.current_task_title as string | undefined;
  const taskStatus = agentInfo?.current_task_status as string | undefined;
  const domain = (agentInfo?.domain as string) || "";
  const msg = userMessage.toLowerCase().trim();

  // Helper to pick a random item from an array
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Estimate conversation depth from history to vary tone
  const isDeepConvo = history.length > 4;
  const recentAgentMsgs = history.filter(h => h.sender !== "user").map(h => h.content);

  // Avoid repeating the exact same opener we used recently
  const avoidPhrase = (phrases: string[]): string[] => {
    if (recentAgentMsgs.length === 0) return phrases;
    const lastReply = recentAgentMsgs[recentAgentMsgs.length - 1]?.toLowerCase() || "";
    return phrases.filter(p => !lastReply.startsWith(p.toLowerCase().slice(0, 20)));
  };

  // --- Greetings ---
  if (/^(hey|hi|hello|yo|sup|what'?s up|howdy|good morning|good evening|good afternoon)/i.test(msg)) {
    const greetings = avoidPhrase([
      `Hey Shannon! What can I help you with?`,
      `Hi! I'm here and ready. What do you need?`,
      `Hey! What's on your mind?`,
      task ? `Hi Shannon. I'm currently on "${task}" - what's up?` : `Hey! All clear on my end. What do you need?`,
      isDeepConvo ? `Still here! What's next?` : `Hello! How can I help?`,
    ]);
    return pick(greetings.length > 0 ? greetings : [`Hey! What's up?`]);
  }

  // --- Status / Progress queries ---
  if (/status|update|progress|how('?s| is) (it|the|things)|where are (you|we)|sitrep/i.test(msg)) {
    if (task) {
      const statusReplies = avoidPhrase([
        `Working on "${task}" - ${taskStatus === "in_progress" ? "making good progress" : `current status: ${taskStatus}`}. I'll ping you if I hit anything.`,
        `"${task}" is ${taskStatus === "in_progress" ? "underway" : taskStatus}. No blockers so far. I'll keep you posted.`,
        `Still on "${task}". ${taskStatus === "in_progress" ? "Things are moving" : `It's ${taskStatus}`}. Need me to prioritize anything else?`,
        `Quick update on "${task}": ${taskStatus === "in_progress" ? "progressing steadily" : taskStatus}. Nothing blocking right now.`,
      ]);
      return pick(statusReplies.length > 0 ? statusReplies : [`Working on "${task}" - ${taskStatus}. Will update you soon.`]);
    }
    const noTaskReplies = avoidPhrase([
      `No active tasks at the moment. Want me to pick something up?`,
      `All clear right now - nothing assigned. What should I work on?`,
      `I'm available. No tasks in my queue currently. What do you need?`,
    ]);
    return pick(noTaskReplies.length > 0 ? noTaskReplies : [`No active tasks right now. What should I focus on?`]);
  }

  // --- Help / Request ---
  if (/help|can you|could you|please|would you|need you to|i need|take care of|handle|look into/i.test(msg)) {
    const helpReplies = avoidPhrase([
      `On it. I'll get back to you once I have something.`,
      `Sure, let me look into that and circle back.`,
      `Got it. I'll work on this and update you shortly.`,
      `Understood. I'll handle it and let you know what I find.`,
      `No problem. Give me a bit to work through this.`,
    ]);
    return pick(helpReplies.length > 0 ? helpReplies : [`On it - I'll follow up soon.`]);
  }

  // --- Approval / Review ---
  if (/approve|review|sign.?off|lgtm|check (this|my|the)|take a look/i.test(msg)) {
    const reviewReplies = avoidPhrase([
      `Got it. I'll prepare everything for your review.`,
      `Noted. Let me get that ready and move it to the review queue.`,
      `On it - I'll have the deliverable ready for you to check shortly.`,
      `Will do. I'll flag you once it's ready for sign-off.`,
    ]);
    return pick(reviewReplies.length > 0 ? reviewReplies : [`I'll prepare it for review.`]);
  }

  // --- Blockers / Issues ---
  if (/block|issue|problem|stuck|error|broken|fail|bug|crash|not working|down/i.test(msg)) {
    const blockerReplies = avoidPhrase([
      `Let me dig into that. I'll report back with what I find.`,
      `I'll investigate and let you know. If I need approval to proceed, I'll flag it.`,
      `Looking into it now. Will update you once I understand the scope.`,
      `On it. I'll trace through the issue and get back to you with findings.`,
    ]);
    return pick(blockerReplies.length > 0 ? blockerReplies : [`I'll look into that and report back.`]);
  }

  // --- Thanks / Acknowledgement ---
  if (/thanks|thank you|thx|appreciate|good job|nice|well done|great work/i.test(msg)) {
    const thanksReplies = avoidPhrase([
      `Anytime! Let me know if you need anything else.`,
      `Happy to help. I'm here if anything else comes up.`,
      `No problem at all. Just ping me when you need me.`,
    ]);
    return pick(thanksReplies.length > 0 ? thanksReplies : [`Anytime! Just let me know.`]);
  }

  // --- Yes / Confirmation ---
  if (/^(yes|yeah|yep|yup|sure|ok|okay|go ahead|proceed|do it|confirmed|correct|right|affirmative)\.?!?$/i.test(msg)) {
    const confirmReplies = avoidPhrase([
      `Got it. Moving forward with that.`,
      `Alright, proceeding now.`,
      `Confirmed. I'll take it from here.`,
      task ? `Alright, continuing work on "${task}".` : `Roger that. On it.`,
    ]);
    return pick(confirmReplies.length > 0 ? confirmReplies : [`Got it, proceeding.`]);
  }

  // --- No / Rejection ---
  if (/^(no|nah|nope|not yet|hold off|wait|stop|cancel|don't|never mind)\.?!?$/i.test(msg)) {
    const rejectReplies = avoidPhrase([
      `Understood. I'll hold off for now. Let me know when you're ready.`,
      `Okay, pausing on that. Just say the word when you want me to continue.`,
      `Got it - I'll stand by.`,
    ]);
    return pick(rejectReplies.length > 0 ? rejectReplies : [`Understood, holding off.`]);
  }

  // --- Questions ---
  if (/\?$/.test(msg.trim())) {
    const questionReplies = avoidPhrase([
      `Good question. Let me look into that and get you an answer.`,
      `Let me check on that and get back to you.`,
      `I'll find out and follow up shortly.`,
      domain ? `I'll research that from a ${domain} perspective and update you.` : `Let me dig into that for you.`,
    ]);
    return pick(questionReplies.length > 0 ? questionReplies : [`Let me look into that.`]);
  }

  // --- Default (contextual) ---
  if (task) {
    const taskDefault = avoidPhrase([
      `Got it. I'm currently focused on "${task}" but I'll factor this in.`,
      `Noted. I'll keep this in mind as I work on "${task}".`,
      `Understood. I'll incorporate this into my current work on "${task}".`,
      `Message received. Working on "${task}" - I'll address this alongside.`,
    ]);
    return pick(taskDefault.length > 0 ? taskDefault : [`Got it - noted alongside "${task}".`]);
  }

  const defaults = avoidPhrase([
    `Got it, Shannon. I'll take action on this.`,
    `Understood. I'll work on this and keep you posted.`,
    `Noted. Let me handle this and circle back.`,
    `On it. I'll update you with progress.`,
    `Message received. I'll get on this right away.`,
  ]);
  return pick(defaults.length > 0 ? defaults : [`Got it. I'll follow up on this.`]);
}

/** Simulate a natural typing delay based on reply length */
function typingDelay(reply: string): Promise<void> {
  // Base delay 500-1200ms + variable by message length (capped at 3s)
  const base = 500 + Math.random() * 700;
  const perChar = Math.min(reply.length * 15, 2000);
  const total = Math.min(base + perChar, 3000);
  return new Promise((resolve) => setTimeout(resolve, total));
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

    // Generate agent reply and return it in the response so it is
    // guaranteed to reach the client even when the in-memory eventBus
    // cannot bridge separate serverless function instances.
    const agentReply = await generateAndSaveReply(agentId, content);

    return NextResponse.json({
      success: true,
      messageId: userMessageId,
      timestamp: now,
      agentReply,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function generateAndSaveReply(agentId: string, userMessage: string): Promise<{
  id: string;
  agentId: string;
  sender: string;
  content: string;
  timestamp: string;
  status: string;
}> {
  const replyId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Emit typing indicator
  eventBus.emit("chat_message", {
    event: "typing_start",
    agentId,
    messageId: replyId,
  });

  const agentInfo = await getAgentInfo(agentId);
  const history = await getRecentHistory(agentId);

  // Try AI-powered streaming reply first, fall back to dynamic response
  let reply = await getAIReplyStreaming(agentId, replyId, agentInfo || {}, history, userMessage);
  if (!reply) {
    reply = generateDynamicReply(agentInfo, userMessage, history);
    // Add a natural typing delay for fallback responses
    await typingDelay(reply);
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

  return {
    id: replyId,
    agentId,
    sender: "agent",
    content: reply,
    timestamp: now,
    status: "sent",
  };
}
