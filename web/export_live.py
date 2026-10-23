import json
import re
from collections import Counter
from pathlib import Path
from urllib.request import Request, urlopen

src = Path("purge_database.py").read_text(encoding="utf-8")
SUPABASE_URL = re.search(r'SUPABASE_URL = "([^"]+)"', src).group(1)
SUPABASE_KEY = re.search(r'SUPABASE_KEY = "([^"]+)"', src).group(1)

def fetch_all(table, select_cols="*"):
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

products = fetch_all("products")
offers = fetch_all("offers")
print("fetched", len(products), len(offers))

pat = re.compile(
    r"\b(singlet|skort|henley|shacket|hoodigan|bomber|hoodie|pajama|shirt|tee|top|kids?|boys?|girls?)\b",
    re.I,
)
print("suspicious live products:")
n = 0
for p in products:
    m = pat.search(p.get("title") or "")
    if m:
        n += 1
        print(" ", m.group(0), "|", p.get("brand"), "|", p.get("title"))
print("count", n)

print("image missing", sum(1 for p in products if not (p.get("image_url") or "").startswith("http")))

Path("data").mkdir(exist_ok=True)
with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, indent=2)
with open("data/offers.json", "w", encoding="utf-8") as f:
    json.dump(offers, f, indent=2)
print("wrote data/products.json and data/offers.json")
print("categories", Counter(o.get("category") for o in offers).most_common())
