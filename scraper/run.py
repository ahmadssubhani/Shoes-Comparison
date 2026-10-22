"""Runner script to scrape approved HTML sources, isolate failures, and write data/offers.json."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Allow `python scraper/run.py` from repository root or scraper directory
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from base import (
    PoliteSession,
    USER_AGENT,
    BlockedError,
    DisallowedError,
)
from matching import group_offers
from stores import SOURCES
from sources import puma, sixpm, wellies

DATA_PATH = ROOT / "data" / "offers.json"


def write_offers(offers: list[dict[str, Any]]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(offers, indent=2), encoding="utf-8")
    print(f"\nWrote {len(offers)} offers to {DATA_PATH}")


def maybe_upsert_supabase(offers: list[dict[str, Any]], grouped: dict[str, list[dict[str, Any]]]) -> None:
    load_dotenv(ROOT / ".env")
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_KEY") or "").strip()

    if not url or not key:
        print("\nSupabase upsert skipped (no credentials in .env).")
        return

    from supabase import create_client

    client = create_client(url, key)
    print("\n--- Uploading to Supabase ---")

    # Clear existing rows to ensure Supabase row counts reflect fresh scrape
    try:
        client.table("offers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        client.table("products").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as exc:
        print(f"  Note on table reset: {exc}")

    product_rows = []
    for m_key, group in grouped.items():
        first = group[0]
        style_code = None
        for off in group:
            if off.get("style_code"):
                style_code = off.get("style_code")
                break

        product_rows.append(
            {
                "brand": first.get("brand"),
                "title": first.get("store_title") or m_key,
                "match_key": m_key,
                "image_url": first.get("image_url"),
                "style_code": style_code,
            }
        )

    # Upsert in chunks of 100
    if product_rows:
        chunk_size = 100
        for i in range(0, len(product_rows), chunk_size):
            chunk = product_rows[i:i + chunk_size]
            client.table("products").upsert(chunk, on_conflict="match_key").execute()

        fetched = client.table("products").select("id,match_key").limit(5000).execute()
        id_by_key = {row["match_key"]: row["id"] for row in (fetched.data or [])}
    else:
        id_by_key = {}

    offer_rows = []
    for offer in offers:
        offer_rows.append(
            {
                "product_id": id_by_key.get(offer.get("match_key")),
                "store": offer.get("store"),
                "store_title": offer.get("store_title") or "",
                "price": offer.get("price"),
                "compare_at_price": offer.get("compare_at_price"),
                "discount_pct": offer.get("discount_pct"),
                "sizes": offer.get("sizes") or [],
                "in_stock": offer.get("in_stock"),
                "url": offer.get("url"),
                "image_url": offer.get("image_url"),
                "currency": offer.get("currency") or "USD",
                "category": offer.get("category") or "footwear",
            }
        )

    if offer_rows:
        chunk_size = 100
        for i in range(0, len(offer_rows), chunk_size):
            chunk = offer_rows[i:i + chunk_size]
            client.table("offers").upsert(chunk, on_conflict="store,url").execute()

    print(f"Upserted {len(product_rows)} products and {len(offer_rows)} offers to Supabase.")

    # Query back to verify row counts
    p_cnt = client.table("products").select("id", count="exact").execute()
    o_cnt = client.table("offers").select("id", count="exact").execute()
    print(f"\n--- Supabase Database Row Counts ---")
    print(f"  Products in Supabase: {p_cnt.count} (Local products in data/offers.json: {len(grouped)})")
    print(f"  Offers in Supabase:   {o_cnt.count} (Local offers in data/offers.json: {len(offers)})")


def print_final_report(
    all_offers: list[dict[str, Any]],
    source_stats: dict[str, dict[str, Any]],
    session: PoliteSession,
) -> dict[str, list[dict[str, Any]]]:
    grouped = group_offers(all_offers)

    print("\n" + "=" * 65)
    print("                      FINAL SCRAPER REPORT")
    print("=" * 65)

    # 1. Offers per source & skipped
    print("\n--- 1. Offers per Source ---")
    per_source_offers = Counter(o["store"] for o in all_offers)
    for src in SOURCES:
        s_id = src["id"]
        stats = source_stats.get(s_id, {})
        offers_count = per_source_offers.get(s_id, 0)
        status_msg = stats.get("status", "SUCCESS" if offers_count > 0 else "NO_OFFERS")
        skipped = stats.get("skipped", 0)
        errors = stats.get("errors", 0)
        print(f"  [{src['name']}] id: {s_id}")
        print(f"    Status: {status_msg}")
        print(f"    Offers collected: {offers_count}")
        print(f"    Skipped (no price/url): {skipped}")
        print(f"    Page errors: {errors}")

    print(f"  TOTAL USABLE OFFERS: {len(all_offers)}")

    # 2. Brand breakdown per source
    print("\n--- 2. Brand Breakdown per Source ---")
    for src in SOURCES:
        s_id = src["id"]
        src_offers = [o for o in all_offers if o.get("store") == s_id]
        brand_counts = Counter(o.get("brand") or "Unknown" for o in src_offers)
        print(f"  [{src['name']}] (Total: {len(src_offers)})")
        for brand, count in brand_counts.most_common(10):
            print(f"    - {brand}: {count}")

    # 3. Number of soccer cleat titles in Puma
    puma_offers = [o for o in all_offers if o.get("store") == "puma"]
    cleat_terms = ("cleat", "cleats", "soccer", "firm ground", "artificial ground", "turf trainer")
    puma_cleats = sum(1 for o in puma_offers if any(k in o.get("store_title", "").lower() for k in cleat_terms))
    print("\n--- 3. Puma Footwear Composition ---")
    puma_stats = source_stats.get("puma", {})
    p_fetched = puma_stats.get("pages_fetched", len(puma_offers))
    p_priced = puma_stats.get("pages_with_price", len(puma_offers))
    p_unpriced = puma_stats.get("pages_without_price", 0)
    print(f"  Pages fetched: {p_fetched}")
    print(f"  Pages with price: {p_priced} ({100.0 * p_priced / max(1, p_fetched):.1f}%)")
    print(f"  Pages without price: {p_unpriced}")
    print(f"  Soccer cleat titles in Puma: {puma_cleats} / {len(puma_offers)}")
    print(f"  Lifestyle / Sneaker / Running titles: {len(puma_offers) - puma_cleats} / {len(puma_offers)}")

    # 4. Real discounts per source (compare_at_price > price)
    print("\n--- 4. Real Discounts (compare_at_price > price) ---")
    for src in SOURCES:
        s_id = src["id"]
        src_offers = [o for o in all_offers if o.get("store") == s_id]
        discounted = [o for o in src_offers if o.get("compare_at_price") is not None and o.get("compare_at_price") > o.get("price", 0)]
        print(f"  {s_id}: {len(discounted)} / {len(src_offers)} offers discounted")

    # 5. Products with offers from 2+ sources (showing 10 samples)
    multi_store_groups = {
        key: group for key, group in grouped.items() if len({o["store"] for o in group}) >= 2
    }
    print(f"\n--- 5. Cross-Store Matches (Offers from 2+ Sources) ---")
    print(f"  Total matched products: {len(multi_store_groups)}")
    if not multi_store_groups:
        print("  No multi-store matches found.")
    else:
        sample_keys = list(multi_store_groups.keys())[:10]
        print(f"  Showing {len(sample_keys)} sample matched products:")
        for idx, k in enumerate(sample_keys, 1):
            group = multi_store_groups[k]
            brand = group[0].get("brand")
            print(f"\n  Match #{idx}: {brand} (match_key: {k})")
            for off in group:
                st = off.get("store")
                title = off.get("store_title")
                colorway = off.get("colorway") or "None"
                curr = off.get("currency", "USD")
                pr = off.get("price")
                orig = off.get("compare_at_price")
                orig_str = f" (was {curr} {orig:.2f})" if orig else ""
                print(f"    - [{st}] {title}")
                print(f"      Colorway: {colorway} | Price: {curr} {pr:.2f}{orig_str}")

    # 6. Robots.txt disallowed URLs and Blocked responses
    print("\n--- 6. Robots.txt & Block Responses ---")
    print(f"  Disallowed URLs hit: {len(session.disallowed_urls)}")
    for d_url in session.disallowed_urls[:10]:
        print(f"    [DISALLOWED] {d_url}")
    print(f"  Blocked/Challenge responses: {len(session.blocked_urls)}")
    for b_url in session.blocked_urls[:10]:
        print(f"    [BLOCKED] {b_url}")

    # 7. Data file path
    print("\n--- 7. Output File ---")
    print(f"  Saved to: {DATA_PATH.resolve()}")
    print("=" * 65 + "\n")

    return grouped


def run(limit: int = 150) -> None:
    load_dotenv(ROOT / ".env")
    print(f"Starting Scraper Run (limit={limit} per source)")
    print(f"User-Agent: {USER_AGENT}")
    print(f"Delay: 2.0s | Timeout: 20.0s\n")

    session = PoliteSession(user_agent=USER_AGENT, delay=2.0, timeout=20.0)

    all_offers: list[dict[str, Any]] = []
    source_stats: dict[str, dict[str, Any]] = {}

    for src in SOURCES:
        s_id = src["id"]
        s_name = src["name"]
        scrape_fn = src["scrape"]

        print(f"\n==========================================")
        print(f"  Scraping Source: {s_name} ({s_id})")
        print(f"==========================================")

        try:
            offers = scrape_fn(session, limit=limit)
            all_offers.extend(offers)

            # Retrieve module-level stats
            mod_stats = {}
            if s_id == "puma":
                mod_stats = dict(puma.STATS)
            elif s_id == "6pm":
                mod_stats = dict(sixpm.STATS)
            elif s_id == "wellies":
                mod_stats = dict(wellies.STATS)

            source_stats[s_id] = {
                "status": "SUCCESS" if offers else "NO_OFFERS",
                "offers": len(offers),
                "skipped": mod_stats.get("skipped_no_price", mod_stats.get("skipped", 0)),
                "errors": mod_stats.get("errors", 0),
                "pages_fetched": mod_stats.get("pages_fetched", 0),
                "pages_with_price": mod_stats.get("pages_with_price", 0),
                "pages_without_price": mod_stats.get("pages_without_price", 0),
            }
        except (BlockedError, DisallowedError) as exc:
            print(f"FAILED: Source {s_name} encountered blocking/disallow: {exc}")
            source_stats[s_id] = {
                "status": f"FAILED: {exc}",
                "offers": 0,
                "skipped": 0,
                "errors": 1,
            }
        except Exception as exc:
            print(f"FAILED: Source {s_name} raised unexpected error: {exc}")
            source_stats[s_id] = {
                "status": f"FAILED: {exc}",
                "offers": 0,
                "skipped": 0,
                "errors": 1,
            }

    write_offers(all_offers)
    grouped = print_final_report(all_offers, source_stats, session)
    maybe_upsert_supabase(all_offers, grouped)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run HTML shoe scrapers.")
    parser.add_argument("--limit", type=int, default=150, help="Max products per source (default: 150)")
    args = parser.parse_args()
    run(limit=args.limit)
