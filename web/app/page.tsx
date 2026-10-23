import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { RefreshButton } from "@/components/RefreshButton";
import { getFeaturedProducts, getHeroStats, getProduct } from "@/lib/data";
import { STORES_META } from "@/lib/stores";

export const dynamic = "force-dynamic";

// "?v=2" busts the browser cache so an old broken/black copy of hero.jpg is not reused.
const HERO_IMAGE = "/hero.jpg?v=2";

export default async function DiscoverPage() {
  const stats = await getHeroStats();
  const { products: featured, latestChecked } = await getFeaturedProducts(4);
  const vomero18 = await getProduct(
    "vomero-18--0a932aa4-1329-4fe0-b86a-3c5ad51e925a",
  );
  const dashboardProducts = vomero18
    ? [vomero18, ...featured.filter((product) => product.id !== vomero18.id)].slice(0, 4)
    : featured;
  const retailers = Object.values(STORES_META);
  return (
    <div>
      {/* 1. HERO */}
      <section
        aria-labelledby="hero-title"
        className="site-container grid items-center gap-12 py-12 sm:py-16 lg:min-h-[calc(100vh-11rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-20 lg:py-20"
      >
        {/* Left column */}
        <div className="space-y-6 lg:space-y-8">
          <p className="eyebrow !text-[11px] sm:!text-xs">
            One search · {stats.storeCount} trusted retailers
          </p>

          <h1
            id="hero-title"
            className="font-display text-[clamp(3.25rem,6.6vw,8rem)] font-bold leading-[0.88] tracking-tightest"
          >
            <span className="block text-ink">The right pair.</span>
            <span className="block pb-2 italic text-accent">The best price.</span>
          </h1>

          <p className="max-w-[44rem] text-[clamp(1rem,1.1vw,1.3rem)] leading-relaxed text-muted">
            Compare current shoe prices and offers without opening a dozen tabs. We
            match the same shoe across leading US stores.
          </p>

          {/* Search box */}
          <form
            action="/search"
            method="GET"
            className="flex max-w-[49rem] items-center rounded-2xl border border-border bg-surface p-2 pl-6 shadow-search transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
          >
            <input
              type="search"
              name="q"
              placeholder="Search brand, model or style"
              aria-label="Search shoes by brand, model or style"
              className="h-14 w-full bg-transparent text-[clamp(1rem,1.05vw,1.25rem)] text-text placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-accent px-8 py-4 text-[clamp(.95rem,1vw,1.2rem)] font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Find shoes
            </button>
          </form>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-1 text-[clamp(.78rem,.85vw,1rem)] text-muted">
            <p>
              <span className="font-semibold text-ink">{stats.matchedCount}</span> matched styles
            </p>
            <p>
              <span className="font-semibold text-ink">{stats.storeCount}</span> retailers
            </p>
            <p>
              <span className="font-semibold text-ink">${stats.avgSaving.toFixed(2)}</span> average visible saving
            </p>
          </div>
        </div>

        {/* Right column: lavender panel sized to the photo card (padding all around) */}
<div className="relative mx-auto flex items-center justify-center justify-self-center overflow-hidden rounded-[2.5rem] border border-white/40 bg-gradient-to-br from-[#d8d5f5] via-[#e2defc] to-[#cec9f7] p-8 sm:p-10 lg:p-12">
  <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/40 blur-2xl" />
  <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-accent/20 blur-2xl" />

  {/* Photo card keeps its 2:3 shape, same size as before; the panel now wraps around it */}
  <div className="relative aspect-[2/3] h-[380px] -rotate-3 overflow-hidden rounded-[2rem] border-2 border-white/90 bg-[#0b0100] shadow-2xl sm:h-[470px] lg:h-[clamp(470px,32.5vw,670px)]">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={HERO_IMAGE}
      alt="Featured running shoe"
      className="absolute inset-0 h-full w-full object-cover"
    />
  </div>
</div>
      </section>

      {/* 2. RETAILER STRIP */}
      <section aria-label="Retailers we compare" className="border-y border-border">
        <div className="site-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-12">
          <p className="shrink-0 text-xs text-muted">Comparing public listings from</p>
          <ul className="flex flex-1 flex-wrap items-center justify-between gap-x-8 gap-y-2">
            {retailers.map((retailer) => (
              <li key={retailer.key}>
                <Link
                  href={`/search?store=${encodeURIComponent(retailer.key)}`}
                  className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                >
                  {retailer.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="site-container space-y-14 py-12 sm:space-y-20 sm:py-16">
        {/* 3. WORTH A LOOK */}
        <section aria-labelledby="featured-heading" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Worth a look</p>
              <h2
                id="featured-heading"
                className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[2rem]"
              >
                Today&apos;s sharper prices
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <RefreshButton latestChecked={latestChecked} />
              <Link
                href="/search"
                className="text-xs font-semibold text-ink underline underline-offset-4 transition-colors hover:text-accent"
              >
                See all products →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        {/* 4. DARK PANEL */}
        <section
          aria-labelledby="value-heading"
          className="rounded-panel bg-ink p-8 text-white sm:p-10 md:p-12"
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-5">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-gray-400">
                No checkout. No noise.
              </p>
              <h2
                id="value-heading"
                className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                We compare. You choose.
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-gray-300">
                SoleScope is an independent discovery layer. We surface the clearest
                available offer, show what makes it different, and send you to the
                retailer to buy.
              </p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:col-span-7">
              <div className="space-y-2 py-4 first:pl-0 sm:px-6 sm:py-0">
                <span className="font-mono text-base font-bold text-lime">01</span>
                <h3 className="text-base font-bold text-white">Search once</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  Model, brand, colour or category.
                </p>
              </div>
              <div className="space-y-2 py-4 sm:px-6 sm:py-0">
                <span className="font-mono text-base font-bold text-lime">02</span>
                <h3 className="text-base font-bold text-white">Compare clearly</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  Price, sizes and promotions.
                </p>
              </div>
              <div className="space-y-2 py-4 last:pr-0 sm:px-6 sm:py-0">
                <span className="font-mono text-base font-bold text-lime">03</span>
                <h3 className="text-base font-bold text-white">Buy at source</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  Continue securely on the store.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
