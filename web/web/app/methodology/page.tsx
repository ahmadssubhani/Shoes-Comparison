import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology · How Matching Works",
  description: "Learn how ShoeScope collects, normalises, matches, and scores shoe offers across US retailers.",
};

const METHODOLOGY_STEPS = [
  {
    number: "01",
    title: "Collect",
    text: "Read only public listing and product-detail data permitted by each source.",
  },
  {
    number: "02",
    title: "Normalise",
    text: "Convert names, colours, sizes, prices and store-specific fields to one schema.",
  },
  {
    number: "03",
    title: "Match",
    text: "Prioritise shared style codes where a store publishes them; otherwise brand + model + colour tokens.",
  },
  {
    number: "04",
    title: "Score",
    text: "Label exact and likely matches; unmatched offers stay as their own product.",
  },
  {
    number: "05",
    title: "Compare",
    text: "Rank by visible item price in USD. Delivery and membership conditions are not collected; check the store.",
  },
  {
    number: "06",
    title: "Verify",
    text: "Display collection time, direct source link and a 'report mismatch' path.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
      {/* Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <p className="eyebrow">TRUST BY DESIGN</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            How a match becomes a match
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
          Clear confidence signals keep best-effort product matching honest and make uncertain comparisons easy to inspect.
        </p>
      </div>

      {/* Six White Cards (3x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {METHODOLOGY_STEPS.map((step) => (
          <div
            key={step.number}
            className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-card hover-lift"
          >
            <span className="font-mono text-base font-bold text-accent">
              {step.number}
            </span>
            <h2 className="font-display text-xl font-bold text-ink">
              {step.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {step.text}
            </p>
          </div>
        ))}
      </div>

      {/* Dark Panel: Important Boundary */}
      <section
        aria-labelledby="boundary-heading"
        className="rounded-panel bg-ink text-white p-8 sm:p-12 md:p-14"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Left Intro (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <p className="font-mono text-xs uppercase tracking-eyebrow text-gray-400">
              IMPORTANT BOUNDARY
            </p>
            <h2
              id="boundary-heading"
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white"
            >
              Helpful, not absolute.
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              ShoeScope reports the best visible price from the most recent successful collection. The retailer page remains the source of truth for price, stock, delivery and promotion eligibility.
            </p>
            <p className="text-xs font-mono text-lime/90 pt-2">
              Note: 6pm and Zappos share one catalogue (same parent company inventory).
            </p>
          </div>

          {/* Right Confidence Tiers (6 cols) */}
          <div className="lg:col-span-6 space-y-4 rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="space-y-1">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green" />
                Exact · Shared style code or reviewed match
              </p>
              <p className="text-xs text-gray-400 pl-4">
                Identical manufacturer SKU or style code published across retailer listings.
              </p>
            </div>

            <div className="space-y-1 pt-3 border-t border-white/10">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Likely · Strong brand, model and colour agreement
              </p>
              <p className="text-xs text-gray-400 pl-4">
                Normalized tokens for brand, audience, model name, and colorway agree across sources.
              </p>
            </div>

            <div className="space-y-1 pt-3 border-t border-white/10">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Possible · Kept separate until reviewed
              </p>
              <p className="text-xs text-gray-400 pl-4">
                Ambiguous listings are never merged prematurely; unmatched offers remain distinct products.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
