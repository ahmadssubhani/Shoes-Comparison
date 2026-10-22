"use client";

import Link from "next/link";
import { MAX_COMPARE, useAppState } from "./AppState";

export function CompareBar() {
  const { compare, clearCompare, removeCompare } = useAppState();
  if (!compare.length) return null;

  const ready = compare.length >= 2;
  const remaining = MAX_COMPARE - compare.length;

  return (
    <>
      <div aria-hidden className="h-20 sm:h-16" />
      <aside
        aria-label="Product comparison tray"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md py-3 px-4 sm:px-6 shadow-2xl"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
              {compare.length}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {compare.length === 1 ? (
                  <span>
                    <strong>1 shoe</strong> selected · add at least 1 more
                  </span>
                ) : (
                  <span>
                    <strong>{compare.length} shoes</strong> selected · ready to compare
                    {remaining > 0 ? ` (up to ${MAX_COMPARE})` : ` (max ${MAX_COMPARE})`}
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {compare.map((id, index) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => removeCompare(id)}
                    title="Remove from comparison"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-ink hover:text-ink"
                  >
                    Pair {index + 1}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-muted hover:text-ink hover:border-ink transition-colors"
            >
              Clear all
            </button>

            {ready ? (
              <Link
                href={`/compare?ids=${compare.join(",")}`}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-accent/90 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span>Compare now ({compare.length})</span>
                <span>→</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="Select at least 2 shoes to compare"
                className="cursor-not-allowed rounded-full bg-border px-5 py-2 text-sm font-semibold text-muted opacity-80"
              >
                Compare now (select 1 more)
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
