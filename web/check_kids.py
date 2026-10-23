import json
import re

with open("data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

kids_pattern = re.compile(r"\b(kids?|toddlers?|infants?|babies|baby|little kid|big kid|boys?|girls?|youth|children|child|preschool|grade school)\b", re.IGNORECASE)

kids_items = []
for p in products:
    title = p.get("title", "")
    m = kids_pattern.search(title)
    if m:
        kids_items.append((p.get("id"), p.get("brand"), title, m.group(0)))

print(f"Total kids items found: {len(kids_items)}")
for pid, brand, title, match in kids_items:
    print(f"[{match.upper()}] ({brand}) {title}")

