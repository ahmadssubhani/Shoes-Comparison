import json, collections
d = json.load(open("data/offers.json", encoding="utf-8"))
offers = d["offers"] if isinstance(d, dict) and "offers" in d else d
by = collections.defaultdict(list)
for o in offers:
    by[o["store"]].append(o)
for store, items in by.items():
    brands = collections.Counter(o.get("brand") for o in items).most_common(5)
    prices = [o["price"] for o in items if o.get("price") is not None]
    soccer = sum(1 for o in items if any(w in (o.get("store_title") or "").lower() for w in ("soccer", "cleat")))
    print(f"\n{store}: {len(items)} offers | price {min(prices):.2f}-{max(prices):.2f} {items[0].get('currency')}")
    print("  top brands:", brands)
    print("  with image:", sum(1 for o in items if o.get("image_url")),
          "| with sizes:", sum(1 for o in items if o.get("sizes")),
          "| soccer/cleat titles:", soccer)
