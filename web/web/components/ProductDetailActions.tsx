"use client";

import { useState } from "react";
import { useAppState } from "./AppState";
import { IconHeart } from "./Icons";
import { ReportProblemModal } from "./ReportProblemModal";
import type { Product } from "@/lib/types";

export function ProductDetailActions({ product }: { product: Product }) {
  const { isSaved, toggleSaved, isCompared, toggleCompare, canAddCompare } = useAppState();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const saved = isSaved(product.id);
  const compared = isCompared(product.id);
  const canCompare = canAddCompare(product.id);

  // Collect all distinct sizes across offers
  const allSizes: string[] = [];
  for (const off of product.offers) {
    for (const sz of off.sizes) {
      if (sz && !allSizes.includes(sz)) {
        allSizes.push(sz);
      }
    }
  }

  allSizes.sort((a, b) => {
    const na = Number.parseFloat(a);
    const nb = Number.parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Size Selection Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-muted font-semibold">
            AVAILABLE SIZES
          </span>
          {selectedSize ? (
            <span className="text-xs text-muted">
              Selected: <strong className="text-text">US {selectedSize}</strong>
            </span>
          ) : null}
        </div>

        {allSizes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allSizes.map((sz) => {
              const active = selectedSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(active ? null : sz)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active
                      ? "border-accent bg-accent text-white font-bold"
                      : "border-border bg-surface text-text hover:border-text"
                  }`}
                >
                  US {sz}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted font-mono bg-bg/80 border border-border/80 rounded-lg p-3">
            Sizes not listed - check the store
          </p>
        )}
      </div>

      {/* Action Buttons Row: Add to comparison, Save heart, Report problem */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          title={
            compared
              ? "Remove from comparison"
              : !canCompare
              ? "Comparison is full — this will replace the first selected shoe"
              : "Add to comparison"
          }
          onClick={() => toggleCompare(product.id)}
          className={`flex-1 min-w-[180px] rounded-full py-3 px-6 text-sm font-semibold tracking-wide transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            compared
              ? "bg-accent text-white hover:opacity-95"
              : "bg-ink text-white hover:bg-black"
          }`}
        >
          {compared ? "✓ Added to comparison" : "+ Add to comparison"}
        </button>

        <button
          type="button"
          onClick={() => toggleSaved(product.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save to shortlist"}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            saved ? "text-accent fill-accent" : "text-muted hover:text-text"
          }`}
        >
          <IconHeart filled={saved} className="h-5 w-5" />
        </button>
      </div>

      {/* Report problem link */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="text-xs text-muted hover:text-ink underline underline-offset-4 transition-colors font-mono"
        >
          Report a problem with this listing →
        </button>
      </div>

      <ReportProblemModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        productId={product.id}
        productTitle={product.cleanTitle}
      />
    </div>
  );
}

