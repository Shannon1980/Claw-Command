import { NextResponse } from "next/server";
import { db } from "@/lib/db/client"; // assuming alias @ points to src
import { opportunities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const REAL_OPPORTUNITIES = [
  {
    id: "opp-moco-dhhs-ai",
    title: "Montgomery County DHHS - AI Case Management",
    stage: "qualify", // Qualified
    valueUsd: 25000000, // $250k
    probability: 60,
    ownerAgentId: "bertha",
    shannonApproval: true,
  },
  {
    id: "opp-cms-seas-recompete",
    title: "CMS SEAS IT Re-compete",
    stage: "identify", // Lead
    valueUsd: 120000000, // $1.2M
    probability: 40,
    ownerAgentId: "skylar", // Sub to Skyward
    shannonApproval: true,
  },
  {
    id: "opp-navy-fed-digital",
    title: "Navy Fed Credit Union - Digital Transformation",
    stage: "propose", // Proposal
    valueUsd: 15000000, // $150k
    probability: 75,
    ownerAgentId: "bertha",
    shannonApproval: true,
  },
  {
    id: "opp-dhs-cbp-data",
    title: "DHS CBP - Data Analytics Support",
    stage: "identify", // Lead
    valueUsd: 350000000, // $3.5M
    probability: 20,
    ownerAgentId: "bertha",
    shannonApproval: null, // Pending Shannon's check
  },
];

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  }

  try {
    console.log("🌱 Seeding REAL Opportunities via API...");

    // 1. Clear existing opportunities
    await db.delete(opportunities);

    // 2. Insert Real Opportunities
    const now = new Date().toISOString();
    
    // Convert to values array for bulk insert if supported, or loop
    const valuesToInsert = REAL_OPPORTUNITIES.map(opp => ({
      ...opp,
      createdAt: now,
      updatedAt: now,
    }));

    // Drizzle allows batch insert
    if (valuesToInsert.length > 0) {
      await db.insert(opportunities).values(valuesToInsert);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully seeded real opportunities",
      count: valuesToInsert.length,
      data: valuesToInsert
    });

  } catch (error) {
    console.error("❌ Error seeding opportunities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed opportunities" },
      { status: 500 }
    );
  }
}
