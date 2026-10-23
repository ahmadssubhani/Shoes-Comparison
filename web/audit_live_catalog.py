import json
import re
from collections import Counter
from urllib.request import Request, urlopen

from purge_database import SUPABASE_URL, SUPABASE_KEY, fetch_all, is_non_shoe

def has_image(url):
    if not url:
        return False
    s = str(url).strip().lower()
    if not s or s in {"none", "null", "n/a"}:
        return False
    return s.startswith("http://") or s.startswith("https://")

print("Fetching live catalog...")
products = fetch_all("products", "id,title,brand,image_url,match_key")
offers = fetch_all("offers", "id,product_id,store_title,store,image_url,category")
print(f"Live totals: {len(products)} products, {len(offers)} offers")

offers_by_pid = {}
for o in offers:
    offers_by_pid.setdefault(o.get("product_id"), []).append(o)

non_shoe_hits = []
no_image = []
for p in products:
    flagged = is_non_shoe(p.get("title"))
    hit_word = None
    if flagged:
        hit_word = "product-title"
    else:
        for o in offers_by_pid.get(p["id"], []):
            if is_non_shoe(o.get("store_title")):
                flagged = True
                hit_word = "offer-title"
                break
    if flagged:
        non_shoe_hits.append((hit_word, p.get("brand"), p.get("title"), p["id"]))
        continue
    img = p.get("image_url")
    if not has_image(img):
        offer_imgs = [o.get("image_url") for o in offers_by_pid.get(p["id"], [])]
        if not any(has_image(u) for u in offer_imgs):
            no_image.append((p.get("brand"), p.get("title"), p["id"], img))

print(f"\nNon-shoe / kids products: {len(non_shoe_hits)}")
print("  samples:")
for item in non_shoe_hits[:50]:
    print("   ", item[0], "|", item[1], "|", item[2])

print(f"\nNo product picture: {len(no_image)}")
for item in no_image[:40]:
    print("   ", item[0], "|", item[1], "| img=", item[3])

prod_ids = {p["id"] for p in products}
orphan_offers = [o for o in offers if o.get("product_id") not in prod_ids]
print(f"\nOrphan offers: {len(orphan_offers)}")
