import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { OfferTable } from "./OfferTable";
import type { Product, Offer } from "@/lib/types";

export function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-card border border-border bg-surface shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-[#ece7dd]" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-[#ece7dd]" />
            <div className="flex justify-between items-center">
              <div className="h-5 w-36 animate-pulse rounded bg-[#ece7dd]" />
              <div className="h-5 w-14 animate-pulse rounded bg-[#ece7dd]" />
            </div>
            <div className="h-3 w-28 animate-pulse rounded bg-[#ece7dd]" />
            <div className="h-8 w-full animate-pulse rounded-full bg-[#ece7dd] mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyResults({ message }: { message?: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface p-12 text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg text-muted font-mono text-xl">
        ∅
      </div>
      <h3 className="font-display text-2xl font-bold text-ink">No matching shoes</h3>
      <p className="text-sm text-muted max-w-md mx-auto">
        {message || "Try clearing filters, searching a different brand or model name."}
      </p>
      <div className="pt-2">
        <Link
          href="/search"
          className="inline-flex rounded-full bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          Reset filters
        </Link>
      </div>
    </div>
  );
}

export function ErrorRetry({
  message,
  reset,
}: {
  message?: string;
  reset?: () => void;
}) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50/50 p-8 text-center space-y-3">
      <h3 className="font-display text-2xl font-bold text-red-700">Could not load listings</h3>
      <p className="text-sm text-muted max-w-md mx-auto">
        {message || "The catalogue data is temporarily unreachable. Please check connection and retry."}
      </p>
      <div className="pt-2">
        {reset ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-accent px-6 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            ↻ Retry request
          </button>
        ) : (
          <Link
            href="/"
            className="inline-block rounded-full bg-accent px-6 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            ↻ Reload page
          </Link>
        )}
      </div>
    </div>
  );
}

// Mock items demonstrating resilient partial states
export const MOCK_PARTIAL_PRODUCT: Product = {
  id: "state-mock-partial-1",
  brand: "Puma",
  title: "Palermo Special (Missing Photo / Sizes)",
  cleanTitle: "Palermo Special",
  matchKey: "puma|unisex|palermo special|USD",
  styleCode: "397647-01",
  imageUrl: null, // Missing image!
  category: null, // Missing category!
  offers: [
    {
      id: "off-p1",
      productId: "state-mock-partial-1",
      store: "puma",
      storeTitle: "Palermo Special",
      brand: "Puma",
      imageUrl: null,
      price: 85.0,
      compareAtPrice: null, // No original price!
      discountPct: null,
      sizes: [], // Missing sizes!
      inStock: true,
      url: "https://us.puma.com",
      currency: "USD",
      category: null,
      scrapedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // > 48h stale!
      saving: null,
      isStale: true,
    },
    {
      id: "off-p2",
      productId: "state-mock-partial-1",
      store: "6pm",
      storeTitle: "Puma Palermo",
      brand: "Puma",
      imageUrl: null,
      price: 74.99,
      compareAtPrice: 90.0,
      discountPct: 16,
      sizes: ["8", "9", "10"],
      inStock: true,
      url: "https://www.6pm.com",
      currency: "USD",
      category: "sneaker",
      scrapedAt: new Date().toISOString(),
      saving: 15.01,
      isStale: false,
    },
  ],
  bestOffer: null,
  minPrice: 74.99,
  maxSaving: 15.01,
  storeCount: 2,
  distinctStores: ["puma", "6pm"],
  matchLevel: "exact",
  latestChecked: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  isStale: true,
  slug: "palermo-special--state-mock-partial-1",
};

export const MOCK_OUT_OF_STOCK_PRODUCT: Product = {
  id: "state-mock-oos-1",
  brand: "Nike",
  title: "Air Max 90 Infrared",
  cleanTitle: "Air Max 90 Infrared",
  matchKey: "nike|men|air max 90 infrared|USD",
  styleCode: "CT1685-100",
  imageUrl: "https://static.nike.com/a/images/t_default/844a4f89-c439-4d64-8ee7-e62e15daaaeb/air-max-90-shoes-kRsBnD.png",
  category: "running",
  offers: [
    {
      id: "off-oos-1",
      productId: "state-mock-oos-1",
      store: "nike",
      storeTitle: "Air Max 90 Infrared",
      brand: "Nike",
      imageUrl: null,
      price: 130.0,
      compareAtPrice: null,
      discountPct: null,
      sizes: [],
      inStock: false, // Out of stock!
      url: "https://www.nike.com",
      currency: "USD",
      category: "running",
      scrapedAt: new Date().toISOString(),
      saving: null,
      isStale: false,
    },
  ],
  bestOffer: null,
  minPrice: 130.0,
  maxSaving: null,
  storeCount: 1,
  distinctStores: ["nike"],
  matchLevel: "single",
  latestChecked: new Date().toISOString(),
  isStale: false,
  slug: "air-max-90-infrared--state-mock-oos-1",
};
