import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_news_briefs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      ai_news JSONB DEFAULT '[]',
      ai_podcasts JSONB DEFAULT '[]',
      ai_youtube JSONB DEFAULT '[]',
      world_news JSONB DEFAULT '[]',
      us_news JSONB DEFAULT '[]',
      local_news JSONB DEFAULT '[]',
      standup_summary JSONB DEFAULT '{}',
      brief_summary JSONB DEFAULT '{}',
      skyward_summary JSONB DEFAULT '{}',
      generated_at TEXT NOT NULL DEFAULT (now()::text),
      UNIQUE(date)
    );
  `);
  schemaReady = true;
}

interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary: string;
  category: string;
  publishedAt: string;
}

interface PodcastItem {
  title: string;
  show: string;
  url: string;
  summary: string;
  duration: string;
  publishedAt: string;
}

interface YouTubeItem {
  title: string;
  channel: string;
  url: string;
  summary: string;
  duration: string;
  publishedAt: string;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch internal brief data by calling sibling API routes.
 * Uses absolute URL construction from the request to avoid needing a base URL.
 */
async function fetchInternalData(baseUrl: string) {
  const [briefRes, standupRes, skywardRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/brief`).then((r) => (r.ok ? r.json() : null)),
    fetch(`${baseUrl}/api/standup?date=${todayString()}`).then((r) =>
      r.ok ? r.json() : null
    ),
    fetch(`${baseUrl}/api/skyward`).then((r) => (r.ok ? r.json() : null)),
  ]);

  return {
    brief: briefRes.status === "fulfilled" ? briefRes.value : null,
    standup: standupRes.status === "fulfilled" ? standupRes.value : null,
    skyward: skywardRes.status === "fulfilled" ? skywardRes.value : null,
  };
}

/**
 * Curated AI news sources. In production these would be fetched from RSS/APIs.
 * The POST handler stores generated content; GET retrieves the latest stored brief.
 */
function generatePlaceholderAINews(): NewsItem[] {
  return [
    {
      title: "Check AI news sources for today's updates",
      source: "Agent Task",
      url: "",
      summary:
        "Configure RSS feeds or news API keys (e.g. NewsAPI, Bing News) to populate this section automatically. Recommended sources: TechCrunch AI, The Verge AI, MIT Technology Review, Ars Technica AI.",
      category: "ai",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderPodcasts(): PodcastItem[] {
  return [
    {
      title: "Check AI podcast feeds for new episodes",
      show: "Agent Task",
      url: "",
      summary:
        "Configure podcast RSS feeds to auto-populate. Recommended: Lex Fridman, Hard Fork (NYT), Practical AI, The AI Podcast (NVIDIA), Latent Space, Last Week in AI.",
      duration: "",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderYouTube(): YouTubeItem[] {
  return [
    {
      title: "Check AI YouTube channels for new content",
      channel: "Agent Task",
      url: "",
      summary:
        "Configure YouTube Data API to auto-populate. Recommended channels: Two Minute Papers, Yannic Kilcher, AI Explained, Matt Wolfe, The AI Advantage, Fireship.",
      duration: "",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderWorldNews(): NewsItem[] {
  return [
    {
      title: "Check world news sources",
      source: "Agent Task",
      url: "",
      summary:
        "Configure a news API (NewsAPI.org, GNews, etc.) with a NEWS_API_KEY environment variable to auto-populate world, US, and local news.",
      category: "world",
      publishedAt: new Date().toISOString(),
    },
  ];
}

// ── GET: Retrieve the latest daily news brief ──────────────────────────
export async function GET(request: NextRequest) {
  const date =
    request.nextUrl.searchParams.get("date") || todayString();

  if (!pool) {
    // Return a skeleton brief when no DB
    return NextResponse.json({
      id: "no-db",
      date,
      aiNews: generatePlaceholderAINews(),
      aiPodcasts: generatePlaceholderPodcasts(),
      aiYouTube: generatePlaceholderYouTube(),
      worldNews: generatePlaceholderWorldNews(),
      usNews: [],
      localNews: [],
      standupSummary: null,
      briefSummary: null,
      skywardSummary: null,
      generatedAt: new Date().toISOString(),
    });
  }

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT * FROM daily_news_briefs WHERE date = $1`,
      [date]
    );

    if (result.rows.length === 0) {
      // No brief generated yet for this date - return live aggregated data
      const origin = new URL(request.url).origin;
      const internal = await fetchInternalData(origin);

      return NextResponse.json({
        id: null,
        date,
        aiNews: generatePlaceholderAINews(),
        aiPodcasts: generatePlaceholderPodcasts(),
        aiYouTube: generatePlaceholderYouTube(),
        worldNews: generatePlaceholderWorldNews(),
        usNews: [] as NewsItem[],
        localNews: [] as NewsItem[],
        standupSummary: internal.standup,
        briefSummary: internal.brief,
        skywardSummary: internal.skyward,
        generatedAt: new Date().toISOString(),
        live: true,
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      id: row.id,
      date: row.date,
      aiNews: row.ai_news || [],
      aiPodcasts: row.ai_podcasts || [],
      aiYouTube: row.ai_youtube || [],
      worldNews: row.world_news || [],
      usNews: row.us_news || [],
      localNews: row.local_news || [],
      standupSummary: row.standup_summary,
      briefSummary: row.brief_summary,
      skywardSummary: row.skyward_summary,
      generatedAt: row.generated_at,
      live: false,
    });
  } catch (error) {
    console.error("[DailyNewsBrief API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch brief" },
      { status: 500 }
    );
  }
}

// ── POST: Generate/refresh today's daily news brief ────────────────────
// Called by cron job or manually. Aggregates all data and stores in DB.
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    await ensureSchema();

    const body = await request.json().catch(() => ({}));
    const date = (body.date as string) || todayString();
    const origin = new URL(request.url).origin;

    // Aggregate internal data
    const internal = await fetchInternalData(origin);

    // News content - use provided data or placeholders
    // In production, an agent would call external APIs and pass results here
    const aiNews = (body.aiNews as NewsItem[]) || generatePlaceholderAINews();
    const aiPodcasts =
      (body.aiPodcasts as PodcastItem[]) || generatePlaceholderPodcasts();
    const aiYouTube =
      (body.aiYouTube as YouTubeItem[]) || generatePlaceholderYouTube();
    const worldNews =
      (body.worldNews as NewsItem[]) || generatePlaceholderWorldNews();
    const usNews = (body.usNews as NewsItem[]) || [];
    const localNews = (body.localNews as NewsItem[]) || [];

    const id = `dnb-${date}-${Date.now()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO daily_news_briefs (id, date, ai_news, ai_podcasts, ai_youtube, world_news, us_news, local_news, standup_summary, brief_summary, skyward_summary, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (date) DO UPDATE SET
         ai_news = EXCLUDED.ai_news,
         ai_podcasts = EXCLUDED.ai_podcasts,
         ai_youtube = EXCLUDED.ai_youtube,
         world_news = EXCLUDED.world_news,
         us_news = EXCLUDED.us_news,
         local_news = EXCLUDED.local_news,
         standup_summary = EXCLUDED.standup_summary,
         brief_summary = EXCLUDED.brief_summary,
         skyward_summary = EXCLUDED.skyward_summary,
         generated_at = EXCLUDED.generated_at`,
      [
        id,
        date,
        JSON.stringify(aiNews),
        JSON.stringify(aiPodcasts),
        JSON.stringify(aiYouTube),
        JSON.stringify(worldNews),
        JSON.stringify(usNews),
        JSON.stringify(localNews),
        JSON.stringify(internal.brief),
        JSON.stringify(internal.brief),
        JSON.stringify(internal.skyward),
        now,
      ]
    );

    emitNotification({
      title: "Daily News Brief generated",
      type: "info",
    });

    return NextResponse.json({ success: true, id, date, generatedAt: now });
  } catch (error) {
    console.error("[DailyNewsBrief API] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate brief",
      },
      { status: 500 }
    );
  }
}
