import type { Metadata } from "next";
import { CatalogView } from "@/components/CatalogView";
import { getProducts } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  return {
    title: q ? `Search results for "${q}"` : "Product Catalogue",
    description: "Browse and compare shoe offers across leading US retailers.",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const catalog = await getProducts(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
      {/* Title Area with Eyebrow */}
      <div className="space-y-1.5">
        <p className="eyebrow">CATALOGUE · ALL SOURCES</p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
          {filters.q ? `Results for "${filters.q}"` : "Browse shoe offers"}
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          Real-time pricing, stock status, and savings compared across 5 US retailers.
        </p>
      </div>

      <CatalogView
        products={catalog.products}
        facets={catalog.facets}
        currentFilters={filters}
      />
    </div>
  );
}

