import type { Metadata } from "next";
import { SavedList } from "@/components/SavedList";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Shortlist",
  description: "Browse saved shoes stored locally in your browser.",
};

export default async function SavedPage() {
  const { products } = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <p className="eyebrow">YOUR SHORTLIST</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Saved pairs
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-md">
          Browser-local for the MVP - no account or personal data needed.
        </p>
      </div>

      <SavedList allProducts={products} />
    </div>
  );
}
