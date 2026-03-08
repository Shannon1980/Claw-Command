import { NextRequest, NextResponse } from "next/server";
import {
  fetchTopHeadlines,
  searchNews,
  NEWS_CATEGORIES,
  isNewsConfigured,
  getConfiguredProvider,
  type NewsCategory,
} from "@/lib/news/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") as NewsCategory | null;
  const query = searchParams.get("q");
  const pageSize = Math.min(
    parseInt(searchParams.get("pageSize") || "20", 10),
    50
  );

  if (!isNewsConfigured()) {
    return NextResponse.json(
      {
        error: "No news API configured",
        hint: "Add one of GNEWS_API_KEY (gnews.io), GUARDIAN_API_KEY (theguardian.com), or NEWS_API_KEY (newsapi.org) to your .env.local file.",
      },
      { status: 503 }
    );
  }

  try {
    const provider = getConfiguredProvider();

    if (query) {
      const sortBy =
        (searchParams.get("sortBy") as
          | "relevancy"
          | "popularity"
          | "publishedAt") || "publishedAt";
      const result = await searchNews(query, { sortBy, pageSize });
      return NextResponse.json({
        articles: result.articles.filter((a) => a.title !== "[Removed]"),
        totalResults: result.totalResults,
        query,
        sortBy,
        provider,
      });
    }

    if (
      category &&
      NEWS_CATEGORIES.includes(category)
    ) {
      const result = await fetchTopHeadlines({ category, pageSize });
      return NextResponse.json({
        articles: result.articles.filter((a) => a.title !== "[Removed]"),
        totalResults: result.totalResults,
        category,
        provider,
      });
    }

    // Default: top headlines
    const result = await fetchTopHeadlines({ pageSize });
    return NextResponse.json({
      articles: result.articles.filter((a) => a.title !== "[Removed]"),
      totalResults: result.totalResults,
      category: "general",
      provider,
    });
  } catch (error) {
    console.error("[News API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch news" },
      { status: 500 }
    );
  }
}
