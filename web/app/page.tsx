import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { RefreshButton } from "@/components/RefreshButton";
import { getFeaturedProducts, getHeroStats, getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const stats = await getHeroStats();
  const { products: featured, latestChecked } = await getFeaturedProducts(4);

  const vomero18 = await getProduct(
    "vomero-18--0a932aa4-1329-4fe0-b86a-3c5ad51e925a",
  );
  const dashboardProducts = vomero18
    ? [vomero18, ...featured.filter((product) => product.id !== vomero18.id)].slice(0, 4)
    : featured;
  const heroTopProduct = vomero18 || featured[0] || null;

  const heroOriginalPrice =
    heroTopProduct?.bestOffer?.compareAtPrice &&
    heroTopProduct?.bestOffer?.price &&
    heroTopProduct.bestOffer.compareAtPrice > heroTopProduct.bestOffer.price
      ? formatPrice(heroTopProduct.bestOffer.compareAtPrice)
      : null;

  const matchLabelText =
    heroTopProduct?.matchLevel === "exact"
      ? "Exact match"
      : heroTopProduct?.matchLevel === "likely"
      ? `Likely match (${heroTopProduct?.storeCount || 3} stores)`
      : "Single retailer";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION */}
      <section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <p className="eyebrow">
            ONE SEARCH · {stats.storeCount} TRUSTED RETAILERS
          </p>

          <h1
            id="hero-title"
            className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tightest leading-[0.95]"
          >
            <span className="block text-ink">The right pair.</span>
            <span className="block text-accent italic">The best price.</span>
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-muted leading-relaxed">
            Compare current shoe prices and offers without opening a dozen tabs. We match the same shoe across leading US stores.
          </p>

          {/* Search Box */}
          <form
            action="/search"
            method="GET"
            className="flex items-center rounded-full border border-border bg-surface p-1.5 pl-5 shadow-search focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all max-w-xl"
          >
            <input
              type="search"
              name="q"
              placeholder="Search brand, model or style"
              aria-label="Search shoes by brand, model or style"
              className="w-full bg-transparent text-sm sm:text-base text-text placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink shrink-0"
            >
              Find shoes
            </button>
          </form>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-muted">
            <div>
              <span className="font-bold text-ink">{stats.matchedCount}</span>{" "}
              <span>matched styles</span>
            </div>
            <span className="text-border">·</span>
            <div>
              <span className="font-bold text-ink">{stats.storeCount}</span>{" "}
              <span>retailers</span>
            </div>
            <span className="text-border">·</span>
            <div>
              <span className="font-bold text-ink">${stats.avgSaving.toFixed(2)}</span>{" "}
              <span>average visible saving</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols) - Visual Lavender Panel with Eye-Catchy Styled Sneaker Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-panel bg-gradient-to-br from-[#d8d5f5] via-[#e2defc] to-[#cec9f7] p-8 sm:p-12 min-h-[420px] flex items-center justify-center overflow-hidden shadow-sm border border-white/40">
            {/* Ambient decorative lighting orbs */}
            <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/40 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

            {heroTopProduct ? (
              <>
                {/* Floating card top-right: Match Level */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-xl border border-border/70 bg-surface/95 px-3 py-2 shadow-md backdrop-blur z-20 text-left transition-transform hover:scale-105">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                    MATCH
                  </p>
                  <p className="text-xs font-semibold text-green flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
                    {matchLabelText}
                  </p>
                </div>

                {/* Eye-Catchy Tilted Card with Stylized Studio Backdrop */}
                <Link
                  href={`/product/${heroTopProduct.slug}`}
                  aria-label={`View ${heroTopProduct.cleanTitle}`}
                  className="group relative -rotate-3 hover:rotate-0 rounded-3xl bg-gradient-to-br from-[#fff7f0] via-[#ffffff] to-[#fff1e5] p-5 shadow-2xl hover:shadow-3xl transition-all duration-500 w-64 h-64 sm:w-72 sm:h-72 flex flex-col items-center justify-center border-2 border-white/90 overflow-hidden"
                >
                  {/* Studio backdrop lighting behind the shoe */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,160,90,0.35)_0%,rgba(255,215,170,0.18)_50%,transparent_75%)] pointer-events-none" />
                  
                  {/* Concentric subtle rings */}
                  <div className="absolute h-40 w-40 rounded-full border border-orange-200/50 scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                  <div className="absolute h-52 w-52 rounded-full border border-orange-100/40 scale-100 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />

                  {/* Soft grounded shadow under the shoe */}
                  <div className="absolute bottom-6 left-10 right-10 h-3 rounded-full bg-black/15 blur-md transform scale-x-90 group-hover:scale-x-105 transition-transform duration-300" />

                  {/* Sneaker Image */}
                  {heroTopProduct.imageUrl ? (
                    <div className="relative w-full h-full z-10">
                      <Image
                        src={heroTopProduct.imageUrl}
                        alt={heroTopProduct.cleanTitle}
                        fill
                        sizes="300px"
                        priority
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 drop-shadow-md"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-muted z-10">Featured shoe</span>
                  )}

                  {/* Sleek bottom pill */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-sm">
                      <span className="text-lime">★</span> {heroTopProduct.brand} · Popular
                    </span>
                  </div>
                </Link>

                {/* Floating card bottom-left: Lowest visible price */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 rounded-xl border border-border/70 bg-surface/95 px-3.5 py-2.5 shadow-md backdrop-blur z-20 text-left transition-transform hover:scale-105">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                    LOWEST VISIBLE PRICE
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-bold text-lg sm:text-xl text-ink">
                      {formatPrice(heroTopProduct.minPrice)}
                    </span>
                    {heroOriginalPrice ? (
                      <span className="text-xs text-muted line-through">
                        {heroOriginalPrice}
                      </span>
                    ) : null}
                    {heroTopProduct.maxSaving && heroTopProduct.maxSaving > 0 ? (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
                        Save {formatPrice(heroTopProduct.maxSaving)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2. WORTH A LOOK SECTION */}
      <section aria-labelledby="featured-heading" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">WORTH A LOOK</p>
            <h2 id="featured-heading" className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Today&apos;s sharper prices
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <RefreshButton latestChecked={latestChecked} />
            <Link
              href="/search"
              className="text-xs font-semibold text-ink underline underline-offset-4 hover:text-accent transition-colors"
            >
              See all products →
            </Link>
          </div>
        </div>

        {/* 4 Featured ProductCards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 3. DARK PANEL */}
      <section
        aria-labelledby="value-heading"
        className="rounded-panel bg-ink text-white p-8 sm:p-12 md:p-14"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Left Intro (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <p className="font-mono text-xs uppercase tracking-eyebrow text-gray-400">
              NO CHECKOUT. NO NOISE.
            </p>
            <h2
              id="value-heading"
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white"
            >
              We compare. You choose.
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
              ShoeScope is an independent discovery layer. We surface the clearest available offer, show what makes it different, and send you to the retailer to buy.
            </p>
          </div>

          {/* Right Columns (7 cols) - 3 Numbered Steps separated by thin lines */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            {/* Step 1 */}
            <div className="py-4 sm:py-0 sm:px-6 first:pl-0 space-y-2">
              <span className="font-mono text-base font-bold text-lime">01</span>
              <h3 className="font-bold text-base text-white">Search once</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Model, brand, colour or category.
              </p>
            </div>

            {/* Step 2 */}
            <div className="py-4 sm:py-0 sm:px-6 space-y-2">
              <span className="font-mono text-base font-bold text-lime">02</span>
              <h3 className="font-bold text-base text-white">Compare clearly</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Price, sizes and promotions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="py-4 sm:py-0 sm:px-6 last:pr-0 space-y-2">
              <span className="font-mono text-base font-bold text-lime">03</span>
              <h3 className="font-bold text-base text-white">Buy at source</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Continue securely on the store.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
