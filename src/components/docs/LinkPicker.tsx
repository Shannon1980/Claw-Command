"use client";

import { useState, useEffect } from "react";
import type { LinkedItem } from "@/lib/mock-docs";

interface LinkPickerProps {
  linkedItems: LinkedItem[];
  onChange: (items: LinkedItem[]) => void;
}

interface SelectableItem {
  id: string;
  name: string;
}

type LinkType = "deal" | "certification" | "task";

const linkTypeConfig: Record<LinkType, { label: string; color: string; bg: string; endpoint: string; nameField: string }> = {
  deal: { label: "Deal", color: "text-emerald-400", bg: "bg-emerald-500/10", endpoint: "/api/opportunities", nameField: "title" },
  certification: { label: "Certification", color: "text-amber-400", bg: "bg-amber-500/10", endpoint: "/api/certifications", nameField: "name" },
  task: { label: "Task", color: "text-blue-400", bg: "bg-blue-500/10", endpoint: "/api/tasks", nameField: "title" },
};

export { linkTypeConfig };

export default function LinkPicker({ linkedItems, onChange }: LinkPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>("deal");
  const [available, setAvailable] = useState<SelectableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingItems(true);
    const cfg = linkTypeConfig[linkType];
    fetch(cfg.endpoint)
      .then((r) => r.json())
      .then((data) => {
        const items = (Array.isArray(data) ? data : []).map((item: Record<string, string>) => ({
          id: item.id,
          name: item[cfg.nameField] || item.title || item.name || item.id,
        }));
        setAvailable(items);
      })
      .catch(() => setAvailable([]))
      .finally(() => setLoadingItems(false));
  }, [isOpen, linkType]);

  const filteredAvailable = available.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return !linkedItems.some((li) => li.id === item.id && li.type === linkType);
  });

  const addItem = (item: SelectableItem) => {
    onChange([...linkedItems, { type: linkType, id: item.id, name: item.name }]);
  };

  const removeItem = (index: number) => {
    onChange(linkedItems.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Existing linked items */}
      {linkedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedItems.map((item, i) => {
            const cfg = linkTypeConfig[item.type as LinkType];
            return (
              <span
                key={`${item.type}-${item.id}`}
                className={`${cfg.bg} ${cfg.color} px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1`}
              >
                {cfg.label}: {item.name}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="ml-0.5 hover:text-white transition-colors"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Toggle picker */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          + Link to deal, certification, or task
        </button>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            {(Object.keys(linkTypeConfig) as LinkType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setLinkType(t); setSearch(""); }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  linkType === t
                    ? `${linkTypeConfig[t].bg} ${linkTypeConfig[t].color}`
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {linkTypeConfig[t].label}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSearch(""); }}
              className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
            >
              Close
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${linkTypeConfig[linkType].label.toLowerCase()}s...`}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />

          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {loadingItems ? (
              <p className="text-xs text-gray-500 py-2 text-center">Loading...</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="text-xs text-gray-500 py-2 text-center">
                {available.length === 0 ? `No ${linkTypeConfig[linkType].label.toLowerCase()}s found` : "All items already linked"}
              </p>
            ) : (
              filteredAvailable.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors truncate"
                >
                  {item.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
