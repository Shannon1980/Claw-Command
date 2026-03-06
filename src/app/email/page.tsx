"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CreateRuleForm({
  accounts,
  onCreated,
}: {
  accounts: EmailAccount[];
  onCreated: () => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [aiPrompt, setAiPrompt] = useState(
    "Archive newsletters and marketing. Delete obvious spam. Keep important work emails in inbox."
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/email/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          name: name.trim(),
          ai_prompt: aiPrompt.trim() || null,
          actions: [{ action: "archive" }, { action: "delete" }],
        }),
      });
      if (res.ok) {
        setName("");
        setAiPrompt("");
        onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-900/80 border border-gray-800 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100"
          required
        >
          <option value="">Select…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Rule name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Inbox triage"
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">AI instructions</label>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100"
          placeholder="How should the AI classify emails?"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg"
      >
        {submitting ? "Creating…" : "Create rule"}
      </button>
    </form>
  );
}

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  created_at: string;
}

interface EmailRule {
  id: string;
  account_id: string;
  name: string;
  enabled: boolean;
  actions: unknown[];
  ai_prompt: string | null;
}

interface EmailAction {
  id: string;
  account_id: string;
  message_id: string;
  action: string;
  status: string;
  details: string;
  created_at: string;
}

function EmailPageContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerResult, setWorkerResult] = useState<{
    processed?: number;
    actions?: number;
    errors?: string[];
  } | null>(null);
  const [actions, setActions] = useState<EmailAction[]>([]);

  const connected = searchParams.get("connected") === "1";
  const error = searchParams.get("error");

  useEffect(() => {
    fetchAccounts();
    fetchRules();
    fetchActions();
  }, []);

  async function fetchActions() {
    try {
      const res = await fetch("/api/email/actions");
      if (res.ok) setActions(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/email/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function fetchRules() {
    try {
      const res = await fetch("/api/email/rules");
      if (res.ok) setRules(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function runWorker() {
    setWorkerRunning(true);
    setWorkerResult(null);
    try {
      const res = await fetch("/api/email/worker/run", { method: "POST" });
      const data = await res.json();
      setWorkerResult(data);
    } catch (e) {
      setWorkerResult({ errors: [String(e)] });
    } finally {
      setWorkerRunning(false);
      fetchActions();
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-lg font-bold text-gray-100 mb-1">Email Automation</h1>
        <p className="text-xs text-gray-500 font-mono mb-6">
          AI-driven inbox triage: organize, archive, delete, follow-up
        </p>

        {connected && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            Gmail connected successfully.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            Error: {error}
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Accounts</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : accounts.length === 0 ? (
            <div className="p-4 rounded-lg bg-gray-900/80 border border-gray-800">
              <p className="text-gray-400 text-sm mb-3">No email accounts connected.</p>
              <a
                href="/api/email/oauth/start"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Connect Gmail
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/80 border border-gray-800"
                >
                  <span className="text-sm text-gray-200">{a.email}</span>
                  <span className="text-xs text-gray-500">{a.provider}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Rules</h2>
          {accounts.length > 0 && (
            <CreateRuleForm
              accounts={accounts}
              onCreated={() => {
                fetchRules();
              }}
            />
          )}
          {rules.length === 0 ? (
            <p className="text-gray-500 text-sm mt-3">
              No rules yet. Create one above or via API: POST /api/email/rules
            </p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="p-3 rounded-lg bg-gray-900/80 border border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">{r.name}</span>
                    <span
                      className={`text-xs ${r.enabled ? "text-green-400" : "text-gray-500"}`}
                    >
                      {r.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {r.ai_prompt && (
                    <p className="mt-1 text-xs text-gray-500 truncate">{r.ai_prompt}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent actions</h2>
          {actions.length === 0 ? (
            <p className="text-gray-500 text-sm">No actions yet.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {actions.slice(0, 10).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-900/60 border border-gray-800 text-xs"
                >
                  <span className="text-gray-400">{a.action}</span>
                  <span
                    className={
                      a.status === "completed"
                        ? "text-green-400"
                        : a.status === "failed"
                          ? "text-amber-400"
                          : "text-gray-500"
                    }
                  >
                    {a.status}
                  </span>
                  <span className="text-gray-600 font-mono">{a.created_at.slice(0, 19)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Worker</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={runWorker}
              disabled={workerRunning || accounts.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {workerRunning ? "Running…" : "Run now"}
            </button>
            <p className="text-xs text-gray-500">
              Or trigger via cron: POST /api/email/worker/run (set CRON_SECRET)
            </p>
          </div>
          {workerResult && (
            <div className="mt-3 p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-sm">
              <p className="text-gray-400">
                Processed: {workerResult.processed ?? 0} | Actions: {workerResult.actions ?? 0}
              </p>
              {workerResult.errors && workerResult.errors.length > 0 && (
                <ul className="mt-2 text-amber-400 text-xs list-disc list-inside">
                  {workerResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="mt-8 p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-2">Setup</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Google Cloud: Create OAuth credentials, enable Gmail API</li>
            <li>Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI</li>
            <li>Optional: OPENAI_API_KEY for AI classification</li>
            <li>Optional: CRON_SECRET to protect worker endpoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 p-6 text-gray-500">Loading…</div>}>
      <EmailPageContent />
    </Suspense>
  );
}
