import { NextResponse } from "next/server";
import { mockDocuments, Document } from "@/lib/mock-docs";

export async function GET() {
  return NextResponse.json(mockDocuments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: body.title || "Untitled Document",
      type: body.type || "template",
      agent: body.agent || "Bob",
      agentEmoji: body.agentEmoji || "🤖",
      status: "draft",
      content: body.content || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In a real app, this would save to a database
    mockDocuments.push(newDoc);

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
