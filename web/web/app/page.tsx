// import Link from "next/link";
// import Image from "next/image";
// import { ProductCard } from "@/components/ProductCard";
// import { RefreshButton } from "@/components/RefreshButton";
// import { getFeaturedProducts, getHeroStats, getProduct } from "@/lib/data";
// import { formatPrice } from "@/lib/currency";

// export const dynamic = "force-dynamic";

// export default async function DiscoverPage() {
//   const stats = await getHeroStats();
//   const { products: featured, latestChecked } = await getFeaturedProducts(4);

//   const vomero18 = await getProduct(
//     "vomero-18--0a932aa4-1329-4fe0-b86a-3c5ad51e925a",
//   );
//   const dashboardProducts = vomero18
//     ? [vomero18, ...featured.filter((product) => product.id !== vomero18.id)].slice(0, 4)
//     : featured;
//   const heroTopProduct = vomero18 || featured[0] || null;

//   const heroOriginalPrice =
//     heroTopProduct?.bestOffer?.compareAtPrice &&
//     heroTopProduct?.bestOffer?.price &&
//     heroTopProduct.bestOffer.compareAtPrice > heroTopProduct.bestOffer.price
//       ? formatPrice(heroTopProduct.bestOffer.compareAtPrice)
//       : null;

//   const matchLabelText =
//     heroTopProduct?.matchLevel === "exact"
//       ? "Exact match"
//       : heroTopProduct?.matchLevel === "likely"
//       ? `Likely match (${heroTopProduct?.storeCount || 3} stores)`
//       : "Single retailer";

//   return (
//     <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-16 sm:space-y-24">
//       {/* 1. HERO SECTION */}
//       <section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-12 lg:items-center">
//         {/* Left Column (7 cols) */}
//         <div className="lg:col-span-7 space-y-6">
//           <p className="eyebrow">
//             ONE SEARCH · {stats.storeCount} TRUSTED RETAILERS
//           </p>

//           <h1
//             id="hero-title"
//             className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tightest leading-[0.95]"
//           >
//             <span className="block text-ink">The right pair.</span>
//             <span className="block text-accent italic">The best price.</span>
//           </h1>

//           <p className="max-w-xl text-base sm:text-lg text-muted leading-relaxed">
//             Compare current shoe prices and offers without opening a dozen tabs. We match the same shoe across leading US stores.
//           </p>

//           {/* Search Box */}
//           <form
//             action="/search"
//             method="GET"
//             className="flex items-center rounded-full border border-border bg-surface p-1.5 pl-5 shadow-search focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all max-w-xl"
//           >
//             <input
//               type="search"
//               name="q"
//               placeholder="Search brand, model or style"
//               aria-label="Search shoes by brand, model or style"
//               className="w-full bg-transparent text-sm sm:text-base text-text placeholder:text-muted/70 focus:outline-none"
//             />
//             <button
//               type="submit"
//               className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink shrink-0"
//             >
//               Find shoes
//             </button>
//           </form>

//           {/* Stats Row */}
//           <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-muted">
//             <div>
//               <span className="font-bold text-ink">{stats.matchedCount}</span>{" "}
//               <span>matched styles</span>
//             </div>
//             <span className="text-border">·</span>
//             <div>
//               <span className="font-bold text-ink">{stats.storeCount}</span>{" "}
//               <span>retailers</span>
//             </div>
//             <span className="text-border">·</span>
//             <div>
//               <span className="font-bold text-ink">${stats.avgSaving.toFixed(2)}</span>{" "}
//               <span>average visible saving</span>
//             </div>
//           </div>
//         </div>

//         {/* Right Column (5 cols) - Visual Lavender Panel with Eye-Catchy Styled Sneaker Card */}
//         <div className="lg:col-span-5">
//           <div className="relative rounded-panel bg-gradient-to-br from-[#d8d5f5] via-[#e2defc] to-[#cec9f7] p-8 sm:p-12 min-h-[420px] flex items-center justify-center overflow-hidden shadow-sm border border-white/40">
//             {/* Ambient decorative lighting orbs */}
//             <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/40 blur-2xl pointer-events-none" />
//             <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

//             {heroTopProduct ? (
//               <>
//                 {/* Floating card top-right: Match Level */}
//                 <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-xl border border-border/70 bg-surface/95 px-3 py-2 shadow-md backdrop-blur z-20 text-left transition-transform hover:scale-105">
//                   <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
//                     MATCH
//                   </p>
//                   <p className="text-xs font-semibold text-green flex items-center gap-1.5">
//                     <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
//                     {matchLabelText}
//                   </p>
//                 </div>

//                 {/* Eye-Catchy Tilted Card with Stylized Studio Backdrop */}
//                 <Link
//                   href={`/product/${heroTopProduct.slug}`}
//                   aria-label={`View ${heroTopProduct.cleanTitle}`}
//                   className="group relative -rotate-3 hover:rotate-0 rounded-3xl bg-gradient-to-br from-[#fff7f0] via-[#ffffff] to-[#fff1e5] p-5 shadow-2xl hover:shadow-3xl transition-all duration-500 w-64 h-64 sm:w-72 sm:h-72 flex flex-col items-center justify-center border-2 border-white/90 overflow-hidden"
//                 >
//                   {/* Studio backdrop lighting behind the shoe */}
//                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,160,90,0.35)_0%,rgba(255,215,170,0.18)_50%,transparent_75%)] pointer-events-none" />
                  
//                   {/* Concentric subtle rings */}
//                   <div className="absolute h-40 w-40 rounded-full border border-orange-200/50 scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
//                   <div className="absolute h-52 w-52 rounded-full border border-orange-100/40 scale-100 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />

//                   {/* Soft grounded shadow under the shoe */}
//                   <div className="absolute bottom-6 left-10 right-10 h-3 rounded-full bg-black/15 blur-md transform scale-x-90 group-hover:scale-x-105 transition-transform duration-300" />

//                   {/* Sneaker Image */}
//                   {heroTopProduct.imageUrl ? (
//                     <div className="relative w-full h-full z-10">
//                       <Image
//                         src={heroTopProduct.imageUrl}
//                         alt={heroTopProduct.cleanTitle}
//                         fill
//                         sizes="300px"
//                         priority
//                         className="object-contain p-2 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 drop-shadow-md"
//                       />
//                     </div>
//                   ) : (
//                     <span className="font-mono text-xs text-muted z-10">Featured shoe</span>
//                   )}

//                   {/* Sleek bottom pill */}
//                   <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
//                     <span className="inline-flex items-center gap-1 rounded-full bg-ink/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-sm">
//                       <span className="text-lime">★</span> {heroTopProduct.brand} · Popular
//                     </span>
//                   </div>
//                 </Link>

//                 {/* Floating card bottom-left: Lowest visible price */}
//                 <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 rounded-xl border border-border/70 bg-surface/95 px-3.5 py-2.5 shadow-md backdrop-blur z-20 text-left transition-transform hover:scale-105">
//                   <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
//                     LOWEST VISIBLE PRICE
//                   </p>
//                   <div className="mt-0.5 flex items-baseline gap-2">
//                     <span className="font-bold text-lg sm:text-xl text-ink">
//                       {formatPrice(heroTopProduct.minPrice)}
//                     </span>
//                     {heroOriginalPrice ? (
//                       <span className="text-xs text-muted line-through">
//                         {heroOriginalPrice}
//                       </span>
//                     ) : null}
//                     {heroTopProduct.maxSaving && heroTopProduct.maxSaving > 0 ? (
//                       <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
//                         Save {formatPrice(heroTopProduct.maxSaving)}
//                       </span>
//                     ) : null}
//                   </div>
//                 </div>
//               </>
//             ) : null}
//           </div>
//         </div>
//       </section>

//       {/* 2. WORTH A LOOK SECTION */}
//       <section aria-labelledby="featured-heading" className="space-y-6">
//         <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
//           <div>
//             <p className="eyebrow">WORTH A LOOK</p>
//             <h2 id="featured-heading" className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
//               Today&apos;s sharper prices
//             </h2>
//           </div>

//           <div className="flex flex-wrap items-center gap-4">
//             <RefreshButton latestChecked={latestChecked} />
//             <Link
//               href="/search"
//               className="text-xs font-semibold text-ink underline underline-offset-4 hover:text-accent transition-colors"
//             >
//               See all products →
//             </Link>
//           </div>
//         </div>

//         {/* 4 Featured ProductCards */}
//         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//           {dashboardProducts.map((product) => (
//             <ProductCard key={product.id} product={product} />
//           ))}
//         </div>
//       </section>

//       {/* 3. DARK PANEL */}
//       <section
//         aria-labelledby="value-heading"
//         className="rounded-panel bg-ink text-white p-8 sm:p-12 md:p-14"
//       >
//         <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
//           {/* Left Intro (5 cols) */}
//           <div className="lg:col-span-5 space-y-4">
//             <p className="font-mono text-xs uppercase tracking-eyebrow text-gray-400">
//               NO CHECKOUT. NO NOISE.
//             </p>
//             <h2
//               id="value-heading"
//               className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white"
//             >
//               We compare. You choose.
//             </h2>
//             <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
//               ShoeScope is an independent discovery layer. We surface the clearest available offer, show what makes it different, and send you to the retailer to buy.
//             </p>
//           </div>

//           {/* Right Columns (7 cols) - 3 Numbered Steps separated by thin lines */}
//           <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
//             {/* Step 1 */}
//             <div className="py-4 sm:py-0 sm:px-6 first:pl-0 space-y-2">
//               <span className="font-mono text-base font-bold text-lime">01</span>
//               <h3 className="font-bold text-base text-white">Search once</h3>
//               <p className="text-xs text-gray-400 leading-relaxed">
//                 Model, brand, colour or category.
//               </p>
//             </div>

//             {/* Step 2 */}
//             <div className="py-4 sm:py-0 sm:px-6 space-y-2">
//               <span className="font-mono text-base font-bold text-lime">02</span>
//               <h3 className="font-bold text-base text-white">Compare clearly</h3>
//               <p className="text-xs text-gray-400 leading-relaxed">
//                 Price, sizes and promotions.
//               </p>
//             </div>

//             {/* Step 3 */}
//             <div className="py-4 sm:py-0 sm:px-6 last:pr-0 space-y-2">
//               <span className="font-mono text-base font-bold text-lime">03</span>
//               <h3 className="font-bold text-base text-white">Buy at source</h3>
//               <p className="text-xs text-gray-400 leading-relaxed">
//                 Continue securely on the store.
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }

import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { RefreshButton } from "@/components/RefreshButton";
import { getFeaturedProducts, getHeroStats, getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/currency";
import { STORES_META } from "@/lib/stores";

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

  const retailers = Object.values(STORES_META);

  return (
    <div>
      {/* 1. HERO */}
      <section
        aria-labelledby="hero-title"
        className="site-container grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-16"
      >
        {/* Left column */}
        <div className="space-y-5">
          <p className="eyebrow">
            One search · {stats.storeCount} trusted retailers
          </p>

          <h1
            id="hero-title"
            className="font-display text-[clamp(2.75rem,4.3vw,5rem)] font-bold leading-[0.92] tracking-tightest"
          >
            <span className="block text-ink">The right pair.</span>
            <span className="block pb-1 italic text-accent">The best price.</span>
          </h1>

          <p className="max-w-md text-[15px] leading-relaxed text-muted">
            Compare current shoe prices and offers without opening a dozen tabs. We
            match the same shoe across leading US stores.
          </p>

          {/* Search box */}
          <form
            action="/search"
            method="GET"
            className="flex max-w-[30rem] items-center rounded-xl border border-border bg-surface p-1.5 pl-4 shadow-search transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
          >
            <input
              type="search"
              name="q"
              placeholder="Search brand, model or style"
              aria-label="Search shoes by brand, model or style"
              className="w-full bg-transparent text-sm text-text placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Find shoes
            </button>
          </form>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-[11px] text-muted">
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

        {/* Right column: wide lavender panel */}
        <div className="relative">
          <div className="relative h-[300px] overflow-hidden rounded-panel border border-white/40 bg-gradient-to-br from-[#d8d5f5] via-[#e2defc] to-[#cec9f7] sm:h-[360px] lg:h-[420px] xl:h-[460px]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-accent/20 blur-2xl" />

            {heroTopProduct ? (
              <Link
                href={`/product/${heroTopProduct.slug}`}
                aria-label={`View ${heroTopProduct.cleanTitle}`}
                className="group absolute inset-x-[5%] inset-y-[9%] -rotate-3 overflow-hidden rounded-3xl border-2 border-white/90 bg-gradient-to-br from-[#fff7f0] via-white to-[#fff1e5] shadow-2xl transition-all duration-500 hover:rotate-0"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,160,90,0.32)_0%,rgba(255,215,170,0.16)_50%,transparent_78%)]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/50 transition-transform duration-700 group-hover:scale-105" />

                {heroTopProduct.imageUrl ? (
                  <Image
                    src={heroTopProduct.imageUrl}
                    alt={heroTopProduct.cleanTitle}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority
                    className="object-contain p-4 drop-shadow-md transition-transform duration-500 group-hover:scale-105 sm:p-6"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted">
                    Featured shoe
                  </span>
                )}

                <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink/90 px-2.5 py-0.5 font-mono text-[10px] font-medium text-white shadow-sm">
                  <span className="text-lime">★</span> {heroTopProduct.brand} · Popular
                </span>
              </Link>
            ) : null}
          </div>

          {heroTopProduct ? (
            <>
              {/* Match badge */}
              <div className="absolute right-3 top-3 z-20 rounded-xl border border-border/70 bg-surface/95 px-3 py-2 text-left shadow-md backdrop-blur lg:-right-3 lg:top-8">
                <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">Match</p>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" />
                  {matchLabelText}
                </p>
              </div>

              {/* Lowest price badge */}
              <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-border/70 bg-surface/95 px-3.5 py-2.5 text-left shadow-md backdrop-blur lg:-bottom-5 lg:-left-6">
                <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                  Lowest visible price
                </p>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-ink">
                    {formatPrice(heroTopProduct.minPrice)}
                  </span>
                  {heroOriginalPrice ? (
                    <span className="text-[11px] text-muted line-through">{heroOriginalPrice}</span>
                  ) : null}
                  {heroTopProduct.maxSaving && heroTopProduct.maxSaving > 0 ? (
                    <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                      Save {formatPrice(heroTopProduct.maxSaving)}
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* 2. RETAILER STRIP */}
      <section aria-label="Retailers we compare" className="border-y border-border">
        <div className="site-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-12">
          <p className="shrink-0 text-[11px] text-muted">Comparing public listings from</p>
          <ul className="flex flex-1 flex-wrap items-center justify-between gap-x-8 gap-y-2">
            {retailers.map((retailer) => (
              <li key={retailer.key}>
                <Link
                  href={`/search?store=${encodeURIComponent(retailer.key)}`}
                  className="text-[13px] font-semibold text-ink transition-colors hover:text-accent"
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
                ShoeScope is an independent discovery layer. We surface the clearest
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