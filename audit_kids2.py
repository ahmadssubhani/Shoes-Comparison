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

products = fetch_all("products", "id,title,brand,image_url")
offers = fetch_all("offers", "id,product_id,store_title,url,sizes")

pat = re.compile(r"\b(gs|ps|td|big kid|little kid|grade school|preschool|youth|kids?|boys?|girls?|toddler|infant|baby|child|children)\b", re.I)
print("product title kids-like")
n = 0
for p in products:
    t = p.get("title") or ""
    m = pat.search(t)
    if m:
        n += 1
        print(" ", m.group(0), "|", p.get("brand"), "|", t)
print("count", n)

print("\noffer title/url kids-like")
n = 0
for o in offers:
    blob = f"{o.get('store_title')} {o.get('url')}"
    m = pat.search(blob)
    if m:
        n += 1
        print(" ", m.group(0), "|", o.get("store_title")[:80], "|", (o.get("url") or "")[:100])
print("count", n)

# sizes that look like kids (1Y, 2Y, 10C, etc.)
print("\nkids sizes?")
kid_size = re.compile(r"(\b\d{1,2}(C|Y)\b|\btoddler\b|\byouth\b)", re.I)
for o in offers:
    sizes = o.get("sizes") or []
    if isinstance(sizes, str):
        try:
            sizes = json.loads(sizes)
        except Exception:
            sizes = [sizes]
    blob = " ".join(str(s) for s in sizes)
    if kid_size.search(blob) and not re.search(r"\b(men|women|adult)\b", (o.get("store_title") or ""), re.I):
        print(" ", o.get("store_title"), sizes[:8])
