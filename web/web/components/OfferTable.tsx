import { formatPrice } from "@/lib/currency";
import { getStoreDisplayName } from "@/lib/stores";
import type { Offer } from "@/lib/types";

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

export function OfferTable({ offers }: { offers: Offer[] }) {
  if (!offers.length) {
    return <p className="text-sm text-muted">No retailer offers found.</p>;
  }

  // Sort offers by price ascending
  const sortedOffers = [...offers].sort((a, b) => {
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });

  const lowestPrice = sortedOffers.find((o) => o.price != null)?.price;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm divide-y divide-border">
        <thead className="bg-bg/60 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          <tr>
            <th scope="col" className="py-3 px-4">Store</th>
            <th scope="col" className="py-3 px-4">Price</th>
            <th scope="col" className="py-3 px-4 hidden sm:table-cell">Saving</th>
            <th scope="col" className="py-3 px-4 hidden md:table-cell">Stock</th>
            <th scope="col" className="py-3 px-4 hidden lg:table-cell">Checked</th>
            <th scope="col" className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-xs sm:text-sm">
          {sortedOffers.map((offer) => {
            const isLowest = offer.price != null && offer.price === lowestPrice;
            const originalPrice =
              offer.compareAtPrice && offer.price && offer.compareAtPrice > offer.price
                ? formatPrice(offer.compareAtPrice)
                : null;
            const saving = offer.saving && offer.saving > 0 ? formatPrice(offer.saving) : null;
            const inStock = offer.inStock ?? true;

            return (
              <tr
                key={offer.id}
                className={`transition-colors hover:bg-bg/40 ${isLowest ? "bg-accent/5 font-medium" : ""}`}
              >
                {/* Store Name & Best Price badge */}
                <td className="py-3.5 px-4 font-semibold text-ink">
                  <div className="flex items-center gap-2">
                    <span>{getStoreDisplayName(offer.store)}</span>
                    {isLowest && (
                      <span className="rounded-full bg-green/15 text-green text-[10px] font-mono px-2 py-0.5 font-bold uppercase">
                        Lowest
                      </span>
                    )}
                  </div>
                </td>

                {/* Price & Original Struck-through */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-bold text-ink">
                    {formatPrice(offer.price) || "Check store"}
                  </span>
                  {originalPrice && (
                    <span className="ml-1.5 text-xs text-muted line-through">
                      {originalPrice}
                    </span>
                  )}
                </td>

                {/* Saving */}
                <td className="py-3.5 px-4 hidden sm:table-cell whitespace-nowrap">
                  {saving ? (
                    <span className="inline-flex rounded-full bg-lime/90 px-2 py-0.5 font-mono text-xs font-bold text-ink">
                      Save {saving}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>

                {/* Stock Status */}
                <td className="py-3.5 px-4 hidden md:table-cell">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      inStock ? "text-green" : "text-muted"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        inStock ? "bg-green" : "bg-gray-400"
                      }`}
                    />
                    {inStock ? "In stock" : "Out of stock"}
                  </span>
                </td>

                {/* Checked Time */}
                <td className="py-3.5 px-4 hidden lg:table-cell font-mono text-[11px] text-muted whitespace-nowrap">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                      offer.isStale ? "bg-amber-500" : "bg-green"
                    }`}
                  />
                  {offer.isStale ? "May be stale" : formatTimestamp(offer.scrapedAt)}
                </td>

                {/* Outbound Link */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm hover:border-ink hover:bg-bg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span>Visit store</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
