"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ latestChecked }: { latestChecked: string | null }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function formatTime(iso: string | null) {
    if (!iso) return "Today";
    try {
      const d = new Date(iso);
      const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `${day}, ${time}`;
    } catch {
      return "Today";
    }
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        Updated {formatTime(latestChecked)}
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-mono text-ink shadow-sm hover:border-ink transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>↻</span>
        <span>Fetch latest data</span>
      </button>
    </div>
  );
}

