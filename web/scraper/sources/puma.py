"""Puma scraper (us.puma.com). Footwear products prioritized by 6pm Puma overlap and lifestyle/running."""

from __future__ import annotations

import html
import json
import logging
import re
import xml.etree.ElementTree as ET
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from base import (
    PoliteSession,
    clean_text,
    find_product,
    make_offer,
    parse_availability,
    parse_jsonld,
    parse_price,
)

logger = logging.getLogger(__name__)

STATS: dict[str, int] = {
    "pages_fetched": 0,
    "pages_with_price": 0,
    "pages_without_price": 0,
    "cleat_count": 0,
    "skipped_no_price": 0,
    "errors": 0,
}

FOOTWEAR_PATH_KEYWORDS = (
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "cleat",
    "cleats",
    "boot",
    "boots",
    "sandal",
    "sandals",
    "slide",
    "slides",
    "slipper",
    "slippers",
    "trainer",
    "trainers",
    "clog",
    "clogs",
    "loafer",
    "loafers",
    "mule",
    "mules",
    "heel",
    "heels",
    "court-shoe",
    "court-shoes",
    "running-shoe",
    "running-shoes",
)

FOOTWEAR_CATEGORY_KEYWORDS = (
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "cleat",
    "cleats",
    "footwear",
    "boot",
    "boots",
    "sandals",
    "slides",
)

CLEAT_KEYWORDS = (
    "cleat",
    "cleats",
    "soccer",
    "firm-ground",
    "artificial-ground",
    "turf-trainer",
    "indoor-training",
    "fg-ag",
)

STYLE_CODE_RE = re.compile(r"/pd/[^/]+/(\d+)")


def is_footwear_url(url: str) -> bool:
    """Decide footwear by URL path."""
    parsed = urlparse(url)
    path = parsed.path.lower()
    if "/us/en/pd/" not in path:
        return False
    if any(neg in path for neg in ("-sock", "-socks", "-tee", "-t-shirt", "-care-kit", "-cleaner", "-insole", "-laces", "-hat", "-cap", "-beanie", "-bag")):
        return False
    return any(kw in path for kw in FOOTWEAR_PATH_KEYWORDS)


def is_footwear_page(soup: BeautifulSoup, url: str, prod: dict[str, Any]) -> bool:
    """Validate footwear using JSON-LD category/breadcrumbs or URL path."""
    cat = prod.get("category")
    if cat:
        cat_str = str(cat).lower()
        if any(k in cat_str for k in FOOTWEAR_CATEGORY_KEYWORDS):
            return True

    for item in parse_jsonld(soup):
        if item.get("@type") == "BreadcrumbList":
            items = item.get("itemListElement") or []
            for elem in items:
                name = elem.get("name") or (elem.get("item", {}).get("name") if isinstance(elem.get("item"), dict) else "")
                if any(k in str(name).lower() for k in FOOTWEAR_CATEGORY_KEYWORDS):
                    return True

    return is_footwear_url(url)


def extract_style_code(url: str) -> str | None:
    match = STYLE_CODE_RE.search(url)
    if match:
        return match.group(1)
    segments = [s for s in url.split("?")[0].rstrip("/").split("/") if s]
    if segments and segments[-1].isdigit():
        return segments[-1]
    return None


def get_6pm_puma_model_patterns(session: PoliteSession) -> list[str]:
    """Fetch 6pm puma-shoes listing to extract model patterns."""
    url = "https://www.6pm.com/puma-shoes"
    patterns: list[str] = []
    try:
        print(f"[Puma Pre-fetch] Fetching 6pm Puma listing for model names: {url}")
        status, soup = session.get_soup(url)
        jsonlds = parse_jsonld(soup)
        prods = [item for item in jsonlds if item.get("@type") == "Product"]
        for p in prods:
            name = p.get("name")
            if not name:
                continue
            cleaned = html.unescape(name)
            cleaned = re.sub(r"&#8482;|&trade;", "", cleaned)
            cleaned = re.sub(r"(?i)^puma\s+", "", cleaned)
            # Remove footwear category words
            cleaned = re.sub(r"(?i)\b(shoes|shoe|sneakers|sneaker|cleats|cleat|running|basketball|cross training|cross-training|training|firm[ /]+artificial ground|indoor|shoess)\b", "", cleaned).strip()
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            slug = re.sub(r"[^a-z0-9]+", "-", cleaned.lower()).strip("-")
            if slug and len(slug) >= 3 and slug not in patterns:
                patterns.append(slug)

            # Also extract core model patterns
            parts = slug.split("-")
            if len(parts) >= 2:
                two = "-".join(parts[:2])
                if two not in patterns:
                    patterns.append(two)
            if parts and parts[0] not in ("mens", "womens", "kids", "boys", "girls"):
                if len(parts[0]) >= 4 and parts[0] not in patterns:
                    patterns.append(parts[0])

        print(f"[Puma Pre-fetch] Extracted {len(patterns)} model patterns from 6pm.")
    except Exception as exc:
        logger.warning(f"Could not pre-fetch 6pm Puma models: {exc}")
        # Default key Puma models from 6pm
        patterns = [
            "rebound-slam-lo", "rebound-slam", "rebound", "fade-nitro-y2k", "fade-nitro", "fade",
            "palermo", "speedcat", "suede", "darter-pro", "darter", "foreverrun-nitro", "foreverrun",
            "velocity-nitro", "velocity", "all-pro-nitro", "roma-24", "roma", "voltaic-evo", "voltaic",
            "easy-rider", "ca-pro", "adelina", "arizona", "homura-og", "homura", "attacanto", "ultra",
            "future", "king"
        ]
    return patterns


def get_all_footwear_urls_from_sitemaps(session: PoliteSession) -> list[str]:
    """Read ALL footwear sitemap shards (only sitemap XML requests, robots-checked) and collect every footwear product URL."""
    index_url = "https://us.puma.com/sitemaps/urls/us/sitemap_index.xml"
    status, text = session.get(index_url)
    root = ET.fromstring(text.encode("utf-8"))
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    shard_urls = [elem.text for elem in root.findall(".//sm:loc", ns) if elem.text]
    footwear_urls: list[str] = []
    seen: set[str] = set()

    # Footwear product catalog is contained across shards 3 through 16
    for shard in shard_urls:
        shard_num = None
        m = re.search(r"sitemap_(\d+)\.xml", shard)
        if m:
            shard_num = int(m.group(1))

        if shard_num is not None and (shard_num < 3 or shard_num > 16):
            continue

        try:
            print(f"[Puma Sitemap] Fetching footwear shard {shard_num}: {shard}")
            _, shard_text = session.get(shard)
            s_root = ET.fromstring(shard_text.encode("utf-8"))
            urls = [elem.text for elem in s_root.findall(".//sm:loc", ns) if elem.text]
            new_in_shard = 0
            for u in urls:
                if is_footwear_url(u) and u not in seen:
                    seen.add(u)
                    footwear_urls.append(u)
                    new_in_shard += 1
            print(f"  [Puma Sitemap] Shard {shard_num} yielded {new_in_shard} footwear URLs (Total so far: {len(footwear_urls)})")
        except Exception as exc:
            logger.warning(f"Error fetching Puma shard {shard}: {exc}")
            continue

    return footwear_urls


def prioritize_puma_urls(urls: list[str], model_patterns: list[str], limit: int = 150) -> list[str]:
    """
    1. Prefer Puma US URLs whose slug contains a 6pm Puma model name.
       Distributes across core 6pm models to ensure broad representation and high overlap.
    2. Fill the rest with sneaker/lifestyle/running URLs (not soccer cleats) up to limit.
    """
    core_models = [
        "palermo", "speedcat", "rebound", "fade", "foreverrun", "velocity",
        "darter", "voltaic", "roma", "homura", "electrify", "suede",
        "all-pro", "attacanto", "ultra", "future", "king"
    ]

    selected: list[str] = []
    seen: set[str] = set()

    # Pass 1: Pick up to 8 mainline URLs for each 6pm model
    for model_key in core_models:
        matches = [u for u in urls if model_key in u.lower() and u not in seen]
        # Prefer mainline over motorsport/collab
        matches.sort(
            key=lambda u: (
                1 if any(c in u.lower() for c in ("ferrari", "porsche", "bmw", "mercedes", "aston-martin")) else 0,
                0 if not any(ck in u.lower() for ck in CLEAT_KEYWORDS) else 1
            )
        )
        for u in matches[:8]:
            seen.add(u)
            selected.append(u)
            if len(selected) >= limit:
                break
        if len(selected) >= limit:
            break

    # Pass 2: Pick any remaining URLs matching 6pm model patterns
    if len(selected) < limit:
        for p in model_patterns:
            matches = [u for u in urls if p in u.lower() and u not in seen]
            for u in matches:
                seen.add(u)
                selected.append(u)
                if len(selected) >= limit:
                    break
            if len(selected) >= limit:
                break

    # Pass 3: Fill the rest with general lifestyle/running URLs (not soccer cleats)
    if len(selected) < limit:
        for u in urls:
            if u not in seen and not any(ck in u.lower() for ck in CLEAT_KEYWORDS):
                seen.add(u)
                selected.append(u)
                if len(selected) >= limit:
                    break

    cleats_count = sum(1 for u in selected if any(ck in u.lower() for ck in CLEAT_KEYWORDS))
    print(f"[Puma URL Selection] Selected {len(selected)} prioritized URLs "
          f"(Soccer cleats: {cleats_count}, Lifestyle/running: {len(selected) - cleats_count})")
    return selected


def scrape(session: PoliteSession, limit: int = 150) -> list[dict]:
    """
    Scrape up to limit footwear offers from us.puma.com.
    Prioritizes 6pm Puma overlap and fills with sneaker/lifestyle/running models.
    """
    print(f"\n--- [Puma] Collecting footwear URLs across sitemaps (target: {limit}) ---")
    model_patterns = get_6pm_puma_model_patterns(session)
    all_urls = get_all_footwear_urls_from_sitemaps(session)
    print(f"[Puma] Total footwear URLs collected across all shards: {len(all_urls)}")

    urls_to_fetch = prioritize_puma_urls(all_urls, model_patterns, limit=limit)
    print(f"[Puma] Selected {len(urls_to_fetch)} prioritized URLs for fetching.")

    offers: list[dict] = []
    pages_fetched = 0
    pages_with_price = 0
    pages_without_price = 0
    skipped_no_price = 0
    errors = 0
    cleat_count = 0

    for url in urls_to_fetch:
        if len(offers) >= limit:
            break

        style_code = extract_style_code(url)
        try:
            status, soup = session.get_soup(url)
            pages_fetched += 1
        except Exception as exc:
            errors += 1
            print(f"  [Puma] Error fetching {url}: {exc}")
            continue

        try:
            jsonlds = parse_jsonld(soup)
            prod = find_product(jsonlds) or {}

            if not is_footwear_page(soup, url, prod):
                continue

            name = prod.get("name")
            if not name:
                og_title = soup.find("meta", property="og:title")
                name = og_title.get("content") if og_title else soup.title.string if soup.title else None

            brand = "Puma"
            brand_field = prod.get("brand")
            if isinstance(brand_field, dict):
                brand = brand_field.get("name") or "Puma"
            elif isinstance(brand_field, str):
                brand = brand_field

            image_url = None
            img_field = prod.get("image")
            if isinstance(img_field, list) and img_field:
                image_url = img_field[0]
            elif isinstance(img_field, str):
                image_url = img_field
            if not image_url:
                og_img = soup.find("meta", property="og:image")
                if og_img and og_img.get("content"):
                    image_url = og_img.get("content")

            offers_data = prod.get("offers")
            single_offer = {}
            if isinstance(offers_data, list) and offers_data:
                single_offer = offers_data[0]
            elif isinstance(offers_data, dict):
                single_offer = offers_data

            price = single_offer.get("price")
            compare_at_price = None

            price_spec = single_offer.get("priceSpecification")
            if isinstance(price_spec, dict):
                compare_at_price = price_spec.get("price")
            elif isinstance(price_spec, list):
                for ps in price_spec:
                    if isinstance(ps, dict) and "strikethrough" in str(ps.get("priceType", "")).lower():
                        compare_at_price = ps.get("price")
                        break

            if not compare_at_price:
                strike_elem = soup.find(class_=re.compile(r"strikethrough|strike|line-through|original-price", re.I))
                if strike_elem:
                    compare_at_price = strike_elem.get_text()

            if price is None:
                price_elem = soup.find(class_=re.compile(r"price|whitespace-nowrap", re.I))
                if price_elem:
                    price = price_elem.get_text()

            if price is not None:
                pages_with_price += 1
            else:
                pages_without_price += 1
                skipped_no_price += 1
                continue

            in_stock = parse_availability(single_offer.get("availability"))
            colorway = prod.get("color")

            offer = make_offer(
                store="puma",
                store_title=name,
                brand=brand,
                image_url=image_url,
                price=price,
                compare_at_price=compare_at_price,
                currency="USD",
                category="footwear",
                sizes=[],
                in_stock=in_stock,
                url=url,
                style_code=style_code,
                colorway=colorway,
            )

            if offer:
                offers.append(offer)
                if any(k in (name or "").lower() for k in ("cleat", "cleats", "soccer")):
                    cleat_count += 1
            else:
                skipped_no_price += 1

        except Exception as exc:
            errors += 1
            print(f"  [Puma] Error parsing {url}: {exc}")
            continue

    STATS["pages_fetched"] = pages_fetched
    STATS["pages_with_price"] = pages_with_price
    STATS["pages_without_price"] = pages_without_price
    STATS["cleat_count"] = cleat_count
    STATS["skipped_no_price"] = skipped_no_price
    STATS["errors"] = errors

    print(f"\n[Puma Summary] Fetched: {pages_fetched}, with price: {pages_with_price}, "
          f"without price: {pages_without_price}, soccer cleat titles: {cleat_count}, "
          f"parsed offers: {len(offers)}, errors: {errors}")
    return offers
