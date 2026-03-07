import { NextRequest, NextResponse } from "next/server";
import { runEmailWorker } from "@/lib/email/worker";

async function handleRun(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runEmailWorker();

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      actions: result.actions,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[Email Worker] Run error:", err);
    return NextResponse.json(
      { error: "Worker failed", details: String(err) },
      { status: 500 }
    );
  }
}

/** GET - Vercel Cron calls GET */
export async function GET(request: NextRequest) {
  return handleRun(request);
}

/** POST - manual trigger */
export async function POST(request: NextRequest) {
  return handleRun(request);
}
