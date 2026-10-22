import json
import re
from pathlib import Path

products = json.loads(Path("data/products.json").read_text(encoding="utf-8"))
offers = json.loads(Path("data/offers.json").read_text(encoding="utf-8"))

words = [
    "singlet", "skort", "henley", "shacket", "hoodigan", "bomber", "hoodie",
    "jacket", "shirt", "tee", "tank", "pant", "short", "sock", "hat", "cap",
    "bra", "dress", "skirt", "pajama", "robe", "legging", "tight", "sweatshirt",
    "sweater", "vest", "coat", "polo", "jersey", "tunic", "romper", "onesie",
    "jumpsuit", "fleece", "parka", "bag", "glove", "scarf", "belt", "visor",
    "beanie", "apparel", "clothing", "kid", "kids", "boy", "boys", "girl", "girls",
    "youth", "toddler", "infant", "baby", "child", "top", "tops",
]
pat = re.compile(r"\b(" + "|".join(words) + r")\b", re.I)
shoe_noun = re.compile(r"\b(sneakers?|shoes?|footwear)\b", re.I)

print("=== products ===")
for p in products:
    t = p.get("title") or ""
    m = pat.search(t)
    if m:
        print(f"  [{m.group(0)}] shoe_noun={bool(shoe_noun.search(t))} | {p.get('brand')} | {t}")

print("\n=== offers extra ===")
seen = {(p.get("title") or "").lower() for p in products}
for o in offers:
    t = o.get("store_title") or ""
    if t.lower() in seen:
        continue
    m = pat.search(t)
    if m:
        print(f"  [{m.group(0)}] shoe_noun={bool(shoe_noun.search(t))} | {t}")
