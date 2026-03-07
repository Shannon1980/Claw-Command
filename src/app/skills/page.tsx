"use client";

import { useState, useEffect, useCallback } from "react";

interface Skill {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  version?: string;
  author?: string;
  node_ids?: string[];
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_OPTIONS = [
  "general",
  "automation",
  "analysis",
  "integration",
  "communication",
  "custom",
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatewayOffline, setGatewayOffline] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    category: "general",
    enabled: true,
    node_ids: "",
  });

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.status === 503) {
        setGatewayOffline(true);
        setSkills([]);
        return;
      }
      setGatewayOffline(false);
      const data = await res.json();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load skills:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    const interval = setInterval(fetchSkills, 15000);
    return () => clearInterval(interval);
  }, [fetchSkills]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setError("Please enter a skill name");
      return;
    }
    try {
      const nodeIds = createForm.node_ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || undefined,
          category: createForm.category,
          enabled: createForm.enabled,
          node_ids: nodeIds.length > 0 ? nodeIds : undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSkills((prev) => [...prev, created]);
        setShowCreateForm(false);
        setCreateForm({
          name: "",
          description: "",
          category: "general",
          enabled: true,
          node_ids: "",
        });
        setError(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to create skill");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const handleToggle = async (skill: Skill) => {
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills((prev) =>
          prev.map((s) => (s.id === skill.id ? updated : s))
        );
      }
    } catch {
      // silent
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSkill) return;
    try {
      const res = await fetch(`/api/skills/${editingSkill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSkill.name,
          description: editingSkill.description,
          category: editingSkill.category,
          enabled: editingSkill.enabled,
          node_ids: editingSkill.node_ids,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setEditingSkill(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id));
        setDeleteConfirm(null);
        if (editingSkill?.id === id) setEditingSkill(null);
      }
    } catch {
      // silent
    }
  };

  const filteredSkills = skills.filter((skill) => {
    if (filterCategory !== "all" && skill.category !== filterCategory)
      return false;
    if (filterEnabled === "enabled" && !skill.enabled) return false;
    if (filterEnabled === "disabled" && skill.enabled) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = skill.name.toLowerCase().includes(q);
      const matchDesc = skill.description?.toLowerCase().includes(q);
      const matchAuthor = skill.author?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  const enabledCount = skills.filter((s) => s.enabled).length;
  const disabledCount = skills.filter((s) => !s.enabled).length;
  const categories = [
    ...new Set(skills.map((s) => s.category).filter(Boolean)),
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">
              OPENCLAW SKILLS
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              {skills.length} skill{skills.length !== 1 ? "s" : ""} registered
              &middot; {enabledCount} enabled &middot; {disabledCount} disabled
              &middot; auto-refreshes every 15s
            </p>
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-amber-500 hover:text-amber-300 text-xs"
                >
                  dismiss
                </button>
              </div>
            )}

            <button
              onClick={() => fetchSkills()}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
            >
              {showCreateForm ? "Cancel" : "+ Add Skill"}
            </button>
          </div>
        </div>

        {/* Gateway Offline Banner */}
        {gatewayOffline && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg flex items-center gap-3">
            <svg
              className="w-5 h-5 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-300">
                OpenClaw Gateway Offline
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Cannot reach the OpenClaw gateway. Skills management requires a
                running gateway. Check that OpenClaw is running and
                OPENCLAW_URL is configured.
              </p>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">
              Register New Skill
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Skill name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="e.g. web-search, code-review, deploy..."
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    description: e.target.value,
                  })
                }
                placeholder="What does this skill do?"
                className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Assign to nodes (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={createForm.node_ids}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, node_ids: e.target.value })
                  }
                  placeholder="e.g. bob, bertha, forge"
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.enabled}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        enabled: e.target.checked,
                      })
                    }
                    className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/50"
                  />
                  <span className="text-sm text-gray-300">
                    Enable immediately
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!createForm.name.trim()}
                className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-40"
              >
                Register Skill
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        {skills.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 w-64"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-300"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {(c as string).charAt(0).toUpperCase() +
                    (c as string).slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-300"
            >
              <option value="all">All states</option>
              <option value="enabled">Enabled only</option>
              <option value="disabled">Disabled only</option>
            </select>
            {(filterCategory !== "all" ||
              filterEnabled !== "all" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setFilterCategory("all");
                  setFilterEnabled("all");
                  setSearchQuery("");
                }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear filters
              </button>
            )}
            <span className="text-xs text-gray-600 ml-auto">
              {filteredSkills.length} of {skills.length} shown
            </span>
          </div>
        )}

        {/* Content */}
        {loading && skills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading skills...</p>
          </div>
        ) : !gatewayOffline && skills.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">&#9881;</div>
            <p className="text-gray-500 text-sm mb-4">
              No skills registered yet
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-600/30 transition-colors"
            >
              Register your first skill
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={`relative group bg-gray-900/50 border rounded-lg p-4 transition-colors ${
                  skill.enabled
                    ? "border-gray-800 hover:border-gray-700"
                    : "border-gray-800/50 opacity-60 hover:opacity-80"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        skill.enabled ? "bg-green-400" : "bg-gray-600"
                      }`}
                    />
                    <h3 className="text-sm font-semibold text-gray-100">
                      {skill.name}
                    </h3>
                  </div>
                  {skill.version && (
                    <span className="text-[10px] font-mono text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">
                      v{skill.version}
                    </span>
                  )}
                </div>

                {/* Description */}
                {skill.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {skill.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {skill.category && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {skill.category}
                    </span>
                  )}
                  {skill.author && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                      by {skill.author}
                    </span>
                  )}
                  {skill.node_ids && skill.node_ids.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      {skill.node_ids.length} node
                      {skill.node_ids.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Node assignments */}
                {skill.node_ids && skill.node_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {skill.node_ids.map((nid) => (
                      <span
                        key={nid}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                      >
                        {nid}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                  <button
                    onClick={() => handleToggle(skill)}
                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                      skill.enabled
                        ? "text-green-400 bg-green-500/10 hover:bg-green-500/20"
                        : "text-gray-500 bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    {skill.enabled ? "Enabled" : "Disabled"}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingSkill({ ...skill })}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === skill.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-1.5 py-1 text-[11px] text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(skill.id)}
                        className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-600/10 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-100">
                  Edit Skill
                </h2>
                <button
                  onClick={() => setEditingSkill(null)}
                  className="text-gray-500 hover:text-gray-300 text-lg"
                >
                  &times;
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={editingSkill.description || ""}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editingSkill.category || "general"}
                    onChange={(e) =>
                      setEditingSkill({
                        ...editingSkill,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSkill.enabled}
                      onChange={(e) =>
                        setEditingSkill({
                          ...editingSkill,
                          enabled: e.target.checked,
                        })
                      }
                      className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <span className="text-sm text-gray-300">Enabled</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Assigned nodes (comma-separated)
                </label>
                <input
                  type="text"
                  value={(editingSkill.node_ids || []).join(", ")}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      node_ids: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. bob, bertha, forge"
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {skills.length > 0 && (
          <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 mb-2 font-medium">
              Skills Summary
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-400">
                  {enabledCount} enabled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <span className="text-gray-400">
                  {disabledCount} disabled
                </span>
              </div>
              {categories.length > 0 && (
                <span className="text-gray-600">|</span>
              )}
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded"
                >
                  {cat as string}:{" "}
                  {skills.filter((s) => s.category === cat).length}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
