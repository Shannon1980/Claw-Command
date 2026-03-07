import { NextRequest, NextResponse } from "next/server";
import { analyzeOpportunity, type OpportunityInput } from "@/lib/opportunity-engine/analyze";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate minimum required fields
    const required = ["opportunityId", "title", "agency", "scope", "description", "estimatedBudget"];
    const missing = required.filter((field) => !body[field] && body[field] !== 0);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields: missing,
          hint: "Minimum required: opportunityId, title, agency, scope, description, estimatedBudget",
        },
        { status: 400 }
      );
    }

    // Parse budget if string
    let budget = body.estimatedBudget;
    if (typeof budget === "string") {
      budget = Number(budget.replace(/[$,kKmM]/g, (m: string) => {
        if (m === "k" || m === "K") return "000";
        if (m === "m" || m === "M") return "000000";
        return "";
      }));
    }

    const input: OpportunityInput = {
      opportunityId: body.opportunityId,
      title: body.title,
      agency: body.agency,
      sector: body.sector || inferSector(body.agency),
      naics: body.naics,
      scope: body.scope,
      description: body.description,
      estimatedBudget: budget,
      priceRange: body.priceRange || inferPriceRange(budget),
      timeline: body.timeline,
      setAsides: body.setAsides || "none",
      geographyPreference: body.geographyPreference,
      pastPerformance: body.pastPerformance ?? false,
      securityRequirement: body.securityRequirement || "medium",
      competitorIntel: body.competitorIntel,
    };

    const analysis = analyzeOpportunity(input);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[OpportunityEngine] Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}

function inferSector(agency: string): "federal" | "state" | "local" {
  const a = agency.toLowerCase();
  if (a.includes("county") || a.includes("city") || a.includes("municipal")) return "local";
  if (a.includes("state") || a.includes("maryland") || a.includes("virginia")) return "state";
  return "federal";
}

function inferPriceRange(budget: number): "low" | "mid" | "high" {
  if (budget < 200000) return "low";
  if (budget < 1000000) return "mid";
  return "high";
}
