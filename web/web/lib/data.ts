import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { hasProductImage, isNonShoeTitle } from "./listingGuard";
import { cleanTitle, makeProductSlug, parseIdFromSlug } from "./slug";
import { STORES_META, getStoreDisplayName } from "./stores";
import type {
  CatalogResult,
  Facets,
  HeroStats,
  MatchLevel,
  Offer,
  Product,
  ProductFilters,
  RetailerStatus,
} from "./types";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  return { url, anon };
}

// In-memory cache for loaded raw records to avoid redundant DB rounds while serving SSR pages
let catalogCache: {
  products: Product[];
  source: "supabase" | "json";
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 1 minute

function isOfferStale(scrapedAt: string | null): boolean {
  if (!scrapedAt) return false;
  const time = Date.parse(scrapedAt);
  if (Number.isNaN(time)) return false;
  const diffHours = (Date.now() - time) / (1000 * 60 * 60);
  return diffHours > 24 * 6;
  // return diffHours > 48;

}

function computeSaving(price: number | null, compareAt: number | null): number | null {
  if (price != null && compareAt != null && compareAt > price) {
    return Number((compareAt - price).toFixed(2));
  }
  return null;
}

type RawProductRow = {
  id: string;
  brand: string | null;
  title: string | null;
  match_key: string | null;
  image_url: string | null;
  style_code: string | null;
};

type RawOfferRow = {
  id: string;
  product_id: string;
  store: string;
  store_title: string | null;
  price: number | null;
  compare_at_price: number | null;
  discount_pct: number | null;
  sizes: unknown;
  in_stock: boolean | null;
  url: string | null;
  image_url: string | null;
  currency: string | null;
  category: string | null;
  scraped_at: string | null;
  brand?: string | null;
  colorway?: string | null;
};

async function fetchAllFromSupabase(
  client: any,
  table: string,
): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < batch) break;
    from += batch;
  }
  return all;
}

async function loadFromSupabase(): Promise<{ products: Product[]; source: "supabase" }> {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase credentials missing");
  const client = createClient(env.url, env.anon);

  const [rawProducts, rawOffers] = await Promise.all([
    fetchAllFromSupabase(client, "products") as Promise<RawProductRow[]>,
    fetchAllFromSupabase(client, "offers") as Promise<RawOfferRow[]>,
  ]);

  // Group offers by product_id
  const offersByProductId = new Map<string, Offer[]>();

  for (const row of rawOffers) {
    const rawSizes = row.sizes;
    const sizes = Array.isArray(rawSizes) ? rawSizes.map(String) : [];
    const price = row.price == null ? null : Number(row.price);
    const compareAt = row.compare_at_price == null ? null : Number(row.compare_at_price);
    const saving = computeSaving(price, compareAt);
    const scrapedAt = row.scraped_at ? String(row.scraped_at) : null;

    const offer: Offer = {
      id: String(row.id || ""),
      productId: String(row.product_id || ""),
      store: String(row.store || "").toLowerCase().trim(),
      storeTitle: String(row.store_title || "Untitled Offer"),
      brand: row.brand ? String(row.brand) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      price,
      compareAtPrice: compareAt,
      discountPct: row.discount_pct == null ? null : Number(row.discount_pct),
      sizes,
      inStock: typeof row.in_stock === "boolean" ? row.in_stock : null,
      url: String(row.url || "#"),
      currency: String(row.currency || "USD").toUpperCase(),
      category: row.category ? String(row.category) : null,
      scrapedAt,
      saving,
      isStale: isOfferStale(scrapedAt),
    };

    const list = offersByProductId.get(offer.productId) || [];
    list.push(offer);
    offersByProductId.set(offer.productId, list);
  }

  const products: Product[] = [];

  for (const rawProd of rawProducts) {
    const prodId = String(rawProd.id);
    const prodOffers = offersByProductId.get(prodId) || [];
    const brand = String(rawProd.brand || "Footwear").trim();
    const rawTitle = String(rawProd.title || "Footwear");
    const cleaned = cleanTitle(rawTitle);
    const matchKey = String(rawProd.match_key || "");
    const styleCode = rawProd.style_code ? String(rawProd.style_code).trim() : null;
    const prodImageUrl = rawProd.image_url ? String(rawProd.image_url) : null;

    // Determine category from offers if present
    const category = prodOffers.find((o) => o.category)?.category || null;

    // Currency check: Never compare across different currencies (all USD today)
    const usdOffers = prodOffers.filter((o) => !o.currency || o.currency === "USD");
    const validOffers = usdOffers.length ? usdOffers : prodOffers;

    // Distinct stores
    const distinctStores = Array.from(new Set(validOffers.map((o) => o.store)));
    const storeCount = distinctStores.length;

    // Match Level:
    // "exact" only if 2+ stores share the same style_code
    // "likely" if 2+ stores matched on brand+model+colour
    // "single" if one store
    let matchLevel: MatchLevel = "single";
    if (storeCount >= 2) {
      matchLevel = styleCode ? "exact" : "likely";
    }

    // Best offer: cheapest in-stock offer, else cheapest offer overall
    let bestOffer: Offer | null = null;
    const pricedOffers = validOffers.filter((o) => o.price != null);

    if (pricedOffers.length > 0) {
      const inStockPriced = pricedOffers.filter((o) => o.inStock === true);
      if (inStockPriced.length > 0) {
        bestOffer = inStockPriced.reduce((min, cur) =>
          cur.price! < min.price! ? cur : min,
        );
      } else {
        bestOffer = pricedOffers.reduce((min, cur) =>
          cur.price! < min.price! ? cur : min,
        );
      }
    } else if (validOffers.length > 0) {
      bestOffer = validOffers[0];
    }

    const minPrice = bestOffer?.price ?? null;

    // Max saving
    let maxSaving: number | null = null;
    for (const off of validOffers) {
      if (off.saving != null && off.saving > 0) {
        if (maxSaving == null || off.saving > maxSaving) {
          maxSaving = off.saving;
        }
      }
    }

    // Latest checked timestamp across offers
    let latestChecked: string | null = null;
    for (const off of validOffers) {
      if (off.scrapedAt) {
        if (!latestChecked || Date.parse(off.scrapedAt) > Date.parse(latestChecked)) {
          latestChecked = off.scrapedAt;
        }
      }
    }

    // Primary image
    const imageUrl = prodImageUrl || bestOffer?.imageUrl || validOffers[0]?.imageUrl || null;

    const isStale = isOfferStale(latestChecked);
    const slug = makeProductSlug(cleaned, prodId);

    products.push({
      id: prodId,
      brand,
      title: rawTitle,
      cleanTitle: cleaned,
      matchKey,
      styleCode,
      imageUrl,
      category,
      offers: validOffers,
      bestOffer,
      minPrice,
      maxSaving,
      storeCount,
      distinctStores,
      matchLevel,
      latestChecked,
      isStale,
      slug,
    });
  }

  return { products: keepListableProducts(products), source: "supabase" };
}

function keepListableProducts(products: Product[]): Product[] {
  return products.filter((product) => {
    if (!hasProductImage(product.imageUrl)) return false;
    if (isNonShoeTitle(product.title) || isNonShoeTitle(product.cleanTitle)) return false;
    if (product.offers.some((offer) => isNonShoeTitle(offer.storeTitle))) return false;
    return true;
  });
}

async function findLocalFile(filename: string): Promise<string | null> {
  const candidates = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), filename),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "..", filename),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "data", filename),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "data", filename),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(/*turbopackIgnore: true*/ candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

async function loadFromJson(): Promise<{ products: Product[]; source: "json" }> {
  const offersPath = await findLocalFile("offers.json");
  const productsPath = await findLocalFile("products.json");

  if (!offersPath) {
    throw new Error("Local data files not found");
  }

  const rawOffersText = await fs.readFile(/*turbopackIgnore: true*/ offersPath, "utf8");
  const rawOffers = JSON.parse(rawOffersText) as any[];

  let rawProducts: any[] = [];
  if (productsPath) {
    try {
      const rawProductsText = await fs.readFile(/*turbopackIgnore: true*/ productsPath, "utf8");
      rawProducts = JSON.parse(rawProductsText);
    } catch {
      rawProducts = [];
    }
  }

  // If products.json has products with offers already grouped
  if (rawProducts.length > 0 && Array.isArray(rawProducts[0]?.offers)) {
    const products: Product[] = rawProducts.map((p, idx) => {
      const prodId = p.id || `local-${idx + 1}`;
      const brand = String(p.brand || "Footwear").trim();
      const rawTitle = String(p.title || "Footwear");
      const cleaned = cleanTitle(rawTitle);
      const matchKey = String(p.match_key || "");
      const styleCode = p.style_code ? String(p.style_code) : null;
      const prodImage = p.image_url ? String(p.image_url) : null;

      const offers: Offer[] = (p.offers || []).map((o: any, oIdx: number) => {
        const price = o.price == null ? null : Number(o.price);
        const compareAt = o.compare_at_price == null ? null : Number(o.compare_at_price);
        const saving = computeSaving(price, compareAt);
        const scrapedAt = o.scraped_at ? String(o.scraped_at) : null;
        return {
          id: String(o.id || `${prodId}-offer-${oIdx + 1}`),
          productId: prodId,
          store: String(o.store || "").toLowerCase().trim(),
          storeTitle: String(o.store_title || rawTitle),
          brand: o.brand ? String(o.brand) : brand,
          imageUrl: o.image_url ? String(o.image_url) : prodImage,
          price,
          compareAtPrice: compareAt,
          discountPct: o.discount_pct == null ? null : Number(o.discount_pct),
          sizes: Array.isArray(o.sizes) ? o.sizes.map(String) : [],
          inStock: typeof o.in_stock === "boolean" ? o.in_stock : null,
          url: String(o.url || "#"),
          currency: String(o.currency || "USD").toUpperCase(),
          category: o.category ? String(o.category) : null,
          scrapedAt,
          saving,
          isStale: isOfferStale(scrapedAt),
        };
      });

      const usdOffers = offers.filter((o) => !o.currency || o.currency === "USD");
      const validOffers = usdOffers.length ? usdOffers : offers;
      const distinctStores = Array.from(new Set(validOffers.map((o) => o.store)));
      const storeCount = distinctStores.length;

      let matchLevel: MatchLevel = "single";
      if (storeCount >= 2) {
        matchLevel = styleCode ? "exact" : "likely";
      }

      let bestOffer: Offer | null = null;
      const pricedOffers = validOffers.filter((o) => o.price != null);
      if (pricedOffers.length > 0) {
        const inStockPriced = pricedOffers.filter((o) => o.inStock === true);
        bestOffer = inStockPriced.length > 0
          ? inStockPriced.reduce((min, cur) => (cur.price! < min.price! ? cur : min))
          : pricedOffers.reduce((min, cur) => (cur.price! < min.price! ? cur : min));
      } else if (validOffers.length > 0) {
        bestOffer = validOffers[0];
      }

      const minPrice = bestOffer?.price ?? null;
      let maxSaving: number | null = null;
      for (const off of validOffers) {
        if (off.saving != null && off.saving > 0) {
          if (maxSaving == null || off.saving > maxSaving) maxSaving = off.saving;
        }
      }

      let latestChecked: string | null = null;
      for (const off of validOffers) {
        if (off.scrapedAt) {
          if (!latestChecked || Date.parse(off.scrapedAt) > Date.parse(latestChecked)) {
            latestChecked = off.scrapedAt;
          }
        }
      }

      return {
        id: prodId,
        brand,
        title: rawTitle,
        cleanTitle: cleaned,
        matchKey,
        styleCode,
        imageUrl: prodImage || bestOffer?.imageUrl || validOffers[0]?.imageUrl || null,
        category: validOffers.find((o) => o.category)?.category || null,
        offers: validOffers,
        bestOffer,
        minPrice,
        maxSaving,
        storeCount,
        distinctStores,
        matchLevel,
        latestChecked,
        isStale: isOfferStale(latestChecked),
        slug: makeProductSlug(cleaned, prodId),
      };
    });

    return { products: keepListableProducts(products), source: "json" };
  }

  // Fallback: group flat offers by match_key
  const byMatchKey = new Map<string, any[]>();
  for (const off of rawOffers) {
    const key = off.match_key || `${off.brand}|${off.store_title}`;
    const list = byMatchKey.get(key) || [];
    list.push(off);
    byMatchKey.set(key, list);
  }

  const products: Product[] = [];
  let index = 0;
  for (const [key, offerItems] of byMatchKey.entries()) {
    index += 1;
    const first = offerItems[0];
    const prodId = `json-prod-${index}`;
    const brand = String(first.brand || "Footwear").trim();
    const rawTitle = String(first.store_title || "Footwear");
    const cleaned = cleanTitle(rawTitle);

    const offers: Offer[] = offerItems.map((o: any, oIdx: number) => {
      const price = o.price == null ? null : Number(o.price);
      const compareAt = o.compare_at_price == null ? null : Number(o.compare_at_price);
      const saving = computeSaving(price, compareAt);
      const scrapedAt = o.scraped_at ? String(o.scraped_at) : null;
      return {
        id: String(o.id || `${prodId}-offer-${oIdx + 1}`),
        productId: prodId,
        store: String(o.store || "").toLowerCase().trim(),
        storeTitle: String(o.store_title || rawTitle),
        brand: o.brand ? String(o.brand) : brand,
        imageUrl: o.image_url ? String(o.image_url) : null,
        price,
        compareAtPrice: compareAt,
        discountPct: o.discount_pct == null ? null : Number(o.discount_pct),
        sizes: Array.isArray(o.sizes) ? o.sizes.map(String) : [],
        inStock: typeof o.in_stock === "boolean" ? o.in_stock : null,
        url: String(o.url || "#"),
        currency: String(o.currency || "USD").toUpperCase(),
        category: o.category ? String(o.category) : null,
        scrapedAt,
        saving,
        isStale: isOfferStale(scrapedAt),
      };
    });

    const distinctStores = Array.from(new Set(offers.map((o) => o.store)));
    const storeCount = distinctStores.length;
    let matchLevel: MatchLevel = storeCount >= 2 ? "likely" : "single";

    let bestOffer: Offer | null = null;
    const pricedOffers = offers.filter((o) => o.price != null);
    if (pricedOffers.length > 0) {
      const inStock = pricedOffers.filter((o) => o.inStock === true);
      bestOffer = inStock.length > 0
        ? inStock.reduce((min, cur) => (cur.price! < min.price! ? cur : min))
        : pricedOffers.reduce((min, cur) => (cur.price! < min.price! ? cur : min));
    } else if (offers.length > 0) {
      bestOffer = offers[0];
    }

    const minPrice = bestOffer?.price ?? null;
    let maxSaving: number | null = null;
    for (const off of offers) {
      if (off.saving != null && off.saving > 0) {
        if (maxSaving == null || off.saving > maxSaving) maxSaving = off.saving;
      }
    }

    products.push({
      id: prodId,
      brand,
      title: rawTitle,
      cleanTitle: cleaned,
      matchKey: key,
      styleCode: null,
      imageUrl: first.image_url || null,
      category: offers.find((o) => o.category)?.category || null,
      offers,
      bestOffer,
      minPrice,
      maxSaving,
      storeCount,
      distinctStores,
      matchLevel,
      latestChecked: null,
      isStale: false,
      slug: makeProductSlug(cleaned, prodId),
    });
  }

  return { products: keepListableProducts(products), source: "json" };
}

export async function loadCatalog(forceRefresh = false): Promise<{
  products: Product[];
  source: "supabase" | "json";
}> {
  const now = Date.now();
  if (!forceRefresh && catalogCache && now - catalogCache.timestamp < CACHE_TTL_MS) {
    return { products: catalogCache.products, source: catalogCache.source };
  }

  if (getSupabaseEnv()) {
    try {
      const result = await loadFromSupabase();
      catalogCache = {
        products: result.products,
        source: "supabase",
        timestamp: now,
      };
      return result;
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local JSON:", err);
    }
  }

  const result = await loadFromJson();
  catalogCache = {
    products: result.products,
    source: "json",
    timestamp: now,
  };
  return result;
}

export async function getProducts(filters: ProductFilters = {}): Promise<CatalogResult> {
  try {
    const { products: all, source } = await loadCatalog();

    // Compute facets from the entire catalog before filters
    const brandCounts = new Map<string, number>();
    const storeCounts = new Map<string, number>();
    const allSizesSet = new Set<string>();
    let overallMinPrice: number | null = null;
    let overallMaxPrice: number | null = null;

    for (const p of all) {
      if (p.brand) {
        brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
      }
      for (const st of p.distinctStores) {
        storeCounts.set(st, (storeCounts.get(st) || 0) + 1);
      }
      for (const off of p.offers) {
        for (const sz of off.sizes) {
          if (sz && sz.trim()) allSizesSet.add(sz.trim());
        }
      }
      if (p.minPrice != null) {
        if (overallMinPrice == null || p.minPrice < overallMinPrice) overallMinPrice = p.minPrice;
        if (overallMaxPrice == null || p.minPrice > overallMaxPrice) overallMaxPrice = p.minPrice;
      }
    }

    const sortedBrands = Array.from(brandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedStores = Array.from(storeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedSizes = Array.from(allSizesSet).sort((a, b) => {
      const na = Number.parseFloat(a);
      const nb = Number.parseFloat(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    const facets: Facets = {
      brands: sortedBrands,
      stores: sortedStores,
      sizes: sortedSizes,
      minPrice: overallMinPrice,
      maxPrice: overallMaxPrice,
      totalProducts: all.length,
    };

    // Filter products
    let filtered = all.filter((product) => {
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const tokens = query.split(/\s+/).filter(Boolean);
        const searchable = `${product.cleanTitle} ${product.brand} ${product.category || ""} ${product.styleCode || ""} ${product.matchKey}`.toLowerCase();
        const matchesQuery = tokens.every((token) => searchable.includes(token));
        if (!matchesQuery) return false;
      }

      if (filters.brand?.length) {
        const matchesBrand = filters.brand.some(
          (b) => b.toLowerCase() === product.brand.toLowerCase(),
        );
        if (!matchesBrand) return false;
      }

      if (filters.store?.length) {
        const matchesStore = filters.store.some((st) =>
          product.distinctStores.map((s) => s.toLowerCase()).includes(st.toLowerCase()),
        );
        if (!matchesStore) return false;
      }

      if (filters.minPrice != null) {
        if (product.minPrice == null || product.minPrice < filters.minPrice) return false;
      }

      if (filters.maxPrice != null) {
        if (product.minPrice == null || product.minPrice > filters.maxPrice) return false;
      }

      if (filters.inStock) {
        const hasInStock = product.offers.some((o) => o.inStock === true);
        if (!hasInStock) return false;
      }

      if (filters.saleOnly) {
        if (product.maxSaving == null || product.maxSaving <= 0) return false;
      }

      if (filters.size) {
        const wanted = filters.size.toLowerCase();
        const hasSize = product.offers.some((o) =>
          o.sizes.some((sz) => sz.toLowerCase() === wanted),
        );
        if (!hasSize) return false;
      }

      return true;
    });

    // Sorting
    const sort = filters.sort || "recommended";
    if (sort === "price_asc") {
      filtered.sort((a, b) => {
        if (a.minPrice == null) return 1;
        if (b.minPrice == null) return -1;
        return a.minPrice - b.minPrice;
      });
    } else if (sort === "discount_desc") {
      filtered.sort((a, b) => {
        const sa = a.maxSaving ?? 0;
        const sb = b.maxSaving ?? 0;
        return sb - sa;
      });
    } else {
      // "recommended": multi-store matched products first, then highest savings
      filtered.sort((a, b) => {
        if (b.storeCount !== a.storeCount) {
          return b.storeCount - a.storeCount;
        }
        const sa = a.maxSaving ?? 0;
        const sb = b.maxSaving ?? 0;
        if (sb !== sa) return sb - sa;
        return a.cleanTitle.localeCompare(b.cleanTitle);
      });
    }

    return {
      products: filtered,
      total: filtered.length,
      facets,
      source,
    };
  } catch (err) {
    return {
      products: [],
      total: 0,
      facets: { brands: [], stores: [], sizes: [], minPrice: null, maxPrice: null, totalProducts: 0 },
      source: getSupabaseEnv() ? "supabase" : "json",
      error: err instanceof Error ? err.message : "Could not load catalog",
    };
  }
}

export async function getProduct(slugOrId: string): Promise<Product | null> {
  const { products } = await loadCatalog();
  const id = parseIdFromSlug(slugOrId);
  return (
    products.find(
      (p) =>
        p.id === id ||
        p.slug === slugOrId ||
        p.id === slugOrId ||
        p.matchKey === slugOrId,
    ) ?? null
  );
}

export async function getProductIds(): Promise<string[]> {
  const { products } = await loadCatalog();
  return products.map((product) => product.id);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { products } = await loadCatalog();
  const wanted = new Set(ids.map(parseIdFromSlug));
  return products.filter((p) => wanted.has(p.id) || ids.includes(p.id));
}

export async function getHeroStats(): Promise<HeroStats> {
  const { products } = await loadCatalog();
  let matchedCount = 0;
  const storeSet = new Set<string>();
  let totalSavings = 0;
  let discountedOfferCount = 0;

  for (const p of products) {
    if (p.storeCount >= 2) matchedCount += 1;
    for (const st of p.distinctStores) storeSet.add(st);
    for (const off of p.offers) {
      if (off.saving != null && off.saving > 0) {
        totalSavings += off.saving;
        discountedOfferCount += 1;
      }
    }
  }

  const avgSaving = discountedOfferCount > 0
    ? Number((totalSavings / discountedOfferCount).toFixed(2))
    : 0;

  return {
    matchedCount,
    storeCount: storeSet.size || 5,
    avgSaving,
  };
}

export async function getFeaturedProducts(limit = 4): Promise<{
  products: Product[];
  latestChecked: string | null;
}> {
  const { products } = await loadCatalog();

  // Requirements: top by saving, must have an image, exclude discounts above 70% from featured row
  const candidates = products.filter((p) => {
    if (!p.imageUrl || !p.imageUrl.trim()) return false;
    if (p.maxSaving == null || p.maxSaving <= 0) return false;
    if (p.bestOffer?.discountPct != null && p.bestOffer.discountPct > 70) return false;
    if (p.bestOffer?.compareAtPrice && p.bestOffer.price) {
      const discountPct = ((p.bestOffer.compareAtPrice - p.bestOffer.price) / p.bestOffer.compareAtPrice) * 100;
      if (discountPct > 70) return false;
    }
    return true;
  });

  candidates.sort((a, b) => (b.maxSaving ?? 0) - (a.maxSaving ?? 0));

  let latestChecked: string | null = null;
  for (const p of products) {
    if (p.latestChecked) {
      if (!latestChecked || Date.parse(p.latestChecked) > Date.parse(latestChecked)) {
        latestChecked = p.latestChecked;
      }
    }
  }

  return {
    products: candidates.slice(0, limit),
    latestChecked,
  };
}

export async function getRetailerStatuses(): Promise<RetailerStatus[]> {
  const { products } = await loadCatalog();

  // Compute offer count and latest scraped_at per store
  const storeStats = new Map<string, { count: number; lastScraped: string | null }>();

  for (const key of Object.keys(STORES_META)) {
    storeStats.set(key, { count: 0, lastScraped: null });
  }

  for (const p of products) {
    for (const off of p.offers) {
      const st = off.store.toLowerCase();
      const existing = storeStats.get(st) || { count: 0, lastScraped: null };
      existing.count += 1;
      if (off.scrapedAt) {
        if (!existing.lastScraped || Date.parse(off.scrapedAt) > Date.parse(existing.lastScraped)) {
          existing.lastScraped = off.scrapedAt;
        }
      }
      storeStats.set(st, existing);
    }
  }

  return Object.values(STORES_META).map((meta) => {
    const stat = storeStats.get(meta.key) || { count: 0, lastScraped: null };
    const stale = isOfferStale(stat.lastScraped);

    return {
      store: meta.key,
      name: meta.name,
      index: meta.index,
      isActive: stat.count > 0 && !stale,
      isStale: stale,
      description: meta.description,
      coverage: stat.count > 200 ? "High" : stat.count > 50 ? "Medium" : "Low",
      refreshTarget: meta.refreshTarget,
      fields: meta.fields,
      offerCount: stat.count,
      lastCollected: stat.lastScraped,
    };
  });
}

export async function checkDbHealth(): Promise<{
  status: "ok" | "degraded";
  count: number;
  source: "supabase" | "json";
  error?: string;
}> {
  try {
    const { products, source } = await loadCatalog();
    return {
      status: products.length > 0 ? "ok" : "degraded",
      count: products.length,
      source,
    };
  } catch (err) {
    return {
      status: "degraded",
      count: 0,
      source: getSupabaseEnv() ? "supabase" : "json",
      error: err instanceof Error ? err.message : "Database unavailable",
    };
  }
}
