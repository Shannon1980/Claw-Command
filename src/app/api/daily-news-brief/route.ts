import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";
import {
  fetchTopHeadlines,
  searchNews,
  isNewsConfigured,
  getConfiguredProvider,
  fetchRedditNews,
  fetchHackerNews,
  type NewsArticle,
  type RedditNewsItem,
  type HackerNewsItem,
} from "@/lib/news/client";

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
  urlToImage?: string | null;
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

// ── NewsAPI Integration ─────────────────────────────────────────────────

function mapArticleToNewsItem(
  article: NewsArticle,
  category: string
): NewsItem {
  return {
    title: article.title,
    source: article.source.name,
    url: article.url,
    summary: article.description || "",
    category,
    publishedAt: article.publishedAt,
    urlToImage: article.urlToImage,
  };
}

const AI_SEARCH_TERMS =
  "artificial intelligence OR machine learning OR ChatGPT OR GPT OR LLM OR generative AI OR Claude OR OpenAI OR deep learning";

interface FetchResult {
  items: NewsItem[];
  error?: string;
}

async function fetchAINews(): Promise<FetchResult> {
  try {
    const res = await searchNews(AI_SEARCH_TERMS, {
      sortBy: "publishedAt",
      pageSize: 10,
    });
    const items = res.articles
      .filter((a) => a.title !== "[Removed]")
      .map((a) => mapArticleToNewsItem(a, "ai"));
    return { items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DailyNewsBrief] AI news fetch failed:", msg);
    return { items: [], error: msg };
  }
}

async function fetchCategoryNews(
  category: "general" | "business" | "technology" | "science" | "health" | "sports" | "entertainment"
): Promise<FetchResult> {
  try {
    const res = await fetchTopHeadlines({ category, pageSize: 10 });
    const items = res.articles
      .filter((a) => a.title !== "[Removed]")
      .map((a) => mapArticleToNewsItem(a, category));
    return { items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[DailyNewsBrief] ${category} news fetch failed:`, msg);
    return { items: [], error: msg };
  }
}

async function fetchRedditFeed(): Promise<{ items: RedditNewsItem[]; error?: string }> {
  try {
    const items = await fetchRedditNews();
    return { items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DailyNewsBrief] Reddit fetch failed:", msg);
    return { items: [], error: msg };
  }
}

async function fetchHackerNewsFeed(): Promise<{ items: HackerNewsItem[]; error?: string }> {
  try {
    const items = await fetchHackerNews();
    return { items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DailyNewsBrief] Hacker News fetch failed:", msg);
    return { items: [], error: msg };
  }
}

async function fetchAllLiveNews() {
  // Reddit and HN are always fetched (no API key required)
  const [redditResult, hackerNewsResult] = await Promise.all([
    fetchRedditFeed(),
    fetchHackerNewsFeed(),
  ]);

  const newsErrors: string[] = [];
  if (redditResult.error) newsErrors.push(`Reddit: ${redditResult.error}`);
  if (hackerNewsResult.error) newsErrors.push(`Hacker News: ${hackerNewsResult.error}`);

  if (!isNewsConfigured()) {
    return {
      aiNews: generatePlaceholderAINews(),
      worldNews: generatePlaceholderWorldNews(),
      usNews: [] as NewsItem[],
      technologyNews: [] as NewsItem[],
      businessNews: [] as NewsItem[],
      entertainmentNews: [] as NewsItem[],
      healthNews: [] as NewsItem[],
      redditNews: redditResult.items,
      hackerNews: hackerNewsResult.items,
      newsErrors,
    };
  }

  const [aiResult, generalResult, technologyResult, businessResult, entertainmentResult, healthResult] =
    await Promise.all([
      fetchAINews(),
      fetchCategoryNews("general"),
      fetchCategoryNews("technology"),
      fetchCategoryNews("business"),
      fetchCategoryNews("entertainment"),
      fetchCategoryNews("health"),
    ]);

  if (aiResult.error) newsErrors.push(`AI news: ${aiResult.error}`);
  if (generalResult.error) newsErrors.push(`Headlines: ${generalResult.error}`);
  if (technologyResult.error) newsErrors.push(`Technology: ${technologyResult.error}`);
  if (businessResult.error) newsErrors.push(`Business: ${businessResult.error}`);
  if (entertainmentResult.error) newsErrors.push(`Entertainment: ${entertainmentResult.error}`);
  if (healthResult.error) newsErrors.push(`Health: ${healthResult.error}`);

  return {
    aiNews: aiResult.items,
    worldNews: generalResult.items,
    usNews: generalResult.items.slice(0, 5),
    technologyNews: technologyResult.items,
    businessNews: businessResult.items,
    entertainmentNews: entertainmentResult.items,
    healthNews: healthResult.items,
    redditNews: redditResult.items,
    hackerNews: hackerNewsResult.items,
    newsErrors,
  };
}

// ── Placeholder fallbacks (when no NEWS_API_KEY) ────────────────────────

function generatePlaceholderAINews(): NewsItem[] {
  return [
    {
      title: "Configure a news API key to see live AI news",
      source: "Setup Required",
      url: "",
      summary:
        "Add GNEWS_API_KEY (gnews.io), GUARDIAN_API_KEY (theguardian.com), or NEWS_API_KEY (newsapi.org) to .env.local.",
      category: "ai",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderPodcasts(): PodcastItem[] {
  return [
    {
      title: "Podcast feeds coming soon",
      show: "Setup Required",
      url: "",
      summary:
        "Podcast RSS integration is planned. Recommended: Lex Fridman, Hard Fork (NYT), Practical AI, Latent Space.",
      duration: "",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderYouTube(): YouTubeItem[] {
  return [
    {
      title: "Configure YOUTUBE_API_KEY for video content",
      channel: "Setup Required",
      url: "",
      summary:
        "Add YOUTUBE_API_KEY to .env.local for YouTube Data API integration. Get a key from Google Cloud Console.",
      duration: "",
      publishedAt: new Date().toISOString(),
    },
  ];
}

function generatePlaceholderWorldNews(): NewsItem[] {
  return [
    {
      title: "Configure a news API key for live news",
      source: "Setup Required",
      url: "",
      summary:
        "Add GNEWS_API_KEY, GUARDIAN_API_KEY, or NEWS_API_KEY to .env.local for live news feeds.",
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
    // No DB — fetch live news directly
    const liveNews = await fetchAllLiveNews();
    return NextResponse.json({
      id: "no-db",
      date,
      aiNews: liveNews.aiNews,
      aiPodcasts: generatePlaceholderPodcasts(),
      aiYouTube: generatePlaceholderYouTube(),
      worldNews: liveNews.worldNews,
      usNews: liveNews.usNews,
      localNews: [],
      technologyNews: liveNews.technologyNews,
      businessNews: liveNews.businessNews,
      entertainmentNews: liveNews.entertainmentNews,
      healthNews: liveNews.healthNews,
      redditNews: liveNews.redditNews,
      hackerNews: liveNews.hackerNews,
      standupSummary: null,
      briefSummary: null,
      skywardSummary: null,
      generatedAt: new Date().toISOString(),
      live: true,
      newsApiConfigured: isNewsConfigured(),
      newsProvider: getConfiguredProvider(),
      newsErrors: liveNews.newsErrors,
    });
  }

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT * FROM daily_news_briefs WHERE date = $1`,
      [date]
    );

    if (result.rows.length === 0) {
      // No stored brief — return live aggregated data with real news
      const origin = new URL(request.url).origin;
      const [internal, liveNews] = await Promise.all([
        fetchInternalData(origin),
        fetchAllLiveNews(),
      ]);

      return NextResponse.json({
        id: null,
        date,
        aiNews: liveNews.aiNews,
        aiPodcasts: generatePlaceholderPodcasts(),
        aiYouTube: generatePlaceholderYouTube(),
        worldNews: liveNews.worldNews,
        usNews: liveNews.usNews,
        localNews: [] as NewsItem[],
        technologyNews: liveNews.technologyNews,
        businessNews: liveNews.businessNews,
        entertainmentNews: liveNews.entertainmentNews,
        healthNews: liveNews.healthNews,
        redditNews: liveNews.redditNews,
        hackerNews: liveNews.hackerNews,
        standupSummary: internal.standup,
        briefSummary: internal.brief,
        skywardSummary: internal.skyward,
        generatedAt: new Date().toISOString(),
        live: true,
        newsApiConfigured: isNewsConfigured(),
        newsProvider: getConfiguredProvider(),
        newsErrors: liveNews.newsErrors,
      });
    }

    const row = result.rows[0];

    // Always fetch fresh Reddit/HN (free, no key needed)
    const [redditResult, hnResult] = await Promise.allSettled([
      fetchRedditNews(),
      fetchHackerNews(),
    ]);

    return NextResponse.json({
      id: row.id,
      date: row.date,
      aiNews: row.ai_news || [],
      aiPodcasts: row.ai_podcasts || [],
      aiYouTube: row.ai_youtube || [],
      worldNews: row.world_news || [],
      usNews: row.us_news || [],
      localNews: row.local_news || [],
      technologyNews: row.world_news?.filter((n: NewsItem) => n.category === "technology") || [],
      businessNews: row.world_news?.filter((n: NewsItem) => n.category === "business") || [],
      entertainmentNews: row.world_news?.filter((n: NewsItem) => n.category === "entertainment") || [],
      healthNews: row.world_news?.filter((n: NewsItem) => n.category === "health") || [],
      redditNews: redditResult.status === "fulfilled" ? redditResult.value : [],
      hackerNews: hnResult.status === "fulfilled" ? hnResult.value : [],
      standupSummary: row.standup_summary,
      briefSummary: row.brief_summary,
      skywardSummary: row.skyward_summary,
      generatedAt: row.generated_at,
      live: false,
      newsApiConfigured: isNewsConfigured(),
      newsProvider: getConfiguredProvider(),
    });
  } catch (error) {
    console.error("[DailyNewsBrief API] GET error:", error);
    return NextResponse.json({
      id: "error-fallback",
      date,
      aiNews: generatePlaceholderAINews(),
      aiPodcasts: generatePlaceholderPodcasts(),
      aiYouTube: generatePlaceholderYouTube(),
      worldNews: generatePlaceholderWorldNews(),
      usNews: [] as NewsItem[],
      localNews: [],
      technologyNews: [] as NewsItem[],
      businessNews: [] as NewsItem[],
      entertainmentNews: [] as NewsItem[],
      healthNews: [] as NewsItem[],
      redditNews: [] as RedditNewsItem[],
      hackerNews: [] as HackerNewsItem[],
      standupSummary: null,
      briefSummary: null,
      skywardSummary: null,
      generatedAt: new Date().toISOString(),
      live: true,
      newsApiConfigured: isNewsConfigured(),
      newsProvider: getConfiguredProvider(),
      newsErrors: [error instanceof Error ? error.message : "Failed to fetch brief"],
    });
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

    // Fetch live news from NewsAPI if key is configured, otherwise use provided data or placeholders
    const liveNews = await fetchAllLiveNews();

    const aiNews = (body.aiNews as NewsItem[]) || liveNews.aiNews;
    const aiPodcasts =
      (body.aiPodcasts as PodcastItem[]) || generatePlaceholderPodcasts();
    const aiYouTube =
      (body.aiYouTube as YouTubeItem[]) || generatePlaceholderYouTube();
    const worldNews =
      (body.worldNews as NewsItem[]) || [
        ...liveNews.worldNews,
        ...liveNews.technologyNews,
        ...liveNews.businessNews,
        ...liveNews.entertainmentNews,
        ...liveNews.healthNews,
      ];
    const usNews = (body.usNews as NewsItem[]) || liveNews.usNews;
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
        JSON.stringify(internal.standup),
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
