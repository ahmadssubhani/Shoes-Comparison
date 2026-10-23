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

offers = fetch_all("offers", "id,product_id,store_title,store,image_url,url,category")
products = fetch_all("products", "id,title,brand,image_url")
prod_map = {p["id"]: p for p in products}

url_flags = [
    ("kids", re.compile(r"/kids|/youth|/toddler|/infant|/boys|/girls|/child", re.I)),
    ("clothing", re.compile(r"/clothing|/apparel|/tops|/pajamas|/sleepwear|/pants|/shorts|/hoodie", re.I)),
    ("nike-apparel", re.compile(r"nike.com/.*/(clothing|apparel)", re.I)),
]

print("=== URL path flags ===")
flagged = []
for o in offers:
    url = o.get("url") or ""
    for name, pat in url_flags:
        if pat.search(url):
            p = prod_map.get(o.get("product_id"), {})
            flagged.append((name, o.get("store"), p.get("title"), url[:120]))
            break
print("count", len(flagged), Counter(x[0] for x in flagged))
for x in flagged[:60]:
    print(f"  [{x[0]}] {x[1]} | {x[2]} | {x[3]}")

print("\n=== Missing images (product + offers) ===")
offers_by = {}
for o in offers:
    offers_by.setdefault(o.get("product_id"), []).append(o)

def ok_img(u):
    s = (u or "").strip().lower()
    return s.startswith("http://") or s.startswith("https://")

missing = []
for p in products:
    if ok_img(p.get("image_url")):
        continue
    imgs = [o.get("image_url") for o in offers_by.get(p["id"], [])]
    if not any(ok_img(u) for u in imgs):
        missing.append((p.get("brand"), p.get("title"), p["id"]))
print("count", len(missing))
for m in missing:
    print(" ", m[0], "|", m[1])

print("\n=== Unique URL path prefixes (host+first 2 segments) ===")
prefs = Counter()
for o in offers:
    url = o.get("url") or ""
    m = re.match(r"https?://[^/]+(/[^/]+){1,3}", url)
    if m:
        prefs[m.group(0)] += 1
for pref, n in prefs.most_common(40):
    print(f"  {n:4d} {pref}")
