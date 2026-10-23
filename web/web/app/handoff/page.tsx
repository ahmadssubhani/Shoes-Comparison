import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MVP Build Handoff · Specifications",
  description: "Product requirements, core flow, data contract, API specs, and acceptance criteria.",
};

const USER_FLOW_STEPS = [
  { num: "01", title: "Land / search", desc: "Hero search or quick chip" },
  { num: "02", title: "Browse results", desc: "Full catalog grid" },
  { num: "03", title: "Filter + sort", desc: "Brand, price, availability" },
  { num: "04", title: "Open product", desc: "Detail & store offers" },
  { num: "05", title: "Compare offers", desc: "Price spread & AI analysis" },
  { num: "06", title: "Visit retailer", desc: "Outbound link to buy" },
];

const ROUTE_INVENTORY = [
  {
    route: "/",
    purpose: "Discovery landing",
    behaviour: "Global search, featured savings, retailer trust strip, quick value props",
  },
  {
    route: "/search",
    purpose: "Product catalogue",
    behaviour: "Search, filters (retailer, brand, price, size, stock), sort, cards, load more",
  },
  {
    route: "/product/:slug",
    purpose: "Product detail",
    behaviour: "Size selection, matched offers table, freshness indicator, outbound links, problem reporting",
  },
  {
    route: "/compare?ids=a,b",
    purpose: "Comparison",
    behaviour: "2 products side-by-side, shareable URL, store price spread, Gemini AI summary",
  },
  {
    route: "/saved",
    purpose: "Saved products",
    behaviour: "Local storage only; no account needed; live count badge in header",
  },
  {
    route: "/retailers",
    purpose: "Source status",
    behaviour: "Coverage, last refresh timestamp, active/stale indicators, fallback policy",
  },
  {
    route: "/methodology",
    purpose: "Trust + matching",
    behaviour: "Confidence rules (Exact, Likely, Single), disclaimers, honest single-catalog note",
  },
  {
    route: "/states",
    purpose: "UI state reference",
    behaviour: "Live gallery: loading skeletons, empty results, partial data, out of stock, error with retry",
  },
  {
    route: "/handoff",
    purpose: "Development scope",
    behaviour: "Full MVP requirements, data contracts, API surface, DoD, acceptance criteria",
  },
];

const DATA_CONTRACT = [
  {
    entity: "Product",
    fields: "id, brand, title, match_key, style_code, image_url",
    notes: "Canonical record used by catalogue and matching engine.",
  },
  {
    entity: "Offer",
    fields: "id, product_id, store, store_title, price, compare_at_price, discount_pct, currency, url, image_url",
    notes: "Nullable original price; never infer a discount without a verified compare_at_price.",
  },
  {
    entity: "Availability",
    fields: "sizes (jsonb), in_stock, scraped_at",
    notes: "Sizes are missing for most offers; show 'not listed' gracefully without crashing.",
  },
  {
    entity: "Report",
    fields: "id, product_id, offer_id, kind, note, created_at",
    notes: "Insert-only for the public with anon key; RLS prevents public reading.",
  },
  {
    entity: "Retailer",
    fields: "store, offer count, last scraped_at",
    notes: "Computed derived entity to expose stale (>48h) or partial collection states.",
  },
];

const API_ENDPOINTS = [
  {
    method: "GET",
    endpoint: "/api/products",
    desc: "Search, filter by brand/store/price/stock, sort, pagination limit.",
  },
  {
    method: "GET",
    endpoint: "/api/products/[id]",
    desc: "Canonical product record + match level + all verified retailer offers.",
  },
  {
    method: "GET",
    endpoint: "/api/retailers",
    desc: "Source status, offer counts, and last successful collection timestamp.",
  },
  {
    method: "GET",
    endpoint: "/api/health",
    desc: "Database connectivity check; safe for monitoring, exposes zero secrets.",
  },
  {
    method: "POST",
    endpoint: "/api/reports",
    desc: "Record user mismatch or stale-price reports (validated, rate-limited, anon key insert).",
  },
  {
    method: "POST",
    endpoint: "/api/jobs/collect",
    desc: "Manual trigger stub returning 501 Not Implemented (collection runs via Python CLI/scheduler).",
  },
  {
    method: "POST",
    endpoint: "/api/compare",
    desc: "Gemini AI synthesis between two shoes (in-memory cached, rate-limited, resilient fallback).",
  },
];

const ACCEPTANCE_CRITERIA = [
  {
    id: "AC-01",
    title: "Source resilience",
    desc: "At least 3 of 5 approved sources collect usable records in a normal run.",
  },
  {
    id: "AC-02",
    title: "Null safety",
    desc: "A missing price, image, size set or source does not break any page.",
  },
  {
    id: "AC-03",
    title: "Facet filtering",
    desc: "Search, brand, retailer, price, size and discount filters work when data exists.",
  },
  {
    id: "AC-04",
    title: "Matching transparency",
    desc: "Exact and likely matches show their level; unmatched offers stay separate.",
  },
  {
    id: "AC-05",
    title: "Safe outbound links",
    desc: "Outbound links preserve the correct source offer and open safely in a new tab.",
  },
  {
    id: "AC-06",
    title: "Cross-device responsiveness",
    desc: "Core flows work cleanly at 360px, 768px and 1440px viewport widths.",
  },
  {
    id: "AC-07",
    title: "Accessibility baseline",
    desc: "Keyboard focus, form labels, contrast and reduced motion meet an MVP accessibility pass.",
  },
  {
    id: "AC-08",
    title: "Operational documentation",
    desc: "A README documents setup, collectors, scheduler, known limitations and the replacement-source process.",
  },
];

const DELIVERY_SEQUENCE = [
  "Store check",
  "Collectors + fixtures",
  "Matching + database",
  "Frontend flows",
  "AI compare",
  "QA + handoff",
];

export default function HandoffPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-16">
      {/* 1. Header & Definition of Done Card */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-3">
          <p className="eyebrow">PRODUCT REQUIREMENTS · V1.0</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            ShoeScope MVP build handoff
          </h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl">
            A proof of concept for collecting, matching and comparing publicly visible shoe offers from five US retailers. This prototype is the interaction and visual reference.
          </p>
        </div>

        <div className="lg:col-span-5 rounded-panel bg-ink text-white p-7 space-y-3 shadow-xl">
          <span className="font-mono text-xs uppercase tracking-eyebrow text-lime font-bold">
            DEFINITION OF DONE
          </span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            5 sources / 1 market / 0 checkout
          </p>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Responsive browsing, exact/likely matching, source links, filters, comparison and resilient missing-data states.
          </p>
        </div>
      </div>

      {/* 2. Core User Flow */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">CORE USER FLOW</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Browse to retailer in six steps
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {USER_FLOW_STEPS.map((step, idx) => (
            <div
              key={step.num}
              className="rounded-xl border border-border bg-surface p-4 space-y-2 relative shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">
                  {step.num}
                </span>
                {idx < USER_FLOW_STEPS.length - 1 && (
                  <span className="text-muted text-xs hidden lg:inline">→</span>
                )}
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-ink">{step.title}</h3>
              <p className="text-[11px] text-muted leading-tight">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Page Inventory Table */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">REQUIRED ROUTES</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Page inventory
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm divide-y divide-border">
            <thead className="bg-bg/60 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              <tr>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Key Behaviours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROUTE_INVENTORY.map((item) => (
                <tr key={item.route} className="hover:bg-bg/40">
                  <td className="py-3 px-4 font-mono font-semibold text-accent whitespace-nowrap">
                    {item.route}
                  </td>
                  <td className="py-3 px-4 font-medium text-ink whitespace-nowrap">
                    {item.purpose}
                  </td>
                  <td className="py-3 px-4 text-muted text-xs">
                    {item.behaviour}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Data Contract Table */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">DATA CONTRACT</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Minimum product + offer model
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm divide-y divide-border">
            <thead className="bg-bg/60 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              <tr>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Required Fields</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DATA_CONTRACT.map((item) => (
                <tr key={item.entity} className="hover:bg-bg/40">
                  <td className="py-3.5 px-4 font-bold text-ink">
                    {item.entity}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-text">
                    {item.fields}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Suggested API Surface */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">SUGGESTED API</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Small, stable surface
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {API_ENDPOINTS.map((api) => (
            <div
              key={api.endpoint}
              className="rounded-xl border border-border bg-surface p-4 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">
                  {api.method}
                </span>
                <span className="font-mono text-[11px] text-muted truncate max-w-[160px]">
                  {api.endpoint}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {api.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Acceptance Criteria (AC-01..AC-08) */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">ACCEPTANCE CRITERIA</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Ship when these are true
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACCEPTANCE_CRITERIA.map((ac) => (
            <div
              key={ac.id}
              className="rounded-xl border border-border bg-surface p-4 space-y-2 shadow-sm hover-lift"
            >
              <span className="font-mono text-xs font-bold text-accent">
                {ac.id}
              </span>
              <h3 className="font-bold text-sm text-ink">{ac.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{ac.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Delivery Sequence */}
      <section className="space-y-6 pt-6 border-t border-border">
        <div className="space-y-1">
          <p className="eyebrow">DELIVERY SEQUENCE</p>
          <h2 className="font-display text-2xl font-bold text-ink">
            Engineering execution path
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DELIVERY_SEQUENCE.map((item, idx) => (
            <div key={item} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-xs font-semibold text-text shadow-sm">
                {item}
              </span>
              {idx < DELIVERY_SEQUENCE.length - 1 && (
                <span className="text-muted text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Explicitly Out of Scope */}
      <section className="rounded-panel border border-border bg-[#faf7f2] p-8 space-y-3">
        <p className="eyebrow text-muted">EXPLICITLY OUT OF SCOPE</p>
        <h2 className="font-display text-2xl font-bold text-ink">
          Keep the assessment small
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Accounts, checkout, payments, ordering, returns, price history, alerts, recommendations, native mobile apps, international markets, automatic currency conversion, login-only data, CAPTCHA bypassing and real-time price guarantees.
        </p>
      </section>
    </div>
  );
}
