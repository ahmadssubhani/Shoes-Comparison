import type { Metadata } from "next";
import { getRetailerStatuses } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Source Status · Retailer Coverage",
  description: "Status, collection recency, and coverage for our 5 monitored US shoe retailers.",
};

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "Not collected yet";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Not collected yet";
    const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day}, ${time}`;
  } catch {
    return "Not collected yet";
  }
}

export default async function RetailersPage() {
  const stores = await getRetailerStatuses();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
      {/* Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <p className="eyebrow">SOURCE STATUS</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            Five stores, one market
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
          The first release is intentionally US-only and USD-only. These retailers maximise catalogue overlap while keeping normalisation manageable.
        </p>
      </div>

      {/* 3x2 Grid of White Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div
            key={store.store}
            className="rounded-card border border-border bg-surface p-6 space-y-5 shadow-card hover-lift flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Header: Number and Active status dot */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-accent">
                  {store.index}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
                    store.isStale
                      ? "bg-amber-500/10 text-amber-700"
                      : "bg-green/10 text-green"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      store.isStale ? "bg-amber-500" : "bg-green"
                    }`}
                  />
                  {store.isStale ? "Stale" : "Active source"}
                </span>
              </div>

              {/* Store Name and Description */}
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">
                  {store.name}
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {store.description}
                </p>
              </div>

              {/* Metadata rows */}
              <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted">Coverage</span>
                  <span className="font-semibold text-text">{store.coverage}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted">Refresh target</span>
                  <span className="font-mono text-text">{store.refreshTarget}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted">Offers collected</span>
                  <span className="font-mono font-bold text-ink">{store.offerCount}</span>
                </div>
                <div className="py-0.5">
                  <span className="text-muted block text-[11px] mb-0.5">Extracted fields</span>
                  <span className="font-mono text-[11px] text-text block bg-bg/60 p-2 rounded border border-border/50">
                    {store.fields}
                  </span>
                </div>
              </div>
            </div>

            {/* Collection Recency Footer */}
            <div className="pt-3 border-t border-border/60">
              <span className="font-mono text-[10px] text-muted block">
                Last collected: {formatTimestamp(store.lastCollected)}
              </span>
            </div>
          </div>
        ))}

        {/* Sixth Card: Fallback Policy */}
        <div className="rounded-card border border-border bg-surface p-6 space-y-4 shadow-card hover-lift flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-mono text-sm font-bold text-accent">
              FALLBACK POLICY
            </span>
            <h2 className="font-display text-2xl font-bold text-ink">
              A source can be replaced
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              If robots rules, terms, blocking, or page complexity make a source unsuitable, substitute another multi-brand retailer. Never bypass login, CAPTCHA or access controls.
            </p>
          </div>

          <div className="rounded-xl bg-[#faf7f2] border border-border p-4 text-xs font-mono text-muted space-y-1">
            <p className="text-ink font-semibold">Replacement criteria:</p>
            <p>1. Must permit automated public collection</p>
            <p>2. High catalog overlap with US market</p>
            <p>3. Transparent USD prices & model titles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
