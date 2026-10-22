import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AiComparisonCard } from "@/components/AiComparisonCard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { getProductsByIds } from "@/lib/data";
import { formatPrice } from "@/lib/currency";
import { getStoreDisplayName } from "@/lib/stores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Shoes Side by Side",
  description: "Direct comparison of shoe prices, offers, and store availability.",
};

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "Recent";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Recent";
    const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day}, ${time}`;
  } catch {
    return "Recent";
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawIds = params.ids;
  const idList = Array.isArray(rawIds)
    ? rawIds.join(",").split(",")
    : typeof rawIds === "string"
    ? rawIds.split(",")
    : [];

  const cleanIds = idList.map((id) => id.trim()).filter(Boolean);
  const products = cleanIds.length > 0 ? await getProductsByIds(cleanIds) : [];

  if (products.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center space-y-4">
        <p className="eyebrow">PAIR COMPARISON</p>
        <h1 className="font-display text-3xl font-bold text-ink">Compare shoes</h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          Please select at least 2 shoes to compare side-by-side. You can select products from the catalogue using the "+ Add to comparison" button.
        </p>
        <div className="pt-4">
          <Link
            href="/search"
            className="inline-flex rounded-full bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            Browse catalogue →
          </Link>
        </div>
      </div>
    );
  }

  // Determine grid column class based on number of compared products
  const gridColsClass =
    products.length === 2
      ? "grid-cols-1 md:grid-cols-2"
      : products.length === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
      {/* Header with Title & Copy Link */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <p className="eyebrow">HEAD TO HEAD COMPARISON</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Comparing {products.length} pairs
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Side-by-side offer comparison across public store listings with Gemini AI synthesis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-text hover:border-ink"
          >
            + Add more shoes
          </Link>
          <CopyLinkButton />
        </div>
      </div>

      {/* Side-by-Side Product Cards Grid */}
      <div className={`grid ${gridColsClass} gap-6 sm:gap-8 items-start`}>
        {products.map((product) => {
          // Calculate price spread across stores
          const pricedOffers = product.offers.filter((o) => o.price != null);
          let priceSpreadText: string | null = null;

          if (pricedOffers.length >= 2) {
            const minOffer = pricedOffers.reduce((min, cur) => (cur.price! < min.price! ? cur : min));
            const maxOffer = pricedOffers.reduce((max, cur) => (cur.price! > max.price! ? cur : max));
            const diff = maxOffer.price! - minOffer.price!;
            if (diff > 0.01) {
              priceSpreadText = `${formatPrice(diff)} cheaper at ${getStoreDisplayName(minOffer.store)}`;
            }
          }

          const lowestPrice = product.minPrice;

          return (
            <div
              key={product.id}
              className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-5 shadow-sm flex flex-col justify-between"
            >
              {/* Product Header & Image */}
              <div className="space-y-3">
                <div className="relative aspect-[4/3] w-full rounded-xl bg-gradient-to-b from-[#f9f7f2] to-[#efeae1] p-4 flex items-center justify-center overflow-hidden border border-border/40">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.cleanTitle}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-2"
                    />
                  ) : (
                    <span className="font-mono text-xs text-muted">No photo</span>
                  )}
                  {product.maxSaving && product.maxSaving > 0 && (
                    <span className="absolute top-3 left-3 rounded-full bg-lime px-2.5 py-1 font-mono text-xs font-bold text-ink shadow-sm">
                      Save {formatPrice(product.maxSaving)}
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-mono text-[11px] uppercase tracking-eyebrow text-muted">
                    {product.brand}
                    {product.category ? ` · ${product.category}` : ""}
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink mt-0.5 line-clamp-2">
                    <Link href={`/product/${product.slug}`} className="hover:text-accent transition-colors">
                      {product.cleanTitle}
                    </Link>
                  </h2>
                </div>

                {/* Match level & Price Spread */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-green/15 text-green px-2.5 py-0.5 font-mono text-[11px] font-semibold">
                    {product.matchLevel === "exact"
                      ? "Exact match"
                      : product.matchLevel === "likely"
                      ? "Likely match"
                      : "Single retailer"}
                  </span>
                  {priceSpreadText && (
                    <span className="rounded-full bg-bg border border-border px-2.5 py-0.5 font-mono text-[11px] text-ink font-medium">
                      💡 {priceSpreadText}
                    </span>
                  )}
                </div>
              </div>

              {/* Per-Store Offers Table */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted font-semibold">
                  STORE OFFERS ({product.offers.length})
                </span>

                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden text-xs">
                  {product.offers.map((offer) => {
                    const isLowest = offer.price != null && offer.price === lowestPrice;
                    const inStock = offer.inStock ?? true;
                    const original =
                      offer.compareAtPrice && offer.price && offer.compareAtPrice > offer.price
                        ? formatPrice(offer.compareAtPrice)
                        : null;

                    return (
                      <div
                        key={offer.id}
                        className={`p-3 flex items-center justify-between gap-2 ${
                          isLowest ? "bg-accent/5 font-medium" : "bg-surface"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-ink">
                            <span>{getStoreDisplayName(offer.store)}</span>
                            {isLowest && (
                              <span className="rounded-full bg-green text-white text-[9px] font-mono px-1.5 py-0.2">
                                LOWEST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                            <span className={inStock ? "text-green" : "text-muted"}>
                              {inStock ? "In stock" : "Out of stock"}
                            </span>
                            <span>·</span>
                            <span>{formatTimestamp(offer.scrapedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-bold text-ink text-sm">
                              {formatPrice(offer.price) || "Check store"}
                            </span>
                            {original && (
                              <span className="block text-[10px] text-muted line-through">
                                {original}
                              </span>
                            )}
                          </div>
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text hover:border-ink hover:bg-bg transition-colors"
                          >
                            Visit ↗
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gemini AI Comparison Card */}
      <AiComparisonCard ids={products.map((p) => p.id)} />
    </div>
  );
}
