'use client';

import { useState, useMemo, useEffect } from "react";
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

type SearchHit = {
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  similarity: number;
};

// Shared root shell — light "terminal" surface, independent of the app's
// neutral theme tokens, so it stays light regardless of dark mode.
const ROOT = "min-h-screen bg-white px-8 pt-10 pb-16 font-inter text-[#1a2029]";

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
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

function StatusPill({ status }: { status: IndexStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const pulsing = status === "running";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-jetbrains-mono text-[11px]"
      style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}14` }}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full${pulsing ? " animate-pulse" : ""}`}
        style={{ background: meta.color }}
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

    onMutate: () => {
      queryClient.setQueryData(["repos"], (old: { repos: Repo[] } | undefined) => {
        if (!old) return old;
        return {
          repos: old.repos.map((r) =>
            r.id === repo.id ? { ...r, status: "running" as IndexStatus } : r
          ),
        };
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos-status"] });
    },
  });

  const isRunning = repo.status === "running" || reindex.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-[8px] border border-[#dfe2e6] bg-[#f6f7f8] p-4 transition-colors hover:border-[#3a4557] hover:bg-[#eceef0]">
      <div className="flex items-start justify-between gap-2">
        <div className="font-jetbrains-mono text-[13.5px] break-words">
          <span className="text-[#6b7280]">{repo.owner}/</span>
          <span className="font-semibold text-[#1a2029]">{repo.name}</span>
        </div>
        {repo.private && (
          <span className="shrink-0 rounded-[4px] border border-[#dfe2e6] px-1.5 py-0.5 text-[10px] tracking-[0.02em] text-[#6b7280]">
            private
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-[12px] text-[#6b7280]">
        <span className="flex items-center gap-1.5">
          <LangDot language={repo.language} />
          {repo.language ?? "unknown"}
        </span>
        <StatusPill status={repo.status} />
      </div>

      <div className="flex items-center justify-between border-t border-[#dfe2e6] pt-2.5">
        <span className="font-jetbrains-mono text-[11.5px] text-[#6b7280]">
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

function ResultCard({ hit }: { hit: SearchHit }) {
  const pct = Math.round(hit.similarity * 100);
  const slash = hit.repoId.indexOf("/");
  const owner = slash === -1 ? "" : hit.repoId.slice(0, slash + 1);
  const name = slash === -1 ? hit.repoId : hit.repoId.slice(slash + 1);

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#dfe2e6] bg-[#f6f7f8] transition-colors hover:border-[#3a4557]">
      <div className="flex items-center justify-between gap-3 border-b border-[#dfe2e6] px-3.5 py-2.5 font-jetbrains-mono text-[12px]">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-[#6b7280]">{owner}</span>
          <span className="font-semibold text-[#1a2029]">{name}</span>
          <span className="mx-1.5 text-[#6b7280]">·</span>
          <span className="text-[#1a2029]">{hit.filePath}</span>
          <span className="text-[#6b7280]">:{hit.startLine}-{hit.endLine}</span>
        </span>
        <span className="shrink-0 rounded-full border border-[#0f9d6840] bg-[#0f9d6814] px-[7px] py-0.5 font-jetbrains-mono text-[11px] text-[#0f9d68]">
          {pct}%
        </span>
      </div>
      <pre className="m-0 max-h-80 overflow-auto bg-white px-3.5 py-3 font-jetbrains-mono text-[12.5px] leading-[1.55] whitespace-pre text-[#1a2029] [tab-size:2]">
        <code>{hit.code}</code>
      </pre>
    </div>
  );
}

export default function ReposPage() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [scopeRepoId, setScopeRepoId] = useState(""); // "" = all repos

  const search = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scopeRepoId ? { query: q, repoId: scopeRepoId } : { query: q }),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ results: SearchHit[] }>;
    },
  });

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    search.mutate(q);
  };

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to load repos");
      return res.json() as Promise<{ repos: Repo[] }>;
    },
  });

  const statusQuery = useQuery({
    queryKey: ["repos-status"],
    queryFn: async () => {
      const res = await fetch("/api/repos/status");
      if (!res.ok) throw new Error("Failed to load status");
      return res.json() as Promise<{ repos: { id: string; status: IndexStatus; chunksCount: number }[] }>;
    },
    refetchInterval: () => {
      if (!data) return 3000;
      const anyInProgress = data.repos.some((r) => r.status === "pending" || r.status === "running");
      return anyInProgress ? 3000 : false;
    },
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!statusQuery.data) return;
    queryClient.setQueryData(["repos"], (old: { repos: Repo[] } | undefined) => {
      if (!old) return old;
      const byId = new Map(statusQuery.data.repos.map((s) => [s.id, s]));
      return {
        repos: old.repos.map((r) => ({ ...r, ...(byId.get(r.id) ?? {}) })),
      };
    });
  }, [statusQuery.data, queryClient]);

  const repos = useMemo(() => data?.repos ?? [], [data]);

  const indexedRepos = useMemo(
    () => repos.filter((r) => r.status === "complete"),
    [repos],
  );

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

  if (isLoading) return <div className={ROOT}>Loading Repositories...</div>;
  if (error) return <div className={ROOT}>something went wrong loading your repos.</div>;

  return (
    <div className={ROOT}>
      <div className="mb-7 rounded-[8px] border border-[#dfe2e6] bg-[#f6f7f8] px-[22px] py-[18px] font-jetbrains-mono">
        <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">
          <span className="text-[#0f9d68]">$</span>
          <span className="text-[#1a2029]">ls repos</span>
          <span className="ml-0.5 inline-block h-3.5 w-[7px] bg-[#0f9d68] animate-[blink_1.1s_steps(1)_infinite]" />
        </div>
        <div className="mt-3.5 flex gap-7 border-t border-[#dfe2e6] pt-3.5">
          <div className="font-jetbrains-mono">
            <div className="text-[22px] font-bold leading-none text-[#1a2029]">{stats.total}</div>
            <div className="mt-1 text-[11px] tracking-[0.03em] lowercase text-[#6b7280]">repositories</div>
          </div>
          <div className="font-jetbrains-mono">
            <div className="text-[22px] font-bold leading-none text-[#5fd4a0]">{stats.indexed}</div>
            <div className="mt-1 text-[11px] tracking-[0.03em] lowercase text-[#6b7280]">indexed</div>
          </div>
          <div className="font-jetbrains-mono">
            <div className="text-[22px] font-bold leading-none text-[#1a2029]">{stats.priv}</div>
            <div className="mt-1 text-[11px] tracking-[0.03em] lowercase text-[#6b7280]">private</div>
          </div>
        </div>
      </div>

      <form
        onSubmit={runSearch}
        className="mb-6 flex items-center gap-2.5 rounded-[10px] border border-[#dfe2e6] bg-[#f6f7f8] py-1.5 pr-1.5 pl-4 transition focus-within:border-[#0f9d68] focus-within:shadow-[0_0_0_3px_#0f9d6822]"
      >
        <span className="font-jetbrains-mono text-[18px] leading-none text-[#0f9d68]">›</span>
        <input
          className="flex-1 border-none bg-transparent py-2 font-jetbrains-mono text-[14px] text-[#1a2029] outline-none placeholder:text-[#6b7280]"
          placeholder="Search your code in plain English — e.g. where do we verify the session token"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          autoFocus
        />
        {indexedRepos.length > 0 && (
          <select
            className="max-w-[200px] shrink-0 cursor-pointer rounded-[6px] border border-[#dfe2e6] bg-white px-2 py-1.5 font-jetbrains-mono text-[12px] text-[#1a2029] outline-none transition-colors hover:border-[#3a4557] focus:border-[#0f9d68]"
            value={scopeRepoId}
            onChange={(e) => setScopeRepoId(e.target.value)}
            aria-label="Scope search to a repository"
          >
            <option value="">all repos</option>
            {indexedRepos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" size="sm" disabled={search.isPending || !searchInput.trim()}>
          {search.isPending ? "searching…" : "search"}
        </Button>
      </form>

      {search.isError && (
        <div className="py-10 text-center font-jetbrains-mono text-[13px] text-[#6b7280]">
          search failed — try again
        </div>
      )}

      {search.data && (
        <div className="mb-9">
          <div className="mb-3 font-jetbrains-mono text-[12px] text-[#6b7280]">
            {search.data.results.length} result{search.data.results.length === 1 ? "" : "s"}
            {" for "}
            <span className="text-[#1a2029]">&ldquo;{search.variables}&rdquo;</span>
          </div>
          {search.data.results.length === 0 ? (
            <div className="py-10 text-center font-jetbrains-mono text-[13px] text-[#6b7280]">
              no matching code found
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {search.data.results.map((hit) => (
                <ResultCard key={`${hit.repoId}:${hit.filePath}:${hit.startLine}`} hit={hit} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-3.5 border-b border-[#dfe2e6] pb-2 font-jetbrains-mono text-[12px] tracking-[0.04em] lowercase text-[#6b7280]">
        indexed repositories
      </div>

      <div className="mb-5 flex gap-3">
        <input
          className="flex-1 rounded-[6px] border border-[#dfe2e6] bg-[#f6f7f8] px-3.5 py-2.5 font-jetbrains-mono text-[13px] text-[#1a2029] outline-none transition-colors placeholder:text-[#6b7280] focus:border-[#0f9d68]"
          placeholder="Search repository name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center font-jetbrains-mono text-[13px] text-[#6b7280]">
          no matches — try a different query
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
