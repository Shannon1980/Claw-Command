// ── News Provider Abstraction ────────────────────────────────────────────
// Supports multiple news APIs with automatic fallback:
//   1. GNews (gnews.io) — free tier works in production, 100 req/day
//   2. The Guardian (open-platform.theguardian.com) — free, generous limits
//   3. NewsAPI (newsapi.org) — free plan localhost-only, paid works everywhere
//
// Set NEWS_PROVIDER env var to force a specific provider ("gnews", "guardian", "newsapi").
// Otherwise the system auto-selects based on which API keys are configured.

function getNewsApiKey(): string | undefined {
  const key = (process.env.NEWS_API_KEY || process.env.NEW_API_KEY || "").trim();
  return key || undefined;
}

function getGNewsApiKey(): string | undefined {
  const key = (process.env.GNEWS_API_KEY || "").trim();
  return key || undefined;
}

function getGuardianApiKey(): string | undefined {
  const key = (process.env.GUARDIAN_API_KEY || "").trim();
  return key || undefined;
}

export interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface NewsFetchOptions {
  category?: string;
  query?: string;
  country?: string;
  pageSize?: number;
}

export const NEWS_CATEGORIES = [
  "general",
  "business",
  "technology",
  "science",
  "health",
  "sports",
  "entertainment",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

type ProviderName = "gnews" | "guardian" | "newsapi";

// ── Provider detection ────────────────────────────────────────────────────

function getActiveProvider(): ProviderName | null {
  const forced = (process.env.NEWS_PROVIDER || "").trim().toLowerCase();
  if (forced === "gnews" && getGNewsApiKey()) return "gnews";
  if (forced === "guardian" && getGuardianApiKey()) return "guardian";
  if (forced === "newsapi" && getNewsApiKey()) return "newsapi";

  // Auto-select: prefer providers that work in production
  if (getGNewsApiKey()) return "gnews";
  if (getGuardianApiKey()) return "guardian";
  if (getNewsApiKey()) return "newsapi";
  return null;
}

export function getConfiguredProvider(): string | null {
  return getActiveProvider();
}

export function isNewsConfigured(): boolean {
  return getActiveProvider() !== null;
}

// ── GNews provider ────────────────────────────────────────────────────────

const GNEWS_CATEGORY_MAP: Record<string, string> = {
  general: "general",
  business: "business",
  technology: "technology",
  science: "science",
  health: "health",
  sports: "sports",
  entertainment: "entertainment",
};

async function gnewsFetchHeadlines(options: NewsFetchOptions): Promise<NewsResponse> {
  const apiKey = getGNewsApiKey()!;
  const { category, query, country = "us", pageSize = 20 } = options;
  const max = Math.min(pageSize, 10); // GNews free tier max 10

  const params = new URLSearchParams({
    apikey: apiKey,
    lang: "en",
    country,
    max: String(max),
  });

  if (category && GNEWS_CATEGORY_MAP[category]) {
    params.set("topic", GNEWS_CATEGORY_MAP[category]);
  }
  if (query) params.set("q", query);

  const endpoint = query
    ? `https://gnews.io/api/v4/search?${params}`
    : `https://gnews.io/api/v4/top-headlines?${params}`;

  const res = await fetch(endpoint, { next: { revalidate: 900 } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.errors?.[0] || `GNews error: ${res.status}`;
    console.error(`[NewsClient:GNews] headlines failed (${res.status}):`, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    status: "ok",
    totalResults: data.totalArticles || data.articles?.length || 0,
    articles: (data.articles || []).map((a: {
      title: string;
      description: string;
      url: string;
      image: string | null;
      publishedAt: string;
      content: string | null;
      source: { name: string; url: string };
    }) => ({
      source: { id: null, name: a.source?.name || "Unknown" },
      author: null,
      title: a.title,
      description: a.description || null,
      url: a.url,
      urlToImage: a.image || null,
      publishedAt: a.publishedAt,
      content: a.content || null,
    })),
  };
}

async function gnewsSearch(query: string, options: { sortBy?: string; pageSize?: number }): Promise<NewsResponse> {
  return gnewsFetchHeadlines({ query, pageSize: options.pageSize });
}

// ── Guardian provider ─────────────────────────────────────────────────────

const GUARDIAN_SECTION_MAP: Record<string, string> = {
  general: "world",
  business: "business",
  technology: "technology",
  science: "science",
  health: "society",
  sports: "sport",
  entertainment: "culture",
};

async function guardianFetchHeadlines(options: NewsFetchOptions): Promise<NewsResponse> {
  const apiKey = getGuardianApiKey()!;
  const { category, query, pageSize = 20 } = options;

  const params = new URLSearchParams({
    "api-key": apiKey,
    "page-size": String(Math.min(pageSize, 50)),
    "show-fields": "headline,trailText,thumbnail,byline,bodyText",
    "order-by": "newest",
  });

  if (category && GUARDIAN_SECTION_MAP[category]) {
    params.set("section", GUARDIAN_SECTION_MAP[category]);
  }
  if (query) params.set("q", query);

  const res = await fetch(`https://content.guardianapis.com/search?${params}`, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.response?.message || `Guardian error: ${res.status}`;
    console.error(`[NewsClient:Guardian] failed (${res.status}):`, msg);
    throw new Error(msg);
  }

  const data = await res.json();
  const results = data.response?.results || [];

  return {
    status: "ok",
    totalResults: data.response?.total || results.length,
    articles: results.map((r: {
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      fields?: { trailText?: string; thumbnail?: string; byline?: string };
      sectionName?: string;
    }) => ({
      source: { id: "the-guardian", name: r.sectionName ? `The Guardian — ${r.sectionName}` : "The Guardian" },
      author: r.fields?.byline || null,
      title: r.webTitle,
      description: r.fields?.trailText || null,
      url: r.webUrl,
      urlToImage: r.fields?.thumbnail || null,
      publishedAt: r.webPublicationDate,
      content: null,
    })),
  };
}

async function guardianSearch(query: string, options: { sortBy?: string; pageSize?: number }): Promise<NewsResponse> {
  const sortMap: Record<string, string> = {
    relevancy: "relevance",
    popularity: "relevance",
    publishedAt: "newest",
  };
  const orderBy = sortMap[options.sortBy || "publishedAt"] || "newest";

  const apiKey = getGuardianApiKey()!;
  const params = new URLSearchParams({
    "api-key": apiKey,
    q: query,
    "page-size": String(Math.min(options.pageSize || 20, 50)),
    "show-fields": "headline,trailText,thumbnail,byline",
    "order-by": orderBy,
  });

  const res = await fetch(`https://content.guardianapis.com/search?${params}`, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.response?.message || `Guardian search error: ${res.status}`);
  }

  const data = await res.json();
  const results = data.response?.results || [];

  return {
    status: "ok",
    totalResults: data.response?.total || results.length,
    articles: results.map((r: {
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      fields?: { trailText?: string; thumbnail?: string; byline?: string };
      sectionName?: string;
    }) => ({
      source: { id: "the-guardian", name: r.sectionName ? `The Guardian — ${r.sectionName}` : "The Guardian" },
      author: r.fields?.byline || null,
      title: r.webTitle,
      description: r.fields?.trailText || null,
      url: r.webUrl,
      urlToImage: r.fields?.thumbnail || null,
      publishedAt: r.webPublicationDate,
      content: null,
    })),
  };
}

// ── NewsAPI provider (original) ───────────────────────────────────────────

const NEWSAPI_BASE = "https://newsapi.org/v2";

async function newsapiFetchHeadlines(options: NewsFetchOptions): Promise<NewsResponse> {
  const apiKey = getNewsApiKey()!;
  const { category, query, country = "us", pageSize = 20 } = options;

  const params = new URLSearchParams({
    country,
    pageSize: String(pageSize),
  });

  if (category) params.set("category", category);
  if (query) params.set("q", query);

  const res = await fetch(`${NEWSAPI_BASE}/top-headlines?${params}`, {
    headers: { "X-Api-Key": apiKey },
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message || `NewsAPI error: ${res.status}`;
    console.error(`[NewsClient:NewsAPI] top-headlines failed (${res.status}):`, msg);
    if (res.status === 426) {
      throw new Error("NewsAPI free plan only works from localhost. Upgrade to a paid plan for production use, or use a proxy.");
    }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.status === "error") {
    throw new Error(data.message || "NewsAPI returned an error");
  }

  return data;
}

async function newsapiSearch(
  query: string,
  options: { sortBy?: "relevancy" | "popularity" | "publishedAt"; pageSize?: number }
): Promise<NewsResponse> {
  const apiKey = getNewsApiKey()!;
  const { sortBy = "publishedAt", pageSize = 20 } = options;

  const params = new URLSearchParams({
    q: query,
    sortBy,
    pageSize: String(pageSize),
    language: "en",
  });

  const res = await fetch(`${NEWSAPI_BASE}/everything?${params}`, {
    headers: { "X-Api-Key": apiKey },
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message || `NewsAPI error: ${res.status}`;
    console.error(`[NewsClient:NewsAPI] everything search failed (${res.status}):`, msg);
    if (res.status === 426) {
      throw new Error("NewsAPI free plan only works from localhost. Upgrade to a paid plan for production use, or use a proxy.");
    }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.status === "error") {
    throw new Error(data.message || "NewsAPI returned an error");
  }

  return data;
}

// ── Unified public API ────────────────────────────────────────────────────

export async function fetchTopHeadlines(
  options: NewsFetchOptions = {}
): Promise<NewsResponse> {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error("No news API key configured. Set GNEWS_API_KEY, GUARDIAN_API_KEY, or NEWS_API_KEY.");
  }

  switch (provider) {
    case "gnews":
      return gnewsFetchHeadlines(options);
    case "guardian":
      return guardianFetchHeadlines(options);
    case "newsapi":
      return newsapiFetchHeadlines(options);
  }
}

export async function searchNews(
  query: string,
  options: { sortBy?: "relevancy" | "popularity" | "publishedAt"; pageSize?: number } = {}
): Promise<NewsResponse> {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error("No news API key configured. Set GNEWS_API_KEY, GUARDIAN_API_KEY, or NEWS_API_KEY.");
  }

  switch (provider) {
    case "gnews":
      return gnewsSearch(query, options);
    case "guardian":
      return guardianSearch(query, options);
    case "newsapi":
      return newsapiSearch(query, options);
  }
}
