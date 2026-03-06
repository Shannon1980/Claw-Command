import { NextRequest, NextResponse } from "next/server";
import { runEmailWorker } from "@/lib/email/worker";

/**
 * Trigger the email worker.
 * Call via cron (e.g. Vercel Cron) or manually.
 * Optional: require CRON_SECRET in Authorization header for cron jobs.
 */
export async function POST(request: NextRequest) {
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
