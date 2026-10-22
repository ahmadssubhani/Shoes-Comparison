export type Offer = {
  id: string;
  productId: string;
  store: string; // puma, nike, skechers, 6pm, zappos
  storeTitle: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  compareAtPrice: number | null;
  discountPct: number | null;
  sizes: string[];
  inStock: boolean | null;
  url: string;
  currency: string;
  category: string | null;
  scrapedAt: string | null;
  saving: number | null;
  isStale: boolean;
};

export type MatchLevel = "exact" | "likely" | "single";

export type Product = {
  id: string;
  brand: string;
  title: string;
  cleanTitle: string;
  matchKey: string;
  styleCode: string | null;
  imageUrl: string | null;
  category: string | null;
  offers: Offer[];
  bestOffer: Offer | null;
  minPrice: number | null;
  maxSaving: number | null;
  storeCount: number;
  distinctStores: string[];
  matchLevel: MatchLevel;
  latestChecked: string | null;
  isStale: boolean;
  slug: string;
};

export type ProductFilters = {
  q?: string;
  brand?: string[];
  store?: string[];
  price?: "under75" | "75to120" | "over120" | string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  inStock?: boolean;
  saleOnly?: boolean;
  sort?: "recommended" | "price_asc" | "discount_desc" | string;
  page?: number;
  limit?: number;
};

export type Facets = {
  brands: { name: string; count: number }[];
  stores: { name: string; count: number }[];
  sizes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  totalProducts: number;
};

export type CatalogResult = {
  products: Product[];
  total: number;
  facets: Facets;
  source: "supabase" | "json";
  error?: string;
};

export type HeroStats = {
  matchedCount: number;
  storeCount: number;
  avgSaving: number;
};

export type RetailerStatus = {
  store: string;
  name: string;
  index: string; // "01", "02", etc.
  isActive: boolean;
  isStale: boolean;
  description: string;
  coverage: "High" | "Medium" | "Low";
  refreshTarget: string;
  fields: string;
  offerCount: number;
  lastCollected: string | null;
};

export type ReportPayload = {
  productId?: string;
  offerId?: string;
  kind: "mismatch" | "stale_price" | "other";
  note?: string;
};

export type AiComparisonResult = {
  summary: string;
  key_differences: string[];
  best_value: string;
  caveats: string[];
};
