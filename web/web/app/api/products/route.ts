import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const catalog = await getProducts(filters);
    const limit = filters.limit || 24;
    const page = filters.page || 1;
    const start = (page - 1) * limit;
    const paginated = catalog.products.slice(start, start + limit);

    return NextResponse.json({
      data: paginated,
      total: catalog.total,
      page,
      limit,
      facets: catalog.facets,
      source: catalog.source,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch products" },
      { status: 500 },
    );
  }
}

