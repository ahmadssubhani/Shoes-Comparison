import json
import re

with open("data/offers.json", "r", encoding="utf-8") as f:
    offers = json.load(f)

kids_pattern = re.compile(r"\b(kids?|toddlers?|infants?|babies|baby|little kid|big kid|boys?|girls?|youth|children|child|preschool|grade school)\b", re.IGNORECASE)

kids_offers = []
for o in offers:
    title = o.get("store_title", "")
    m = kids_pattern.search(title)
    if m:
        kids_offers.append((o.get("id"), o.get("store"), title, m.group(0)))

print(f"Total kids offers found: {len(kids_offers)}")
for oid, store, title, match in kids_offers:
    print(f"[{match.upper()}] ({store}) {title}")

