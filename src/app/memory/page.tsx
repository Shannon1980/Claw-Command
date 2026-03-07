"use client";

import { useEffect, useState } from "react";

interface Memory {
  id: string;
  content: string;
  source: string;
  category: string;
  tags: string[];
  createdAt: string;
}

const categories = ["all", "fact", "procedure", "preference", "context"];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    source: "",
    tags: "",
    category: "fact",
  });

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (tagFilter) params.set("tag", tagFilter);
      const res = await fetch(`/api/memory?${params}`);
      if (!res.ok) throw new Error("Failed to fetch memories");
      const data = await res.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, tagFilter]);

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to add memory");
      setShowForm(false);
      setFormData({ content: "", source: "", tags: "", category: "fact" });
      fetchMemories();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/memory/${id}`, { method: "DELETE" });
      fetchMemories();
    } catch {
      // silent
    }
  };

  const allTags = [...new Set(memories.flatMap((m) => m.tags || []))];

  const filtered = memories.filter((m) =>
    search ? m.content.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Memory</h1>
            <p className="text-xs text-gray-500 font-mono">Knowledge base and stored memories</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "Add Memory"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">Add Memory</h2>
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  {categories.filter((c) => c !== "all").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Save Memory
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMemories()}
            className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                categoryFilter === c
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            <span className="text-xs text-gray-500 font-mono mr-1">Tags:</span>
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="px-2 py-0.5 text-[11px] font-mono rounded bg-red-500/20 text-red-400 border border-red-500/30"
              >
                clear
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                  tagFilter === tag
                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    : "bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Memories */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No memories found. Add one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((m) => (
              <div key={m.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-300 line-clamp-3 mb-3">{m.content}</p>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-1.5 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                    {m.source || "unknown"}
                  </span>
                  {(m.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[11px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600 font-mono">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
