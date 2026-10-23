import json
from scratch_purge_check import bad_product_ids, products

with open("scratch_bad_items.txt", "w", encoding="utf-8") as f:
    for p in products:
        if p["id"] in bad_product_ids:
            f.write(f"({p.get('brand')}) {p.get('title')}\n")

print(f"Wrote {len(bad_product_ids)} items to scratch_bad_items.txt")

