import type { Metadata } from "next";
import {
  EmptyResults,
  ErrorRetry,
  MOCK_OUT_OF_STOCK_PRODUCT,
  MOCK_PARTIAL_PRODUCT,
  ProductSkeletonGrid,
} from "@/components/UiStates";
import { ProductCard } from "@/components/ProductCard";
import { OfferTable } from "@/components/OfferTable";

export const metadata: Metadata = {
  title: "UI State Reference Gallery",
  description: "Live component gallery of error, loading, empty, and partial data states.",
};

export default function StatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-16">
      {/* Title Area */}
      <div className="space-y-1.5 border-b border-border pb-6">
        <p className="eyebrow">DESIGN SYSTEM & EDGE CASES</p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
          UI state reference
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-xl">
          Live gallery of design states verifying that missing prices, images, sizes, or stale timestamps never break any page.
        </p>
      </div>

      {/* 1. Loading Skeleton */}
      <section className="space-y-4">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-semibold">
            STATE 01
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">
            Loading state (skeleton cards)
          </h2>
          <p className="text-xs text-muted">
            Displayed while streaming or fetching catalogue items and price updates.
          </p>
        </div>
        <ProductSkeletonGrid />
      </section>

      {/* 2. Empty Results */}
      <section className="space-y-4 pt-8 border-t border-border">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-semibold">
            STATE 02
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">
            Empty search results
          </h2>
          <p className="text-xs text-muted">
            Rendered when user filters yield zero products or when the saved shortlist is empty.
          </p>
        </div>
        <EmptyResults message="No shoe models found for query 'UltraHyperFlyer 9000'. Try searching 'Palermo' or clearing your price filter." />
      </section>

      {/* 3. Partial Data */}
      <section className="space-y-6 pt-8 border-t border-border">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-semibold">
            STATE 03
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">
            Partial data resilience
          </h2>
          <p className="text-xs text-muted max-w-2xl">
            Demonstrates handling when a product has: missing image photo, no original compare price, empty sizes array, and one store offer that is &gt;48 hours stale.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 max-w-sm">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
              Resilient Product Card:
            </p>
            <ProductCard product={MOCK_PARTIAL_PRODUCT} />
          </div>

          <div className="lg:col-span-7 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
              Resilient Offer Table (Puma US stale, 6pm active):
            </p>
            <OfferTable offers={MOCK_PARTIAL_PRODUCT.offers} />
          </div>
        </div>
      </section>

      {/* 4. Out of Stock */}
      <section className="space-y-6 pt-8 border-t border-border">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-semibold">
            STATE 04
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">
            Unavailable / Out of stock
          </h2>
          <p className="text-xs text-muted">
            Gracefully shows stock indicator and disables checkout CTA without crashing layout.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 max-w-sm">
            <ProductCard product={MOCK_OUT_OF_STOCK_PRODUCT} />
          </div>
          <div className="lg:col-span-7">
            <OfferTable offers={MOCK_OUT_OF_STOCK_PRODUCT.offers} />
          </div>
        </div>
      </section>

      {/* 5. Error with Retry */}
      <section className="space-y-4 pt-8 border-t border-border">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-accent font-semibold">
            STATE 05
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">
            Error with retry action
          </h2>
          <p className="text-xs text-muted">
            Rendered when remote API or database connectivity fails.
          </p>
        </div>
        <ErrorRetry message="Network connection timeout connecting to database cluster. Please try again." />
      </section>
    </div>
  );
}

