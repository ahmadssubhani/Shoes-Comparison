"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { useAppState } from "./AppState";
import type { Product } from "@/lib/types";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function SavedList({ allProducts }: { allProducts: Product[] }) {
  const { saved } = useAppState();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return (
      <div className="py-12 text-center text-xs font-mono text-muted">
        Loading saved shortlist...
      </div>
    );
  }

  const savedProducts = allProducts.filter((p) => saved.includes(p.id));

  if (savedProducts.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-12 text-center space-y-4 shadow-sm">
        <p className="font-display text-2xl font-bold text-ink">No saved pairs</p>
        <p className="text-sm text-muted max-w-md mx-auto">
          You haven&apos;t saved any shoes yet. Browse the catalogue and tap the heart icon on any pair to pin it to your browser shortlist.
        </p>
        <div className="pt-2">
          <Link
            href="/search"
            className="inline-flex rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            Explore shoes →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{savedProducts.length} saved {savedProducts.length === 1 ? "pair" : "pairs"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {savedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
