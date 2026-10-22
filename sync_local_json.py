import json
import re
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

live_prods = fetch_all("products", "id")
keep = {p["id"] for p in live_prods}
print("live products", len(keep))

with open("data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)
with open("data/offers.json", "r", encoding="utf-8") as f:
    offers = json.load(f)

clean_p = [p for p in products if p.get("id") in keep]
clean_o = [o for o in offers if o.get("product_id") in keep]
print(f"products.json {len(products)} -> {len(clean_p)}")
print(f"offers.json {len(offers)} -> {len(clean_o)}")
dropped = [p.get("title") for p in products if p.get("id") not in keep]
print("dropped titles:")
for t in dropped:
    print(" ", t)

with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump(clean_p, f, indent=2)
with open("data/offers.json", "w", encoding="utf-8") as f:
    json.dump(clean_o, f, indent=2)
print("synced")
