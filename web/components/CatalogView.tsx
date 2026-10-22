"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { IconClose } from "./Icons";
import type { Facets, Product, ProductFilters } from "@/lib/types";
import { getStoreDisplayName } from "@/lib/stores";

type CatalogViewProps = {
  products: Product[];
  facets: Facets;
  currentFilters: ProductFilters;
};

const QUICK_CHIPS = [
  { label: "Popular", params: { sort: "recommended" } },
  { label: "Nike", params: { brand: "Nike" } },
  { label: "Puma", params: { brand: "Puma" } },
  { label: "Skechers", params: { brand: "Skechers" } },
  { label: "Under $80", params: { price: "under80" } },
  { label: "Biggest drops", params: { sort: "discount_desc", sale_only: "true" } },
];

export function CatalogView({ products, facets, currentFilters }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(24);

  // Helper to push updated search params
  function updateParams(updates: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === undefined || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    // Reset limit/display count on new filter
    setDisplayCount(24);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleReset() {
    setMobileDrawerOpen(false);
    setDisplayCount(24);
    router.push(pathname);
  }

  // Toggle multi-value filter (brand, store)
  function toggleListParam(key: "brand" | "store", value: string) {
    const existing = searchParams.get(key);
    let list = existing ? existing.split(",").map((s) => s.trim()) : [];
    if (list.includes(value)) {
      list = list.filter((item) => item !== value);
    } else {
      list.push(value);
    }
    updateParams({ [key]: list.length ? list.join(",") : null });
  }

  const selectedBrands = useMemo(() => {
    const raw = searchParams.get("brand");
    return raw ? raw.split(",").map((s) => s.trim().toLowerCase()) : [];
  }, [searchParams]);

  const selectedStores = useMemo(() => {
    const raw = searchParams.get("store");
    return raw ? raw.split(",").map((s) => s.trim().toLowerCase()) : [];
  }, [searchParams]);

  const selectedPrice = searchParams.get("price") || "";
  const inStockChecked = searchParams.get("in_stock") === "true";
  const saleOnlyChecked = searchParams.get("sale_only") === "true";
  const selectedSize = searchParams.get("size") || "";
  const selectedSort = searchParams.get("sort") || "recommended";

  const visibleProducts = products.slice(0, displayCount);
  const hasMore = displayCount < products.length;

  function renderFilterContent() {
    return (
      <div className="space-y-6 text-sm">
        {/* Retailers */}
        <div className="border-b border-border pb-5">
          <h4 className="font-mono text-xs uppercase tracking-eyebrow text-muted mb-3 font-semibold">
            Retailer
          </h4>
          <div className="space-y-2">
            {facets.stores.map((st) => {
              const checked = selectedStores.includes(st.name.toLowerCase());
              return (
                <label key={st.name} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleListParam("store", st.name)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent"
                    />
                    <span className="text-text group-hover:text-ink">{getStoreDisplayName(st.name)}</span>
                  </div>
                  <span className="font-mono text-xs text-muted">({st.count})</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Brands */}
        <div className="border-b border-border pb-5">
          <h4 className="font-mono text-xs uppercase tracking-eyebrow text-muted mb-3 font-semibold">
            Brand
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {facets.brands.slice(0, 10).map((br) => {
              const checked = selectedBrands.includes(br.name.toLowerCase());
              return (
                <label key={br.name} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleListParam("brand", br.name)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent"
                    />
                    <span className="text-text group-hover:text-ink">{br.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted">({br.count})</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Price */}
        <div className="border-b border-border pb-5">
          <h4 className="font-mono text-xs uppercase tracking-eyebrow text-muted mb-3 font-semibold">
            Price
          </h4>
          <div className="space-y-2">
            {[
              { id: "under75", label: "Under $75" },
              { id: "75to120", label: "$75–$120" },
              { id: "over120", label: "Over $120" },
            ].map((p) => (
              <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="price_filter"
                  checked={selectedPrice === p.id}
                  onChange={() => updateParams({ price: selectedPrice === p.id ? null : p.id })}
                  onClick={() => {
                    if (selectedPrice === p.id) updateParams({ price: null });
                  }}
                  className="h-4 w-4 border-border text-accent focus:ring-accent accent-accent"
                />
                <span className="text-text group-hover:text-ink">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className={`border-b border-border pb-5 ${facets.sizes.length ? "" : "border-b-0"}`}>
          <h4 className="font-mono text-xs uppercase tracking-eyebrow text-muted mb-3 font-semibold">
            Availability
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={inStockChecked}
                onChange={(e) => updateParams({ in_stock: e.target.checked ? "true" : null })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent"
              />
              <span className="text-text group-hover:text-ink">In stock</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={saleOnlyChecked}
                onChange={(e) => updateParams({ sale_only: e.target.checked ? "true" : null })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent"
              />
              <span className="text-text group-hover:text-ink">Sale only</span>
            </label>
          </div>
        </div>

        {/* Size Filter (Only shown when size data exists) */}
        {facets.sizes.length > 0 ? (
          <div>
            <h4 className="font-mono text-xs uppercase tracking-eyebrow text-muted mb-3 font-semibold">
              Size
            </h4>
            <select
              value={selectedSize}
              onChange={(e) => updateParams({ size: e.target.value || null })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">All sizes</option>
              {facets.sizes.map((sz) => (
                <option key={sz} value={sz}>
                  US {sz}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="font-mono text-[11px] uppercase tracking-eyebrow text-muted shrink-0 mr-1">
          Quick filters:
        </span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => updateParams(chip.params)}
            className="rounded-full border border-border bg-surface px-3.5 py-1 text-xs text-text shadow-sm hover:border-ink hover:bg-bg transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Top Bar: Counts & Sort & Mobile Filter Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm font-medium text-text">
          <span className="font-bold text-ink">{products.length}</span> matched products · choose up to 4 to compare
        </p>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Drawer Button (< 900px) */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex min-[900px]:hidden items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-text shadow-sm"
          >
            <span>Filters</span>
          </button>

          {/* Native Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <label htmlFor="catalog-sort" className="font-mono text-xs text-muted shrink-0">
              Sort by:
            </label>
            <select
              id="catalog-sort"
              value={selectedSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: low to high</option>
              <option value="discount_desc">Biggest saving</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Product Grid */}
      <div className="grid gap-8 min-[900px]:grid-cols-12 items-start">
        {/* Left Desktop Sidebar (3 cols) */}
        <aside className="hidden min-[900px]:block min-[900px]:col-span-3">
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm sticky top-20">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <h3 className="font-bold text-base text-ink">Filters</h3>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted underline underline-offset-4 hover:text-accent transition-colors"
              >
                Reset
              </button>
            </div>
            {renderFilterContent()}
          </div>
        </aside>

        {/* Right Product Grid (9 cols) */}
        <div className="min-[900px]:col-span-9 space-y-8">
          {products.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-12 text-center space-y-4">
              <p className="font-display text-2xl font-bold text-ink">No products found</p>
              <p className="text-sm text-muted max-w-md mx-auto">
                No shoes matched your current search filters. Try adjusting or clearing your filters to see more results.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore ? (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => setDisplayCount((prev) => prev + 24)}
                    className="rounded-full border border-border bg-surface px-8 py-3 text-sm font-semibold text-ink shadow-sm hover:border-ink hover:bg-bg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Load more ({products.length - displayCount} remaining)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer (< 900px) */}
      {mobileDrawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm min-[900px]:hidden flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="ml-auto w-[min(100%,22rem)] h-full bg-surface p-6 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="font-bold text-lg text-ink">Filters</h3>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-muted underline underline-offset-4"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close filters"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-6 flex-1">{renderFilterContent()}</div>
            <div className="pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-sm"
              >
                Apply filters ({products.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
