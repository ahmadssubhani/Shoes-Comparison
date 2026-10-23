import type { ProductFilters } from "./types";

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function list(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value.join(",") : value;
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function num(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): ProductFilters {
  const getParam = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    return first(searchParams[key]);
  };

  const getList = (key: string): string[] | undefined => {
    if (searchParams instanceof URLSearchParams) {
      const all = searchParams.getAll(key);
      if (!all.length) return undefined;
      const flat = all.join(",");
      return list(flat);
    }
    return list(searchParams[key]);
  };

  const q = getParam("q")?.trim() || undefined;
  const brand = getList("brand");
  const store = getList("store");
  const price = getParam("price") || undefined;
  const size = getParam("size")?.trim() || undefined;
  const inStock = getParam("in_stock") === "true" || getParam("in_stock") === "1" || getParam("inStock") === "true";
  const saleOnly = getParam("sale_only") === "true" || getParam("sale_only") === "1" || getParam("saleOnly") === "true";
  const sort = (getParam("sort") as ProductFilters["sort"]) || "recommended";
  const page = num(getParam("page")) || 1;
  const limit = num(getParam("limit")) || 24;

  let minPrice = num(getParam("minPrice"));
  let maxPrice = num(getParam("maxPrice"));

  if (price === "under75") {
    maxPrice = 75;
  } else if (price === "75to120") {
    minPrice = 75;
    maxPrice = 120;
  } else if (price === "over120") {
    minPrice = 120;
  } else if (price === "under80") {
    maxPrice = 80;
  }

  return {
    q,
    brand,
    store,
    price,
    minPrice,
    maxPrice,
    size,
    inStock: inStock ? true : undefined,
    saleOnly: saleOnly ? true : undefined,
    sort,
    page,
    limit,
  };
}

export function filtersToSearchParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.brand?.length) params.set("brand", filters.brand.join(","));
  if (filters.store?.length) params.set("store", filters.store.join(","));
  if (filters.price) params.set("price", filters.price);
  if (filters.minPrice != null && !filters.price) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null && !filters.price) params.set("maxPrice", String(filters.maxPrice));
  if (filters.size) params.set("size", filters.size);
  if (filters.inStock) params.set("in_stock", "true");
  if (filters.saleOnly) params.set("sale_only", "true");
  if (filters.sort && filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export const filtersToParams = filtersToSearchParams;

