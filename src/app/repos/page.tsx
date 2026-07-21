'use client';

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

type IndexStatus = "pending" | "running" | "complete" | "failed";

type Repo = {
  id: string;
  name: string;
  owner: string;
  private: boolean;
  language: string | null;
  status: IndexStatus;
  chunksCount: number;
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  Python: "#3572A5",
  "C++": "#f34b7d",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  Makefile: "#427819",
};

const STATUS_META: Record<IndexStatus, { label: string; color: string }> = {
  complete: { label: "indexed", color: "#5fd4a0" },
  running: { label: "indexing…", color: "#d4a72c" },
  pending: { label: "not indexed", color: "#7b8794" },
  failed: { label: "failed", color: "#e5534b" },
};

function LangDot({ language }: { language: string | null }) {
  const color = (language && LANG_COLORS[language]) || "#6e7681";
  return (
    <span
      style={{ background: color, width: 8, height: 8, borderRadius: 999, display: "inline-block", flexShrink: 0 }}
    />
  );
}

function StatusPill({ status }: { status: IndexStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const pulsing = status === "running";
  return (
    <span
      className="status-pill"
      style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}14` }}
    >
      <span
        className={pulsing ? "pulse-dot" : ""}
        style={{ background: meta.color, width: 6, height: 6, borderRadius: 999, display: "inline-block" }}
      />
      {meta.label}
    </span>
  );
}

function RepoCard({ repo }: { repo: Repo }) {
  const queryClient = useQueryClient();

  const reindex = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId: repo.id }),
      });
      if (!res.ok) throw new Error("Failed to trigger reindex");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
    },
  });

  const isRunning = repo.status === "running" || reindex.isPending;

  return (
    <div className="repo-card">
      <div className="repo-card-top">
        <div className="repo-path">
          <span className="repo-owner">{repo.owner}/</span>
          <span className="repo-name">{repo.name}</span>
        </div>
        {repo.private && <span className="private-tag">private</span>}
      </div>

      <div className="repo-meta">
        <span className="lang-tag">
          <LangDot language={repo.language} />
          {repo.language ?? "unknown"}
        </span>
        <StatusPill status={repo.status} />
      </div>

      <div className="repo-card-bottom">
        <span className="chunks-count">
          {repo.chunksCount > 0 ? `${repo.chunksCount.toLocaleString()} chunks` : "—"}
        </span>
        <Button
          variant="outline"
          size="xs"
          disabled={isRunning}
          onClick={() => reindex.mutate()}
        >
          {repo.status === "failed" ? "retry" : "reindex"}
        </Button>
      </div>
    </div>
  );
}

export default function ReposPage() {
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to load repos");
      return res.json() as Promise<{ repos: Repo[] }>;
    },
    // indexing now runs automatically in the background on the server,
    // so poll for status changes instead of waiting on a button click
    refetchInterval: (query) => {
      const repos = query.state.data?.repos ?? [];
      const anyInProgress = repos.some((r) => r.status === "pending" || r.status === "running");
      return anyInProgress ? 3000 : false;
    },
  });

  const repos = data?.repos ?? [];

  const filtered = useMemo(() => {
    if (!query.trim()) return repos;
    const q = query.toLowerCase();
    return repos.filter(
      (r) => r.name.toLowerCase().includes(q) || r.language?.toLowerCase().includes(q)
    );
  }, [repos, query]);

  const stats = useMemo(() => {
    const indexed = repos.filter((r) => r.status === "complete").length;
    const priv = repos.filter((r) => r.private).length;
    return { total: repos.length, indexed, priv };
  }, [repos]);

  if (isLoading) return <div className="repos-root"><LoadingStyles />loading repos…</div>;
  if (error) return <div className="repos-root"><LoadingStyles />something went wrong loading your repos.</div>;

  return (
    <div className="repos-root">
      <RootStyles />

      <div className="term-header">
        <div className="prompt-line">
          <span className="prompt-arrow">$</span>
          <span className="prompt-cmd">ls repos</span>
          <span className="cursor" />
        </div>
        <div className="term-stats">
          <div className="stat-block">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">repositories</div>
          </div>
          <div className="stat-block">
            <div className="stat-num" style={{ color: "#5fd4a0" }}>{stats.indexed}</div>
            <div className="stat-label">indexed</div>
          </div>
          <div className="stat-block">
            <div className="stat-num">{stats.priv}</div>
            <div className="stat-label">private</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="grep repos or language..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">no matches — try a different query</div>
      ) : (
        <div className="repo-grid">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingStyles() {
  return <RootStyles />;
}

function RootStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

      .repos-root {
        --bg: #ffffff;
        --surface: #f6f7f8;
        --surface-hover: #eceef0;
        --border: #dfe2e6;
        --text: #1a2029;
        --text-muted: #6b7280;
        --accent: #0f9d68;

        background: var(--bg);
        color: var(--text);
        font-family: 'Inter', sans-serif;
        min-height: 100vh;
        padding: 40px 32px 64px;
        box-sizing: border-box;
      }

      .repos-root * { box-sizing: border-box; }

      .term-header {
        font-family: 'JetBrains Mono', monospace;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 18px 22px;
        margin-bottom: 28px;
      }

      .prompt-line { color: var(--text-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }
      .prompt-arrow { color: var(--accent); }
      .prompt-cmd { color: var(--text); }

      .cursor {
        display: inline-block;
        width: 7px;
        height: 14px;
        background: var(--accent);
        animation: blink 1.1s steps(1) infinite;
        margin-left: 2px;
      }
      @keyframes blink { 50% { opacity: 0; } }

      .term-stats {
        display: flex;
        gap: 28px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }

      .stat-block { font-family: 'JetBrains Mono', monospace; }
      .stat-num { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
      .stat-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.03em; text-transform: lowercase; }

      .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }

      .search-input {
        flex: 1;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text);
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 6px;
        outline: none;
        transition: border-color 0.15s ease;
      }
      .search-input::placeholder { color: var(--text-muted); }
      .search-input:focus { border-color: var(--accent); }

      .repo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
      }

      .repo-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .repo-card:hover { border-color: #3a4557; background: var(--surface-hover); }

      .repo-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .repo-path { font-family: 'JetBrains Mono', monospace; font-size: 13.5px; word-break: break-word; }
      .repo-owner { color: var(--text-muted); }
      .repo-name { color: var(--text); font-weight: 600; }

      .private-tag {
        font-size: 10px;
        color: var(--text-muted);
        border: 1px solid var(--border);
        padding: 2px 6px;
        border-radius: 4px;
        flex-shrink: 0;
        letter-spacing: 0.02em;
      }

      .repo-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
      .lang-tag { display: flex; align-items: center; gap: 6px; }

      .status-pill {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        border: 1px solid;
        padding: 3px 8px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .pulse-dot { animation: pulse 1s ease-in-out infinite; }
      @keyframes pulse { 50% { opacity: 0.3; } }

      .repo-card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid var(--border);
      }

      .chunks-count { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--text-muted); }

      .empty-state {
        font-family: 'JetBrains Mono', monospace;
        color: var(--text-muted);
        font-size: 13px;
        padding: 40px 0;
        text-align: center;
      }
    `}</style>
  );
}
