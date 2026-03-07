import { db } from "../src/lib/db/client";
import { opportunities } from "../src/lib/db/schema";
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
    ownerAgentId: "skylar", // Sub to Skyward, maybe Skylar or Bertha? Bertha is BD.
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
    shannonApproval: null,
  },
];

async function seedRealOpportunities() {
  if (!db) {
    console.error("❌ Database not configured. Set DATABASE_URL.");
    process.exit(1);
  }

  console.log("🌱 Seeding REAL Opportunities...");

  try {
    // 1. Clear existing opportunities
    console.log("🧹 Clearing existing opportunities...");
    await db.delete(opportunities);
    console.log("✅ Cleared opportunities table.");

    // 2. Insert Real Opportunities
    const now = new Date().toISOString();

    for (const opp of REAL_OPPORTUNITIES) {
      await db.insert(opportunities).values({
        ...opp,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ➕ Inserted: ${opp.title} ($${(opp.valueUsd / 100).toLocaleString()})`);
    }

    console.log(`🎉 Successfully seeded ${REAL_OPPORTUNITIES.length} real opportunities.`);
  } catch (error) {
    console.error("❌ Error seeding opportunities:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  seedRealOpportunities()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { seedRealOpportunities };
