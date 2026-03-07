import { NextRequest, NextResponse } from "next/server";
import {
  fetchTopHeadlines,
  searchNews,
  NEWS_CATEGORIES,
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

  if (!process.env.NEWS_API_KEY && !process.env.NEW_API_KEY) {
    return NextResponse.json(
      {
        error: "NEWS_API_KEY not configured",
        hint: "Add NEWS_API_KEY (or NEW_API_KEY) to your .env.local file. Get one at newsapi.org",
      },
      { status: 503 }
    );
  }

  try {
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
      });
    }

    // Default: top headlines
    const result = await fetchTopHeadlines({ pageSize });
    return NextResponse.json({
      articles: result.articles.filter((a) => a.title !== "[Removed]"),
      totalResults: result.totalResults,
      category: "general",
    });
  } catch (error) {
    console.error("[News API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch news" },
      { status: 500 }
    );
  }
}
