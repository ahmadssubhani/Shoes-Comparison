import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferTable } from "@/components/OfferTable";
import { ProductDetailActions } from "@/components/ProductDetailActions";
import { getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.cleanTitle} - Compare Prices across 5 Stores`,
    description: `Find the lowest price on ${product.cleanTitle} (${product.brand}). Real-time prices from ${product.distinctStores.join(", ")}.`,
  };
}

function getMatchLevelInfo(level: "exact" | "likely" | "single") {
  switch (level) {
    case "exact":
      return {
        label: "Exact match",
        color: "bg-green/15 text-green border-green/30",
        description: "Shared style code confirmed across retailers.",
      };
    case "likely":
      return {
        label: "Likely match",
        color: "bg-blue-500/15 text-blue-700 border-blue-500/30",
        description: "Strong brand, model, and colour agreement.",
      };
    case "single":
    default:
      return {
        label: "Single store listing",
        color: "bg-gray-500/10 text-muted border-border",
        description: "Currently listed at one retailer; monitoring for matches.",
      };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const matchInfo = getMatchLevelInfo(product.matchLevel);

  const price = formatPrice(product.minPrice);
  const originalPrice =
    product.bestOffer?.compareAtPrice &&
    product.bestOffer?.price &&
    product.bestOffer.compareAtPrice > product.bestOffer.price
      ? formatPrice(product.bestOffer.compareAtPrice)
      : null;

  const saving = product.maxSaving && product.maxSaving > 0 ? formatPrice(product.maxSaving) : null;

  function formatTime(iso: string | null) {
    if (!iso) return "Recent";
    try {
      const d = new Date(iso);
      const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `${day}, ${time}`;
    } catch {
      return "Recent";
    }
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ink">
              Discover
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/search" className="hover:text-ink">
              Catalogue
            </Link>
          </li>
          <li>/</li>
          <li className="text-ink font-medium truncate max-w-[200px] sm:max-w-none">
            {product.cleanTitle}
          </li>
        </ol>
      </nav>

      {/* Main Product Showcase: 2 Columns */}
      <div className="grid gap-10 lg:grid-cols-12 items-start">
        {/* Left: Large Image area */}
        <div className="lg:col-span-6">
          <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl border border-border bg-[#f4f1ea] p-8 flex items-center justify-center overflow-hidden shadow-sm">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.cleanTitle}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4"
              />
            ) : (
              <p className="font-mono text-xs text-muted">No photo available</p>
            )}

            {saving && (
              <span className="absolute top-4 left-4 rounded-full bg-lime px-3 py-1 font-mono text-xs font-bold text-ink shadow-sm">
                Save {saving}
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Info & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Brand & Category Eyebrow */}
          <div>
            <p className="eyebrow">
              {product.brand}
              {product.category ? ` · ${product.category}` : ""}
              {product.styleCode ? ` · ${product.styleCode}` : ""}
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
              {product.cleanTitle}
            </h1>
          </div>

          {/* Match Level Chip + Explanation */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-semibold ${matchInfo.color}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {matchInfo.label}
            </span>
            <span className="text-xs text-muted">
              {matchInfo.description}
            </span>
          </div>

          {/* Best Price Block */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-1 shadow-sm">
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              LOWEST AVAILABLE PRICE
            </span>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl sm:text-4xl font-bold text-ink">
                {price || "Check stores"}
              </span>
              {originalPrice ? (
                <span className="text-base text-muted line-through">
                  {originalPrice}
                </span>
              ) : null}
              {saving ? (
                <span className="rounded-full bg-lime px-2.5 py-0.5 font-mono text-xs font-bold text-ink">
                  Save {saving}
                </span>
              ) : null}
            </div>
            {product.bestOffer ? (
              <p className="text-xs text-muted pt-1">
                Found at <strong className="text-text">{product.bestOffer.store.toUpperCase()}</strong>
              </p>
            ) : null}
          </div>

          {/* Freshness Status Line */}
          <div className="flex items-center gap-2 font-mono text-xs text-muted">
            <span
              className={`h-2 w-2 rounded-full ${
                product.isStale ? "bg-amber-500" : "bg-green"
              }`}
            />
            <span>
              {product.isStale
                ? "May be out of date (collection > 48h ago)"
                : `Checked ${formatTime(product.latestChecked)}`}
            </span>
          </div>

          {/* Size picker, Actions, Report Problem Form */}
          <ProductDetailActions product={product} />
        </div>
      </div>

      {/* Matched Offers Table Section */}
      <section aria-labelledby="offers-table-heading" className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <p className="eyebrow">RETAILER COMPARISON</p>
            <h2 id="offers-table-heading" className="text-2xl font-bold font-display text-ink">
              Store offers ({product.offers.length})
            </h2>
          </div>
          <p className="text-xs text-muted">
            Prices verified directly from retailer public product pages.
          </p>
        </div>

        <OfferTable offers={product.offers} />
      </section>
    </article>
  );
}

