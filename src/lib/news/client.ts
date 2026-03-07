const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2";

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

export async function fetchTopHeadlines(
  options: NewsFetchOptions = {}
): Promise<NewsResponse> {
  if (!NEWS_API_KEY) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  const {
    category,
    query,
    country = "us",
    pageSize = 20,
  } = options;

  const params = new URLSearchParams({
    apiKey: NEWS_API_KEY,
    country,
    pageSize: String(pageSize),
  });

  if (category) params.set("category", category);
  if (query) params.set("q", query);

  const res = await fetch(`${BASE_URL}/top-headlines?${params}`, {
    next: { revalidate: 900 }, // cache 15 minutes
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `NewsAPI error: ${res.status}`);
  }

  return res.json();
}

export async function searchNews(
  query: string,
  options: { sortBy?: "relevancy" | "popularity" | "publishedAt"; pageSize?: number } = {}
): Promise<NewsResponse> {
  if (!NEWS_API_KEY) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  const { sortBy = "publishedAt", pageSize = 20 } = options;

  const params = new URLSearchParams({
    apiKey: NEWS_API_KEY,
    q: query,
    sortBy,
    pageSize: String(pageSize),
    language: "en",
  });

  const res = await fetch(`${BASE_URL}/everything?${params}`, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `NewsAPI error: ${res.status}`);
  }

  return res.json();
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
