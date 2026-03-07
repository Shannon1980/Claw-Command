"use client";

import { useState, useEffect, useCallback } from "react";

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary: string;
  category: string;
  publishedAt: string;
}

export interface PodcastItem {
  title: string;
  show: string;
  url: string;
  summary: string;
  duration: string;
  publishedAt: string;
}

export interface YouTubeItem {
  title: string;
  channel: string;
  url: string;
  summary: string;
  duration: string;
  publishedAt: string;
}

export interface DailyNewsBriefData {
  id: string | null;
  date: string;
  aiNews: NewsItem[];
  aiPodcasts: PodcastItem[];
  aiYouTube: YouTubeItem[];
  worldNews: NewsItem[];
  usNews: NewsItem[];
  localNews: NewsItem[];
  technologyNews: NewsItem[];
  businessNews: NewsItem[];
  scienceNews: NewsItem[];
  healthNews: NewsItem[];
  standupSummary: {
    date: string;
    completed: Array<{ id: string; title: string }>;
    started: Array<{ id: string; title: string }>;
    blocked: Array<{ id: string; title: string }>;
    activityCount: number;
  } | null;
  briefSummary: {
    summary: { tasksCompleted: number; newAlerts: number; pendingApprovals: number };
    domains: Array<{ name: string; icon: string; activeTasks: number; blockers: string[]; keyUpdates: string[] }>;
    priorities: Array<{ id: string; title: string; domain: string; urgency: string; dueDate?: string }>;
  } | null;
  skywardSummary: {
    workstreams: Array<{ id: string; name: string; status: string; description: string }>;
    actionItemsForShannon: Array<{ id: string; title: string; status: string }>;
    keyUpdates: Array<{ id: string; content: string; timestamp: string }>;
  } | null;
  generatedAt: string;
  live?: boolean;
  newsApiConfigured?: boolean;
}

const EMPTY_DATA: DailyNewsBriefData = {
  id: null,
  date: new Date().toISOString().slice(0, 10),
  aiNews: [],
  aiPodcasts: [],
  aiYouTube: [],
  worldNews: [],
  usNews: [],
  localNews: [],
  technologyNews: [],
  businessNews: [],
  scienceNews: [],
  healthNews: [],
  standupSummary: null,
  briefSummary: null,
  skywardSummary: null,
  generatedAt: new Date().toISOString(),
};

export function useNewsBrief(date?: string) {
  const [data, setData] = useState<DailyNewsBriefData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = date
        ? `/api/daily-news-brief?date=${encodeURIComponent(date)}`
        : "/api/daily-news-brief";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch daily news brief");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/daily-news-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date || new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error("Failed to generate brief");
      await fetchBrief();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }, [date, fetchBrief]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  return { data, loading, error, refresh: fetchBrief, generate, generating };
}
