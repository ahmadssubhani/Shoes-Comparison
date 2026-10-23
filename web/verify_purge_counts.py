import json
import re

with open("scratch_bad_items.txt", "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

with open("data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

with open("data/offers.json", "r", encoding="utf-8") as f:
    offers = json.load(f)

# Real non-shoe products
EXCLUDE_TITLES = {
    "Speedcat Dress-Up Sneakers",
    "Hands Free Slip-Ins - Street Jogger by Mark Nason with Memory Foam Footbed"
}

from scratch_purge_check import bad_product_ids

# Filter out the 2 false positives
actual_bad_pids = set()
for p in products:
    if p["id"] in bad_product_ids and p["title"] not in EXCLUDE_TITLES:
        actual_bad_pids.add(p["id"])

bad_offers = [o for o in offers if o["product_id"] in actual_bad_pids]

print(f"Verified non-shoe products to delete: {len(actual_bad_pids)}")
print(f"Verified non-shoe offers to delete: {len(bad_offers)}")
print(f"Remaining clean products: {len(products) - len(actual_bad_pids)}")
print(f"Remaining clean offers: {len(offers) - len(bad_offers)}")

