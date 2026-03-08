"use client";

import { useState } from "react";
import { useNewsBrief } from "@/lib/hooks/useNewsBrief";
import type {
  NewsItem,
  PodcastItem,
  YouTubeItem,
  RedditNewsItem,
  HackerNewsItem,
  DailyNewsBriefData,
} from "@/lib/hooks/useNewsBrief";
import { useWeather, getWeatherEmoji } from "@/lib/hooks/useWeather";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Section Components ──────────────────────────────────────────────────

function WeatherSummaryCard() {
  const { weather, loading } = useWeather();

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="text-gray-500 text-sm animate-pulse">Loading weather...</div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="text-2xl mb-1">{"\uD83C\uDF24\uFE0F"}</div>
        <div className="text-xs text-gray-500">Burtonsville, MD</div>
        <div className="text-sm text-gray-500">Weather unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-2xl mb-1">{getWeatherEmoji(weather.icon)}</div>
      <div className="text-xs text-gray-500">Burtonsville, MD</div>
      <div className="text-2xl font-bold text-gray-100">{weather.temperature}&deg;F</div>
      <div className="text-[10px] text-gray-500 mt-0.5">
        {weather.description} &middot; H:{weather.high}&deg; L:{weather.low}&deg;
      </div>
    </div>
  );
}

function SummaryCards({ brief }: { brief: DailyNewsBriefData["briefSummary"] }) {
  if (!brief?.summary) return null;
  const { tasksCompleted, newAlerts, pendingApprovals } = brief.summary;

  const cards = [
    { icon: "✅", label: "Tasks Completed", value: tasksCompleted, color: "green" },
    { icon: "🔔", label: "New Alerts", value: newAlerts, color: "amber" },
    { icon: "📋", label: "Pending Approvals", value: pendingApprovals, color: "blue" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      <WeatherSummaryCard />
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-gray-900 border border-gray-800 rounded-lg p-4"
        >
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-xs text-gray-500">{c.label}</div>
          <div className="text-2xl font-bold text-gray-100">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function PrioritySection({
  priorities,
}: {
  priorities: NonNullable<DailyNewsBriefData["briefSummary"]>["priorities"];
}) {
  if (!priorities || priorities.length === 0) return null;

  const urgencyColors: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: "bg-red-900/20", border: "border-red-500", text: "text-red-400" },
    high: { bg: "bg-orange-900/20", border: "border-orange-500", text: "text-orange-400" },
    medium: { bg: "bg-yellow-900/20", border: "border-yellow-500", text: "text-yellow-400" },
  };

  return (
    <div className="space-y-2">
      {priorities.slice(0, 5).map((p, i) => {
        const cfg = urgencyColors[p.urgency] || urgencyColors.medium;
        return (
          <div
            key={p.id}
            className={`${cfg.bg} border-l-4 ${cfg.border} rounded px-4 py-3`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-bold ${cfg.text}`}>
                {i + 1}. {p.urgency.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">{p.domain}</span>
            </div>
            <p className="text-sm text-gray-200">{p.title}</p>
            {p.dueDate && (
              <p className="text-xs text-gray-500 mt-0.5">
                Due {new Date(p.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StandupSection({
  standup,
}: {
  standup: DailyNewsBriefData["standupSummary"];
}) {
  if (!standup) return null;

  const sections = [
    { key: "completed", label: "Completed", items: standup.completed || [], color: "green" },
    { key: "started", label: "In Progress", items: standup.started || [], color: "blue" },
    { key: "blocked", label: "Blocked", items: standup.blocked || [], color: "amber" },
  ];

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.key}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full bg-${s.color}-500`} />
            <span className={`text-xs font-medium text-${s.color}-400`}>
              {s.label}
            </span>
            <span className="text-xs text-gray-600">({s.items.length})</span>
          </div>
          {s.items.length === 0 ? (
            <p className="text-xs text-gray-600 pl-4">None</p>
          ) : (
            <ul className="space-y-1 pl-4">
              {s.items.slice(0, 5).map((item) => (
                <li key={item.id} className="text-sm text-gray-300">
                  {item.title}
                </li>
              ))}
              {s.items.length > 5 && (
                <li className="text-xs text-gray-500">
                  +{s.items.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function SkywardSection({
  skyward,
}: {
  skyward: DailyNewsBriefData["skywardSummary"];
}) {
  if (!skyward) return null;

  const statusColors: Record<string, string> = {
    on_track: "text-green-400",
    at_risk: "text-amber-400",
    blocked: "text-red-400",
  };

  return (
    <div className="space-y-3">
      {skyward.workstreams?.slice(0, 5).map((ws) => (
        <div
          key={ws.id}
          className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded px-3 py-2"
        >
          <div>
            <span className="text-sm text-gray-200">{ws.name}</span>
            <p className="text-xs text-gray-500 mt-0.5">{ws.description}</p>
          </div>
          <span
            className={`text-xs font-medium ${statusColors[ws.status] || "text-gray-400"}`}
          >
            {ws.status.replace("_", " ")}
          </span>
        </div>
      ))}
      {skyward.actionItemsForShannon?.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-amber-400 font-medium mb-1">
            Action Items for You ({skyward.actionItemsForShannon.length})
          </p>
          {skyward.actionItemsForShannon.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="text-sm text-gray-300 pl-3 border-l-2 border-amber-500/30 mb-1"
            >
              {item.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex">
        {item.urlToImage && (
          <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-28">
            <img
              src={item.urlToImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-200 hover:text-blue-400 transition-colors line-clamp-2"
                >
                  {item.title}
                </a>
              ) : (
                <span className="text-sm font-medium text-gray-200 line-clamp-2">
                  {item.title}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
            </div>
            <span className="text-[10px] text-gray-600 font-mono shrink-0">
              {item.source}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {item.publishedAt && (
              <span className="text-[10px] text-gray-500">
                {new Date(item.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Read full article
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PodcastCard({ item }: { item: PodcastItem }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-200 hover:text-purple-400 transition-colors"
            >
              {item.title}
            </a>
          ) : (
            <span className="text-sm font-medium text-gray-200">
              {item.title}
            </span>
          )}
          <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-600 font-mono block">
            {item.show}
          </span>
          {item.duration && (
            <span className="text-[10px] text-gray-600 font-mono">
              {item.duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function YouTubeCard({ item }: { item: YouTubeItem }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-200 hover:text-red-400 transition-colors"
            >
              {item.title}
            </a>
          ) : (
            <span className="text-sm font-medium text-gray-200">
              {item.title}
            </span>
          )}
          <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-600 font-mono block">
            {item.channel}
          </span>
          {item.duration && (
            <span className="text-[10px] text-gray-600 font-mono">
              {item.duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RedditCard({ item }: { item: RedditNewsItem }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex">
        {item.thumbnail && (
          <div className="shrink-0 w-20 h-20">
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-200 hover:text-orange-400 transition-colors line-clamp-2"
              >
                {item.title}
              </a>
              {item.summary && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-orange-400/70 font-mono block">
                {item.source}
              </span>
              {item.flair && (
                <span className="text-[10px] text-gray-500 bg-gray-800 px-1 py-0.5 rounded mt-0.5 inline-block">
                  {item.flair}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-mono">
            <span>{item.score} pts</span>
            <a
              href={item.commentsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors"
            >
              {item.commentCount} comments
            </a>
            <span>u/{item.author}</span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HackerNewsCard({ item }: { item: HackerNewsItem }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-200 hover:text-orange-400 transition-colors line-clamp-2"
          >
            {item.title}
          </a>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 font-mono">
            <span className="text-orange-400/70">{item.score} pts</span>
            <a
              href={item.commentsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors"
            >
              {item.commentCount} comments
            </a>
            <span>{item.author}</span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainSummary({
  domains,
}: {
  domains: NonNullable<DailyNewsBriefData["briefSummary"]>["domains"];
}) {
  if (!domains || domains.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {domains.map((d) => (
        <div
          key={d.name}
          className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{d.icon}</span>
            <span className="text-sm font-medium text-gray-200">{d.name}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {d.activeTasks} tasks
            </span>
          </div>
          {d.blockers.length > 0 && (
            <div className="mb-2">
              {d.blockers.map((b, i) => (
                <p key={i} className="text-xs text-red-400">
                  Blocked: {b}
                </p>
              ))}
            </div>
          )}
          {d.keyUpdates.length > 0 && (
            <ul className="space-y-0.5">
              {d.keyUpdates.slice(0, 3).map((u, i) => (
                <li key={i} className="text-xs text-gray-400">
                  {u}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Collapsible Section Wrapper ─────────────────────────────────────────

function Section({
  title,
  icon,
  badge,
  defaultOpen = true,
  priority,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  priority?: "high" | "medium" | "low";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const priorityBadge =
    priority === "high"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : priority === "low"
        ? "bg-gray-800 text-gray-500 border-gray-700"
        : "";

  return (
    <div className="bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors"
      >
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-gray-200 flex-1 text-left">
          {title}
        </span>
        {badge && (
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded font-mono">
            {badge}
          </span>
        )}
        {priority && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityBadge}`}
          >
            {priority}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && <div className="px-5 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function DailyNewsBriefPage() {
  const [date, setDate] = useState(todayString());
  const { data, loading, error, refresh, generate, generating } =
    useNewsBrief(date);

  const isToday = date === todayString();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1000px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">
                {isToday ? "Good morning, Shannon" : "Daily News Brief"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{formatDate(date)}</p>
              {data.live && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Live - auto-aggregated
                </span>
              )}
              {!data.live && data.generatedAt && (
                <p className="text-[10px] text-gray-600 font-mono mt-1">
                  Generated {relativeTime(data.generatedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-300 focus:ring-1 focus:ring-blue-500/50"
              />
              <button
                onClick={refresh}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={generate}
                disabled={generating}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Brief"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
              Loading your daily brief...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Operations Summary (from Brief) ── */}
            {data.briefSummary && (
              <>
                <SummaryCards brief={data.briefSummary} />

                <Section
                  title="What Needs Your Attention"
                  icon="⚡"
                  badge={`${data.briefSummary.priorities?.length || 0} items`}
                  priority="high"
                >
                  <PrioritySection priorities={data.briefSummary.priorities} />
                </Section>
              </>
            )}

            {/* ── Standup (from Standup) ── */}
            <Section
              title="Agent Standup"
              icon="🤖"
              badge={
                data.standupSummary
                  ? `${data.standupSummary.activityCount} activities`
                  : undefined
              }
              priority="high"
            >
              <StandupSection standup={data.standupSummary} />
            </Section>

            {/* ── Skyward (from Skyward) ── */}
            <Section
              title="Skyward IT Solutions"
              icon="🌤️"
              badge={
                data.skywardSummary
                  ? `${data.skywardSummary.workstreams?.length || 0} workstreams`
                  : undefined
              }
              priority="high"
            >
              <SkywardSection skyward={data.skywardSummary} />
            </Section>

            {/* ── Domain Overview (from Brief) ── */}
            {data.briefSummary?.domains && (
              <Section title="Domain Status" icon="📊" priority="medium">
                <DomainSummary domains={data.briefSummary.domains} />
              </Section>
            )}

            {/* ── AI News ── */}
            <Section
              title="AI News"
              icon="🧠"
              badge={`${data.aiNews.length} items`}
              priority="high"
            >
              {data.aiNews.length === 0 ? (
                <p className="text-xs text-gray-500">No AI news available</p>
              ) : (
                <div className="space-y-2">
                  {data.aiNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Reddit ── */}
            <Section
              title="Reddit"
              icon="🔴"
              badge={`${data.redditNews?.length || 0} posts`}
              priority="medium"
            >
              {!data.redditNews?.length ? (
                <p className="text-xs text-gray-500">No Reddit posts available</p>
              ) : (
                <div className="space-y-2">
                  {data.redditNews.map((item, i) => (
                    <RedditCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Hacker News ── */}
            <Section
              title="Hacker News"
              icon="🟠"
              badge={`${data.hackerNews?.length || 0} stories`}
              priority="medium"
            >
              {!data.hackerNews?.length ? (
                <p className="text-xs text-gray-500">No Hacker News stories available</p>
              ) : (
                <div className="space-y-2">
                  {data.hackerNews.map((item, i) => (
                    <HackerNewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Technology News ── */}
            <Section
              title="Technology"
              icon="💻"
              badge={`${data.technologyNews?.length || 0} items`}
              priority="high"
            >
              {!data.technologyNews?.length ? (
                <p className="text-xs text-gray-500">No technology news available</p>
              ) : (
                <div className="space-y-2">
                  {data.technologyNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Business News ── */}
            <Section
              title="Business"
              icon="📈"
              badge={`${data.businessNews?.length || 0} items`}
              priority="medium"
            >
              {!data.businessNews?.length ? (
                <p className="text-xs text-gray-500">No business news available</p>
              ) : (
                <div className="space-y-2">
                  {data.businessNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Entertainment News ── */}
            <Section
              title="Entertainment"
              icon="🎬"
              badge={`${data.entertainmentNews?.length || 0} items`}
              defaultOpen={false}
              priority="medium"
            >
              {!data.entertainmentNews?.length ? (
                <p className="text-xs text-gray-500">No entertainment news available</p>
              ) : (
                <div className="space-y-2">
                  {data.entertainmentNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Health News ── */}
            <Section
              title="Health"
              icon="🏥"
              badge={`${data.healthNews?.length || 0} items`}
              defaultOpen={false}
              priority="medium"
            >
              {!data.healthNews?.length ? (
                <p className="text-xs text-gray-500">No health news available</p>
              ) : (
                <div className="space-y-2">
                  {data.healthNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Top Headlines ── */}
            <Section
              title="Top Headlines"
              icon="🌍"
              badge={`${data.worldNews.length} items`}
              defaultOpen={false}
            >
              {data.worldNews.length === 0 ? (
                <p className="text-xs text-gray-500">No headlines available</p>
              ) : (
                <div className="space-y-2">
                  {data.worldNews.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── AI Podcasts ── */}
            <Section
              title="AI Podcasts"
              icon="🎙️"
              badge={`${data.aiPodcasts.length} episodes`}
              defaultOpen={false}
            >
              {data.aiPodcasts.length === 0 ? (
                <p className="text-xs text-gray-500">No new episodes</p>
              ) : (
                <div className="space-y-2">
                  {data.aiPodcasts.map((item, i) => (
                    <PodcastCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── AI YouTube ── */}
            <Section
              title="AI YouTube"
              icon="📺"
              badge={`${data.aiYouTube.length} videos`}
              defaultOpen={false}
            >
              {data.aiYouTube.length === 0 ? (
                <p className="text-xs text-gray-500">No new videos</p>
              ) : (
                <div className="space-y-2">
                  {data.aiYouTube.map((item, i) => (
                    <YouTubeCard key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Status indicator ── */}
            {data.newsErrors && data.newsErrors.length > 0 && (
              <div className="mt-4 bg-red-900/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-xs text-red-400 font-medium mb-2">Some news feeds failed to load:</p>
                <ul className="space-y-1">
                  {data.newsErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-300/70 font-mono">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.newsApiConfigured === false && (
              <div className="mt-4 bg-gray-900/30 border border-dashed border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  <span className="text-amber-400 font-medium">No news API key detected.</span>{" "}
                  Add <span className="font-mono text-gray-400">GNEWS_API_KEY</span>,{" "}
                  <span className="font-mono text-gray-400">GUARDIAN_API_KEY</span>, or{" "}
                  <span className="font-mono text-gray-400">NEWS_API_KEY</span> to{" "}
                  <span className="font-mono text-gray-400">.env.local</span> to see live news.
                </p>
              </div>
            )}

            {data.newsApiConfigured && (
              <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Powered by {data.newsProvider === "gnews" ? "GNews" : data.newsProvider === "guardian" ? "The Guardian" : "NewsAPI"} + Reddit + Hacker News — refreshes every 15 minutes
              </div>
            )}

            {!data.newsApiConfigured && (data.redditNews?.length > 0 || data.hackerNews?.length > 0) && (
              <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Reddit + Hacker News (no API key needed) — refreshes every 15 minutes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
