"""Smoke test: run each source with limit=5 and print URL details + parsed offers table."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow imports from scraper directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

from base import PoliteSession, USER_AGENT
from stores import SOURCES


def run_smoke_test(limit: int = 5) -> None:
    print("=" * 70)
    print("                        SMOKE TEST (limit=5)")
    print("=" * 70)
    print(f"User-Agent: {USER_AGENT}")
    print(f"Delay: 2.0s | Timeout: 20.0s\n")

    session = PoliteSession(user_agent=USER_AGENT, delay=2.0, timeout=20.0)

    for src in SOURCES:
        s_id = src["id"]
        s_name = src["name"]
        scrape_fn = src["scrape"]

        req_start_idx = len(session.request_history)

        print("\n" + "#" * 60)
        print(f"  SOURCE: {s_name} ({s_id})")
        print("#" * 60)

        offers = []
        try:
            offers = scrape_fn(session, limit=limit)
        except Exception as exc:
            print(f"FAILED: Source {s_name} raised error: {exc}")

        # Show URLs fetched, robots result, and status code
        print(f"\n--- Requests for {s_name} ---")
        src_requests = session.request_history[req_start_idx:]
        print(f"{'URL':<65} | {'Robots':<8} | {'Status':<6}")
        print("-" * 85)
        for req in src_requests:
            u = req["url"]
            if len(u) > 63:
                u = u[:60] + "..."
            rob = "ALLOWED" if req.get("robots") else "DISALLOWED"
            st = str(req.get("status"))
            print(f"{u:<65} | {rob:<8} | {st:<6}")

        # Show parsed offers table
        print(f"\n--- Parsed Offers Table for {s_name} ({len(offers)} offers) ---")
        print(f"{'Title':<35} | {'Brand':<12} | {'Price':<8} | {'Orig Price':<10} | {'Curr':<5} | {'Image?':<6}")
        print("-" * 88)
        for off in offers:
            title = off.get("store_title") or "None"
            if len(title) > 33:
                title = title[:30] + "..."
            brand = off.get("brand") or "None"
            if len(brand) > 11:
                brand = brand[:10] + "."
            price = f"${off['price']:.2f}" if off.get("price") is not None else "None"
            if off.get("currency") == "GBP" and off.get("price") is not None:
                price = f"£{off['price']:.2f}"
            orig = "None"
            if off.get("compare_at_price") is not None:
                if off.get("currency") == "GBP":
                    orig = f"£{off['compare_at_price']:.2f}"
                else:
                    orig = f"${off['compare_at_price']:.2f}"
            curr = off.get("currency") or "USD"
            has_img = "YES" if off.get("image_url") else "NO"
            print(f"{title:<35} | {brand:<12} | {price:<8} | {orig:<10} | {curr:<5} | {has_img:<6}")


if __name__ == "__main__":
    run_smoke_test(limit=5)

