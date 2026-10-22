# ShoeScope · US Shoe Price Comparison (Proof of Concept)

> **ShoeScope** is an independent shoe discovery and comparison web application. It monitors and compares publicly visible shoe listings and sale offers across five leading US footwear retailers, surfacing the clearest available price snapshot and routing shoppers directly to the merchant to buy.

---

## 1. Monitored Retailers (US Market)

| # | Retailer | Domain | Type | Extracted Fields |
|---|---|---|---|---|
| 01 | **Puma US** | `us.puma.com` | Official Brand Site | Price, sale, colorway, images, style code, URL |
| 02 | **Nike US** | `nike.com` | Official Brand Site | Price, sale, colorway, images, URL |
| 03 | **Skechers US** | `skechers.com` | Official Brand Site | Price, sale, colorway, images, style code, URL |
| 04 | **6pm** | `6pm.com` | Multi-Brand Retailer | Price, sale, colorway, sizes, images, URL |
| 05 | **Zappos** | `zappos.com` | Multi-Brand Retailer | Price, sale, colorway, images, URL |

*Note on Catalogue Sharing: 6pm and Zappos share a single inventory catalogue (both owned by the same parent company).*

---

## 2. Environment Variables

### Root Scraper (`.env`)
```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"     # Used only for Python upserts
GEMINI_API_KEY="your-gemini-api-key"             # Optional for offline matching tasks
GEMINI_MODEL="gemini-flash-latest"
```

### Web Application (`web/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"   # Public read-only + reports insert
GEMINI_API_KEY="your-gemini-api-key"                   # Server-only AI synthesis
GEMINI_MODEL="gemini-flash-latest"                     # Server-only model endpoint
```

> **Security Rule:** Never expose the `SUPABASE_SERVICE_KEY` in `web/` or client bundles. The frontend uses the anonymous public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) strictly with Row Level Security (RLS).

---

## 3. Setup & Running

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** / npm

### Step 1: Web Frontend
```bash
cd web
npm install
npm run build
npm run start -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
The web app automatically falls back to `data/offers.json` and `data/products.json` if Supabase environment variables are not supplied.

### Step 2: Python Scraper & Database Upload
```bash
# From project root
python -m venv venv
venv\Scripts\activate            # Linux/macOS: source venv/bin/activate
pip install -r scraper/requirements.txt

# Run the complete scrape across all 5 stores
python scraper/scrape_all.py
```

### Step 3: Automated Scheduler
Collection runs automatically on a recurring schedule via GitHub Actions workflow defined in `.github/workflows/scrape.yml`.

---

## 4. Web Application Routes

| Route | Purpose | Key Behaviours |
|---|---|---|
| `/` | Discover Landing | Global search, live stats row, featured savings, lavender visual panel with tilted card, value props |
| `/search` | Product Catalogue | Full faceted search, brand/retailer checkboxes, price buckets, availability toggles, sort, 24/page Load More |
| `/product/[slug]` | Product Detail | Large image, match level badge & explanation, best price block, sizes, offers table, outbound links, problem reporting modal |
| `/compare?ids=a,b` | Comparison | Side-by-side specs, lowest price highlight, store price spread, Gemini AI synthesis card with Regenerate, copy link |
| `/saved` | Saved Pairs | Browser-local shortlist via `localStorage`, live count badge in header, empty state CTA |
| `/retailers` | Source Status | 3x2 grid of store status cards, active/stale status dots, coverage levels, collection recency, fallback policy |
| `/methodology` | How Matching Works | 6-step lifecycle (Collect, Normalise, Match, Score, Compare, Verify), confidence tiers (Exact, Likely, Single) |
| `/states` | UI State Reference | Live gallery: loading skeleton cards, empty results, partial data resilience, out of stock, error with retry |
| `/handoff` | MVP Build Handoff | Full product specification, Definition of Done, 6-step core user flow, data contract, API specs, AC-01..AC-08 |

---

## 5. API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/products` | `GET` | Catalog query with `q`, `brand`, `store`, `price`, `in_stock`, `sale_only`, `sort`, `page`, `limit` |
| `/api/products/[id]` | `GET` | Canonical product details, match level, and all matched retailer offers |
| `/api/retailers` | `GET` | Store statuses, active/stale indicators, offer counts, and last collected timestamp |
| `/api/health` | `GET` | Database reachability check, product count, returns no secrets |
| `/api/reports` | `POST` | User mismatch / stale-price reporting (validated, rate-limited: 5/10min per IP, anon key minimal insert) |
| `/api/jobs/collect` | `POST` | Returns `501 Not Implemented` (documenting that collection is executed via the Python CLI / GitHub Actions schedule) |
| `/api/compare` | `POST` | Server-side Gemini AI synthesis (`{ ids: [a, b] }`), cached 24h by sorted pair, 10/10min rate limit, 15s timeout, resilient fallback |

---

## 6. Known Limitations

1. **Snapshot Data:** Product pricing and inventory status represent point-in-time public snapshots. Real-time availability must always be confirmed on the merchant website.
2. **Missing Sizes:** Size ranges are published in structured form by multi-brand retailers (6pm), but omitted by direct brand listing shards; the UI gracefully reports "Sizes not listed - check the store".
3. **Best-Effort Normalization:** Manufacturer titles and colorways vary significantly across merchants. Shoes are matched by shared style codes where available, or normalized brand + model + colorway tokens. Ambiguous offers remain distinct products.
4. **Catalogue Overlap:** 6pm and Zappos share the same catalogue; prices across these two stores are often identical or synchronized.

---

## 7. Replacement-Source Process

If changes in robots.txt rules, merchant terms, blocking, or layout changes make an approved retailer unsuitable:
1. **Never bypass:** Do not bypass logins, CAPTCHAs, Cloudflare challenges, or bot detection.
2. **Identify alternative:** Select an alternative US multi-brand retailer that sells legitimate footwear in USD and permits automated public collection.
3. **Verify criteria:**
   - Public listing endpoint or sitemap access permitted by `robots.txt`.
   - Minimum 2-second per-request courtesy delay.
   - Transparent price, brand, and model data.
4. **Substitute:** Implement the new collector following the base collector pattern in `scraper/` and update store metadata in `web/lib/stores.ts`.
