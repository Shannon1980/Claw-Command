import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const pendingMessages = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.sender, 'user'), eq(chatMessages.status, 'sent')));

    return NextResponse.json(pendingMessages);
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { agentId, content, replyToMessageId } = await request.json();

    if (!agentId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert agent reply
    await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      agentId,
      sender: 'agent',
      content,
      status: 'delivered',
    });

    // Update original message if replyToMessageId is provided
    if (replyToMessageId) {
      await db
        .update(chatMessages)
        .set({ status: 'read' })
        .where(eq(chatMessages.id, replyToMessageId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing agent reply:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
