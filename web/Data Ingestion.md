# Data Ingestion

This document defines **where our data comes from, how it is collected, how it is cleaned, and where it is stored**. For the big-picture overview, see [`README.md`](./README.md).

---

## 1. Overview

```
Store website (public)
   -> /collections/{brand}/products.json   (Shopify's public product feed)
   -> scraper/base.py        fetch politely, normalize fields
   -> scraper/matching.py    clean brands, group same shoe across stores
   -> data/offers.json       local output (always written first)
   -> Supabase               products + offers tables (optional until keys are set)
   -> web/                   reads Supabase, or falls back to data/offers.json
```

All four chosen stores run on **Shopify**, which publishes a public, machine-readable product feed. This is why we do not need to parse web pages, use a browser robot, or work around any protection.

---

## 2. Scraping sources

### 2.1 Approved sources

| ID | Store | Base URL | Platform | Feed used | Role |
|---|---|---|---|---|---|
| `cncpts` | CNCPTS | https://cncpts.com | Shopify | `/collections/{handle}/products.json` | Primary |
| `undefeated` | Undefeated | https://undefeated.com | Shopify | `/collections/{handle}/products.json` | Primary |
| `solefly` | Solefly | https://solefly.com | Shopify | `/collections/{handle}/products.json` | Primary |
| `extrabutter` | Extra Butter | https://extrabutterny.com | Shopify | `/collections/{handle}/products.json` | Primary |
| `sneakerpolitics` | Sneaker Politics | https://sneakerpolitics.com | Shopify | `/collections/{handle}/products.json` | **Backup only** |

### 2.2 Why these stores (results of the store check)

The store check fetched the first 50 products from each candidate with a 2-second delay and respected `robots.txt`.

| Store | Shoes in sample | Items with a compare-at price | Main brands seen | Notes |
|---|---|---|---|---|
| CNCPTS | 29 | 50 of 50 | Nike, adidas, GANNI | Best sale signal, **but 50/50 is suspicious**. Verify that original price is actually higher than price |
| Undefeated | 35 | 16 | Nike, Patta, Jordan, Saucony | Strong shoe mix and real discounts |
| Solefly | 30 | 4 | Jordan, Oakley, Nike | Mostly Jordan and Nike |
| Extra Butter | 38 | 2 | Nike, Puma, Air Jordan, Mizuno | Large shoe mix. Few discounts, but strong brand overlap |
| Sneaker Politics | 10 | 8 | Nike, New Balance | Fewer shoes, so backup |

**Brands shared across the chosen stores:** Nike, Jordan, adidas, New Balance, Oakley, Puma. Shared brands are what make comparison possible.

### 2.3 Sources tested and rejected

| Store | Result | Reason not used |
|---|---|---|
| Packer Shoes | Passed | Almost no sale prices (1 of 50) |
| Kith | Passed | No sale prices in sample, mostly own-brand items |
| Bodega | Passed | Few shoes in sample (8), mostly apparel, no sale prices |
| Social Status | Passed | No sale prices in sample |
| Allbirds | Passed | Only one brand, so nothing to compare against |
| RSVP Gallery | Passed technically | Returned 0 products |
| Shoe Palace | **Failed** | Website address did not resolve (technical error, not a block) |

Any of the "passed but not chosen" stores can be swapped in later with no code changes, other than adding a line to `scraper/stores.py`.

---

## 3. Collection rules (non-negotiable)

1. **Public data only.** Nothing behind a login.
2. **Respect `robots.txt`.** If `/products.json` or the collection path is disallowed, the store is marked FAILED and skipped.
3. **No bypassing.** No proxies, stealth tools, disguised browsers, or CAPTCHA solving. A `403`, `429`, or `503` response, or a challenge page, means the store is replaced. It is not retried aggressively.
4. **Polite speed.** 2 seconds between requests.
5. **Limited volume.** Roughly 150 products per store, matching the project's "limited number of products" scope.
6. **Honest identification.** Requests use a clear User-Agent that names the project and a contact email.
7. **Links back.** Every offer links to the original store page. Purchases happen on the store's site.

---

## 4. What we collect (field mapping)

Every store is converted into the **same record shape**, called an *offer*.

| Our field | Meaning | Shopify source | If missing |
|---|---|---|---|
| `store` | Store ID (e.g. `cncpts`) | set by us | required |
| `store_title` | The store's own product name | `title` | required |
| `brand` | Cleaned brand name | `vendor` (normalized, see 5.1) | `null` |
| `image_url` | Main image | `images[0].src` | `null`, UI shows a placeholder |
| `price` | Current price (lowest variant price) | `variants[].price` | skip the offer |
| `compare_at_price` | Original price before discount | `variants[].compare_at_price` | `null` |
| `discount_pct` | Percent off | calculated (see 4.1) | `null` |
| `sizes` | List of sizes that can be bought | variant option values where `available = true` | `[]`, UI shows "Sizes unavailable" |
| `in_stock` | Is anything available | any variant `available = true` | `false` |
| `url` | Product page on the store | `https://{store}/products/{handle}` | required |

**Missing data never crashes the pipeline.** A missing field becomes `null` or an empty list. The website is built to display that safely.

### 4.1 Discount rule

A discount is real **only when** `compare_at_price > price`.

```
if compare_at_price is not None and compare_at_price > price:
    discount_pct = round((compare_at_price - price) / compare_at_price * 100)
else:
    compare_at_price = None
    discount_pct = None
```

This protects us from stores that set the original price equal to the current price, which is why the CNCPTS 50-of-50 figure must be verified.

### 4.2 Footwear filter

Only shoes are kept. The filter uses the store's `product_type` and `tags`. We do not use loose title words (for example "air" would wrongly match non-shoes).

---

## 5. Cleaning and matching

### 5.1 Brand normalization

Stores spell brands differently. We map them to one canonical name:

| Seen in data | Becomes |
|---|---|
| `NIKE`, `Nike` | Nike |
| `JORDAN`, `Jordan`, `JORDAN BRAND`, `Air Jordan` | Jordan |
| `ADIDAS`, `adidas` | adidas |
| `NEW BALANCE`, `New Balance` | New Balance |
| anything else | tidy capitalization, otherwise kept as is |

### 5.2 Product matching ("is this the same shoe?")

Matching is **best effort**.

1. Lowercase the title and remove punctuation.
2. Remove filler words such as "men's", "women's", "shoe", "sneaker".
3. Build a `match_key` = canonical brand + cleaned title.
4. Offers with the same `match_key` become one **product** with several **offers**.

**Optional AI step:** if `USE_LLM_MATCHING=true`, Gemini is asked to pair only the titles that rule-based matching could not. It is off by default, runs only on the Python side, and the project works fully without it. The API key lives in `.env` only.

---

## 6. Storage

### 6.1 Local file (always written first)

`data/offers.json` holds every cleaned offer. The website can run entirely from this file.

### 6.2 Supabase tables (`supabase/schema.sql`)

| Table | One row is... | Key columns |
|---|---|---|
| `products` | one shoe | `id`, `brand`, `title`, `match_key` (unique), `image_url` |
| `offers` | one store's listing of that shoe | `product_id`, `store`, `store_title`, `price`, `compare_at_price`, `discount_pct`, `sizes`, `in_stock`, `url`, `image_url`, `scraped_at` |

- `offers` is unique on (`store`, `url`), so re-running the scraper **updates** rows instead of duplicating them.
- Both tables allow **public read** only. Only the scraper, using the secret service key, can write.

### 6.3 Keys (security)

| Key | Used by | Where it lives |
|---|---|---|
| Supabase **anon** key | Website (read only) | `web/.env.local` |
| Supabase **service_role** key | Scraper (write) | `.env` and GitHub Actions secrets only |

The service key must **never** appear in `web/`, in the browser, or in git.

---

## 7. Schedule

| Mode | How |
|---|---|
| Manual | `python scraper/run.py` |
| Automatic | `.github/workflows/scrape.yml` runs daily (and on demand). Needs `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` added as repository secrets |

PythonAnywhere free accounts restrict which websites a program can reach, so GitHub Actions (or running locally) is the recommended way to run the scraper.

---

## 8. Failure handling

| Situation | What happens |
|---|---|
| Store returns `403`, `429`, or `503`, or a challenge page | Store marked FAILED, skipped, **not retried**. Replace it with the backup |
| `robots.txt` disallows the path | Store skipped |
| Store has no usable collection for a brand | Skip that brand and log it |
| A product is missing price or link | That offer is skipped and counted in the log |
| A product is missing image, sizes, or original price | Saved with `null`/empty. UI shows a placeholder |
| Supabase keys not set | Write `data/offers.json` only and skip the upload |
| One store fails | The other stores still complete |

---

## 9. Data quality checks to run after each scrape

- [ ] Offers collected per store (target: usable data from at least 3 stores)
- [ ] Number of products that appear in **2 or more stores**
- [ ] Number of **real** discounts per store (using rule 4.1)
- [ ] 10 random products compared by hand against the live store page (price, link, image, sizes)
- [ ] No duplicate offers (same `store` + `url`)
- [ ] No missing `price` or `url` in saved rows

---

## 10. What to do next

### Today (database day)

1. In Supabase, open **SQL Editor** and run `supabase/schema.sql`. Confirm `products` and `offers` appear under **Table Editor**.
2. Copy the project URL, anon key, and service_role key from **Project Settings, API**.
3. Fill `.env` (URL + service key) and `web/.env.local` (URL + anon key).
4. Make sure `.env` and `web/.env.local` are listed in `.gitignore`.
5. Run `python scraper/run.py`. Confirm it prints counts per store and uploads without errors.
6. In Supabase, check that both tables have rows from all 4 stores.
7. Start the website (`cd web && npm run dev`) and confirm it now shows the database data.

### After that

8. Record the results table in `README.md` Section 7 (offers per store, real discounts, matched products).
9. If few products match across stores, improve the matching or add Sneaker Politics as a fifth source.
10. Hand-check 10 products against the live stores.
11. Add the GitHub repository secrets and trigger the scrape workflow once manually.
12. Deploy the website and test it against the live database.
13. Swap the placeholder design values for the final colors and fonts.
14. Finish the setup notes and write the final project notes.

### Open questions to settle

- Are the CNCPTS discounts real? Check how many pass the rule in 4.1.
- Is the cross-store match count high enough for the compare view to look useful?
- Is a fifth store needed, or are four enough?