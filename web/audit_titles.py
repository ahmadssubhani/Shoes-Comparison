import json
import re
from collections import Counter
from pathlib import Path
from urllib.request import Request, urlopen

src = Path("purge_database.py").read_text(encoding="utf-8")
SUPABASE_URL = re.search(r'SUPABASE_URL = "([^"]+)"', src).group(1)
SUPABASE_KEY = re.search(r'SUPABASE_KEY = "([^"]+)"', src).group(1)

def fetch_all(table, select_cols):
    rows = []
    limit = 1000
    offset = 0
    while True:
        h = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Range": f"{offset}-{offset + limit - 1}",
        }
        req = Request(f"{SUPABASE_URL}/rest/v1/{table}?select={select_cols}", headers=h)
        with urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows

products = fetch_all("products", "id,title,brand,image_url")
offers = fetch_all("offers", "id,product_id,store_title,store,image_url,category,url")

print("counts", len(products), len(offers))
print("categories", Counter(o.get("category") for o in offers).most_common())
print("stores", Counter(o.get("store") for o in offers).most_common())

suspicious_words = [
    "pajama", "pajamas", "sleep", "nightwear", "top", "tops", "shirt", "tee", "tank",
    "pant", "pants", "jogger", "joggers", "short", "shorts", "hoodie", "jacket", "sock", "hat", "cap",
    "kid", "kids", "toddler", "infant", "baby", "boy", "boys", "girl", "girls",
    "youth", "child", "bra", "dress", "skirt", "bag", "backpack", "glove",
    "apparel", "clothing", "crew", "fleece", "polo", "legging",
]

print("\n=== Suspicious title hits ===")
hits = []
for p in products:
    title = (p.get("title") or "")
    low = title.lower()
    for w in suspicious_words:
        if re.search(rf"\b{re.escape(w)}\b", low):
            hits.append((w, p.get("brand"), title))
            break
print("count", len(hits))
print("by word", Counter(h[0] for h in hits).most_common())
for h in hits:
    print(f"  [{h[0]}] {h[1]} | {h[2]}")

print("\n=== Suspicious offer titles ===")
ohits = []
for o in offers:
    title = o.get("store_title") or ""
    low = title.lower()
    for w in suspicious_words:
        if re.search(rf"\b{re.escape(w)}\b", low):
            ohits.append((w, o.get("store"), title))
            break
print("count", len(ohits))
print("by word", Counter(h[0] for h in ohits).most_common())
for h in ohits[:100]:
    print(f"  [{h[0]}] {h[1]} | {h[2]}")

shoe_words = re.compile(
    r"\b(shoe|shoes|sneaker|sneakers|boot|boots|sandal|sandals|slide|slides|"
    r"slip-on|slip-ins|cleat|cleats|clog|clogs|loafer|trainer|trainers|"
    r"runner|runners|spike|spikes|mule|heel|heels|pump|pumps|oxford|"
    r"footwear|flip-flop|flip flop|wellies|slipper|slippers)\b",
    re.I,
)
print("\n=== Products without shoe noun ===")
no_noun = [(p.get("brand"), p.get("title")) for p in products if not shoe_words.search(p.get("title") or "")]
print("count", len(no_noun))
for item in no_noun[:100]:
    print(" ", item[0], "|", item[1])
