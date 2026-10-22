"""6pm scraper (6pm.com). Footwear listing pages and optional product pages."""

from __future__ import annotations

import json
import logging
from typing import Any

from base import (
    PoliteSession,
    clean_text,
    make_offer,
    parse_availability,
    parse_jsonld,
    parse_price,
)

logger = logging.getLogger(__name__)

STATS: dict[str, int] = {
    "pages_fetched": 0,
    "price_diff_count": 0,
    "errors": 0,
    "skipped": 0,
}

LISTING_URLS = [
    "https://www.6pm.com/puma-shoes",
    "https://www.6pm.com/men-sneakers-athletic-shoes",
    "https://www.6pm.com/women-sneakers-athletic-shoes",
    "https://www.6pm.com/running-shoes",
]


def _extract_pdp_details(soup: Any) -> tuple[float | None, float | None, list[str], str | None]:
    """Extract current price, original/was price, available sizes, and colorway from PDP."""
    pdp_price = None
    orig_price = None
    sizes: list[str] = []
    colorway: str | None = None

    for s in soup.find_all("script"):
        st = s.string or ""
        if "window.__INITIAL_STATE__" in st:
            try:
                json_str = st.split("window.__INITIAL_STATE__ =", 1)[1].strip().rstrip(";")
                data = json.loads(json_str)
                styles = data.get("product", {}).get("detail", {}).get("styles", [])
                if styles:
                    style0 = styles[0]
                    pdp_price = parse_price(style0.get("price"))
                    orig_price = parse_price(style0.get("originalPrice"))
                    colorway = style0.get("color")
                    stocks = style0.get("stocks", [])
                    extracted_sizes = {
                        clean_text(stk.get("size")) for stk in stocks if stk.get("size")
                    }
                    sizes = sorted(list(extracted_sizes))
            except Exception:
                pass
            break

    return pdp_price, orig_price, sizes, colorway


def scrape(session: PoliteSession, limit: int = 150) -> list[dict]:
    """
    Scrape 6pm footwear listings.
    Scrapes the puma-shoes listing first and fully (all ~100 products),
    then adds other categories only if under the limit cap (default: 150).
    Keeps using product-page price when it differs from listing card price.
    """
    offers: list[dict] = []
    seen_urls: set[str] = set()
    price_diff_count = 0
    pages_fetched = 0
    errors = 0

    print(f"\n--- [6pm] Starting scrape (target: {limit}) across category listings ---")

    for listing_idx, listing_url in enumerate(LISTING_URLS):
        is_puma_listing = ("puma-shoes" in listing_url)

        # For non-puma listings, only add if under the cap
        if not is_puma_listing and len(offers) >= limit:
            print(f"[6pm] Reached target limit ({limit}). Stopping category additions.")
            break

        print(f"[6pm] Fetching listing: {listing_url}")
        try:
            status, soup = session.get_soup(listing_url)
            pages_fetched += 1
        except Exception as exc:
            errors += 1
            print(f"  [6pm] Error fetching listing {listing_url}: {exc}")
            continue

        jsonlds = parse_jsonld(soup)
        prods = [item for item in jsonlds if item.get("@type") == "Product"]
        print(f"  [6pm] Found {len(prods)} products on listing.")

        new_on_page = 0
        for p in prods:
            # If not the puma listing, stop once we reach the limit cap
            if not is_puma_listing and len(offers) >= limit:
                break
            # For testing with very low limits (e.g. limit=2 in smoke test), allow early exit
            if is_puma_listing and limit < 100 and len(offers) >= limit:
                break

            offers_obj = p.get("offers") or {}
            rel_url = p.get("url") or offers_obj.get("url")
            if not rel_url:
                continue

            full_url = f"https://www.6pm.com{rel_url}" if not rel_url.startswith("http") else rel_url
            if full_url in seen_urls:
                continue

            seen_urls.add(full_url)
            new_on_page += 1

            name = clean_text(p.get("name"))
            brand_field = p.get("brand")
            brand = brand_field.get("name") if isinstance(brand_field, dict) else str(brand_field or "Unknown")
            image_url = p.get("image")
            in_stock = parse_availability(offers_obj.get("availability"))
            card_price = parse_price(offers_obj.get("price"))
            gender = p.get("gender")

            effective_price = card_price
            compare_at_price = None
            sizes: list[str] = []
            colorway: str | None = None

            # Fetch PDP to get strike-through original price, check price diff, and get sizes
            try:
                pdp_status, pdp_soup = session.get_soup(full_url)
                pages_fetched += 1
                pdp_price, orig_price, pdp_sizes, pdp_color = _extract_pdp_details(pdp_soup)

                if pdp_price is not None:
                    if card_price is not None and abs(pdp_price - card_price) > 0.009:
                        price_diff_count += 1
                        logger.info(f"[6pm Price Diff] {name}: card=${card_price} vs pdp=${pdp_price}")
                    effective_price = pdp_price

                if orig_price is not None:
                    compare_at_price = orig_price

                if pdp_sizes:
                    sizes = pdp_sizes

                if pdp_color:
                    colorway = pdp_color

            except Exception as exc:
                errors += 1
                # If PDP fails, gracefully fall back to listing card price
                logger.debug(f"[6pm] PDP fetch failed for {full_url}: {exc}")

            offer = make_offer(
                store="6pm",
                store_title=name,
                brand=brand,
                image_url=image_url,
                price=effective_price,
                compare_at_price=compare_at_price,
                currency="USD",
                category="footwear",
                sizes=sizes,
                in_stock=in_stock,
                url=full_url,
                colorway=colorway,
                gender=gender,
            )

            if offer:
                offers.append(offer)

        if new_on_page == 0:
            print(f"  [6pm] Listing {listing_url} added 0 new products. Moving to next category.")

    STATS["pages_fetched"] = pages_fetched
    STATS["price_diff_count"] = price_diff_count
    STATS["errors"] = errors

    print(f"\n[6pm Summary] Total offers: {len(offers)}, pages fetched: {pages_fetched}, "
          f"price differences (card vs PDP): {price_diff_count}, errors: {errors}")
    return offers
