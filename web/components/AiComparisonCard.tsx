"use client";

import { useEffect, useState } from "react";
import type { AiComparisonResult } from "@/lib/types";

export function AiComparisonCard({ ids }: { ids: string[] }) {
  const [data, setData] = useState<AiComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsKey = [...ids].sort().join(",");

  async function fetchComparison(forceRefresh = false) {
    if (ids.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, forceRefresh }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "AI summary unavailable");
      }

      const json = await res.json();
      if (json.data) {
        setData(json.data);
      } else {
        throw new Error("AI summary unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI summary unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ids.length >= 2) {
      fetchComparison(false);
    }
  }, [idsKey]);

  return (
    <section
      aria-labelledby="ai-comparison-heading"
      className="rounded-2xl border border-border bg-[#faf8f5] p-6 sm:p-8 space-y-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-bold">
              GEMINI AI SYNTHESIS
            </span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-accent">
              {ids.length} shoes analyzed
            </span>
          </div>
          <h3 id="ai-comparison-heading" className="font-display text-2xl font-bold text-ink mt-0.5">
            AI comparison
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchComparison(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-mono font-semibold text-ink shadow-sm hover:border-ink hover:bg-bg transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className={`inline-block ${loading ? "animate-spin" : ""}`}>↻</span>
            <span>{loading ? "Analyzing shoes..." : "Regenerate analysis"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 py-4 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-mono text-accent">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-ping" />
            <span>Gemini is comparing models, retailer discounts, and store availability...</span>
          </div>
          <div className="h-4 bg-border/60 rounded w-3/4" />
          <div className="h-4 bg-border/60 rounded w-1/2" />
          <div className="space-y-2 pt-4">
            <div className="h-3 bg-border/50 rounded w-5/6" />
            <div className="h-3 bg-border/50 rounded w-4/6" />
          </div>
        </div>
      ) : error ? (
        <div className="py-4 text-left space-y-3">
          <p className="text-xs font-mono text-muted bg-surface/70 border border-border rounded-lg p-3">
            Note: {error}. You can still compare all pricing directly in the store offer tables above.
          </p>
          <button
            type="button"
            onClick={() => fetchComparison(true)}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            Retry Gemini AI Analysis
          </button>
        </div>
      ) : data ? (
        <div className="space-y-5 text-sm">
          {/* Summary */}
          <div className="space-y-1">
            <h4 className="font-bold text-ink text-sm">Summary</h4>
            <p className="text-text leading-relaxed">{data.summary}</p>
          </div>

          {/* Key Differences */}
          {data.key_differences?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-ink text-sm">Key differences</h4>
              <ul className="list-disc list-inside space-y-1 text-muted text-xs sm:text-sm pl-1">
                {data.key_differences.map((diff, i) => (
                  <li key={i} className="text-text">
                    {diff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Best Value */}
          {data.best_value && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
              <h4 className="font-bold text-ink text-xs uppercase font-mono tracking-wider">
                Visible value assessment
              </h4>
              <p className="text-sm text-text leading-relaxed">{data.best_value}</p>
            </div>
          )}

          {/* Caveats */}
          {data.caveats?.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="font-mono text-[11px] text-muted uppercase">Caveats:</span>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-muted pl-1">
                {data.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Verification Label */}
          <div className="pt-2 border-t border-border/60">
            <p className="font-mono text-[11px] text-muted italic">
              AI-generated from listed data - verify on the store page
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
