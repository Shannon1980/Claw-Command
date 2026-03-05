import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, activities } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { agentId, content } = await request.json();

    if (!agentId || !content) {
      return NextResponse.json(
        { error: 'agentId and content are required' },
        { status: 400 }
      );
    }

    const messageId = uuidv4();

    await db.insert(chatMessages).values({
      id: messageId,
      agentId,
      sender: 'user',
      content,
      status: 'sent',
    });

    // Log the activity
    await db.insert(activities).values({
      id: uuidv4(),
      eventType: 'message_sent',
      resourceType: 'chat',
      resourceId: messageId,
      details: JSON.stringify({ agentId, content }),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
