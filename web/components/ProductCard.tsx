"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/currency";
import type { Product } from "@/lib/types";
import { useAppState } from "./AppState";
import { IconHeart } from "./Icons";

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

export function ProductCard({ product }: { product: Product }) {
  const { isSaved, toggleSaved, isCompared, toggleCompare, canAddCompare } = useAppState();

  const saved = isSaved(product.id);
  const compared = isCompared(product.id);
  const canCompare = canAddCompare(product.id);

  const price = formatPrice(product.minPrice);
  const originalPrice =
    product.bestOffer?.compareAtPrice &&
    product.bestOffer?.price &&
    product.bestOffer.compareAtPrice > product.bestOffer.price
      ? formatPrice(product.bestOffer.compareAtPrice)
      : null;

  const saving = product.maxSaving && product.maxSaving > 0 ? formatPrice(product.maxSaving) : null;
  const storeLabel =
    product.storeCount >= 2 ? `Best of ${product.storeCount} store offers` : "Listed at 1 store";

  const checkedTime = formatTimestamp(product.latestChecked);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-[#e5e1d6] bg-white shadow-[0_2px_10px_rgba(31,29,24,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(31,29,24,0.12)]">
      {/* Clickable Area for Image and Product Page */}
      <Link
        href={`/product/${product.slug}`}
        aria-label={`View details for ${product.cleanTitle}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="relative aspect-[2.68/1] w-full overflow-hidden bg-[#f4f1ea]">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.cleanTitle}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-mono text-muted">
              No photo available
            </div>
          )}
        </div>
      </Link>

      {/* Badges on top of image (Saving badge & Heart button) */}
      <div className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between">
        {saving ? (
          <span className="pointer-events-auto rounded-full bg-lime px-2 py-1 font-mono text-[9px] font-bold text-ink shadow-sm">
            Save {saving}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSaved(product.id);
          }}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.cleanTitle} from saved` : `Save ${product.cleanTitle}`}
          className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            saved
              ? "border-accent bg-accent text-white"
              : "border-[#e5e1d6] bg-white text-muted hover:text-text"
          }`}
        >
          <IconHeart filled={saved} className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/product/${product.slug}`}
          className="flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* Eyebrow: Brand & Category */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted truncate">
              {product.brand}
              {product.category ? ` · ${product.category}` : ""}
            </span>
          </div>

          {/* Title & Price Row */}
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <h3 className="min-w-0 flex-1 font-bold text-[13px] leading-snug text-text line-clamp-1 group-hover:text-accent transition-colors">
              {product.cleanTitle}
            </h3>
            <div className="shrink-0 text-right">
              <span className="font-bold text-[13px] text-ink">
                {price || "Check store"}
              </span>
              {originalPrice ? (
                <span className="ml-1 text-[10px] text-muted line-through">
                  {originalPrice}
                </span>
              ) : null}
            </div>
          </div>

          {/* Store count label */}
          <p className="mt-1 text-[10px] font-medium text-green">
            {storeLabel}
          </p>

          {/* Freshness Status */}
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-muted">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                product.isStale ? "bg-amber-500" : "bg-green"
              }`}
            />
            <span>
              {product.isStale
                ? "May be out of date"
                : `Checked ${checkedTime}`}
            </span>
          </div>
        </Link>

        {/* Action Button: Add to comparison */}
        <div className="mt-2 border-t border-[#eeeae2] pt-1.5">
          <button
            type="button"
            title={
              compared
                ? "Remove from comparison"
                : !canCompare
                ? "Comparison is full — this will replace the first selected shoe"
                : "Add to comparison"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            className={`w-full rounded-md border px-3 py-1.5 text-[10px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              compared
                ? "border-[#171612] bg-[#171612] text-white shadow-sm"
                : "border-[#e5e1d6] bg-white text-ink hover:border-ink hover:bg-[#faf9f6]"
            }`}
          >
            {compared ? "✓ Added to comparison" : "+ Add to comparison"}
          </button>
        </div>
      </div>
    </article>
  );
}
