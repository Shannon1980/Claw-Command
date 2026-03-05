import { NextRequest, NextResponse } from "next/server";

// In-memory message store (shared with send route)
const messageStore: Map<string, any[]> = new Map();

// Mock messages for demo purposes
const mockMessages = (agentId: string) => [
  {
    id: "msg_1",
    agentId,
    sender: "shannon",
    message: "Hey! Can you help me with the dashboard updates?",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    hasAttachments: false,
  },
  {
    id: "msg_2",
    agentId,
    sender: "agent",
    message: "Absolutely! I can help with that. What specific updates are you looking for?",
    timestamp: new Date(Date.now() - 3500000).toISOString(),
    hasAttachments: false,
  },
  {
    id: "msg_3",
    agentId,
    sender: "shannon",
    message: "I need to add **rich text formatting** and file attachments to the chat interface. Here's the spec:\n\n- Bold, italic, code support\n- Drag and drop files\n- Message status indicators\n\nCan you review the attached document?",
    timestamp: new Date(Date.now() - 3400000).toISOString(),
    hasAttachments: true,
    attachments: [
      { name: "spec.pdf", type: "application/pdf", size: 245760 }
    ],
  },
  {
    id: "msg_4",
    agentId,
    sender: "agent",
    message: "Got it! I'll implement:\n\n1. MarkdownRenderer component\n2. FileAttachment UI\n3. Rich input with toolbar\n\nETA: 2 hours ✓",
    timestamp: new Date(Date.now() - 3300000).toISOString(),
    hasAttachments: false,
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Get messages from store or return mock data
    const messages = messageStore.get(agentId) || mockMessages(agentId);

    return NextResponse.json({
      agentId,
      messages,
      total: messages.length,
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
