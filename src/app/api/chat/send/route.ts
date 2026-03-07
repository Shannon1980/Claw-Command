import { NextRequest, NextResponse } from "next/server";

// In-memory message store (replace with DB later)
const messageStore: Map<string, any[]> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message, attachments } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const newMessage = {
      id: messageId,
      agentId,
      sender: "shannon",
      message,
      attachments: attachments || [],
      timestamp,
      status: "sent",
      hasAttachments: (attachments && attachments.length > 0) || false,
    };

    // Store message
    if (!messageStore.has(agentId)) {
      messageStore.set(agentId, []);
    }
    messageStore.get(agentId)!.push(newMessage);

    // Log activity event
    // TODO: Connect to actual activities API
    console.log(`[Activity] message_sent to ${agentId}:`, messageId);

    return NextResponse.json({
      id: messageId,
      status: "sent",
      timestamp,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// Export the message store for use by other API routes
export { messageStore };
