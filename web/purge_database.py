import json
import re
from urllib.request import Request, urlopen
import urllib.parse

SUPABASE_URL = "https://ayzegxvfbvntplxkukro.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5emVneHZmYnZudHBseGt1a3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQ5MjY2MSwiZXhwIjoyMTA4MDY4NjYxfQ.lnWRQ1hu73b403IzALZ9PVBP0Rs6aqgGSofQiFCxQB0"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def fetch_all(table, select_cols):
    rows = []
    limit = 1000
    offset = 0
    while True:
        h = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Range": f"{offset}-{offset + limit - 1}"
        }
        req = Request(f"{SUPABASE_URL}/rest/v1/{table}?select={select_cols}", headers=h)
        with urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows

shoe_exceptions = [
    re.compile(r"\b(low|mid|high)\s*[- ]\s*top\b", re.IGNORECASE),
    re.compile(r"\btop\s*[- ]\s*sider\b", re.IGNORECASE),
]

known_valid_shoes = {
    "speedcat dress-up sneakers",
    "hands free slip-ins - street jogger by mark nason with memory foam footbed"
}

non_shoe_patterns = [
    # Tops / Shirts
    r"\btop\b", r"\btops\b", r"\bt-shirt\b", r"\btee\b", r"\btees\b", r"\btank\b", r"\btanks\b",
    r"\bshirt\b", r"\bshirts\b", r"\bpolo\b", r"\bpolos\b", r"\bjersey\b", r"\bjerseys\b",
    r"\btunic\b", r"\btunics\b", r"\bcrop top\b",
    # Pajamas / Sleepwear
    r"\bpajama\b", r"\bpajamas\b", r"\bpj\b", r"\bpjs\b", r"\bsleepwear\b", r"\bnightwear\b",
    r"\brobe\b", r"\brobes\b",
    # Bottoms
    r"\bpant\b", r"\bpants\b", r"\bjogger\b", r"\bjoggers\b", r"\btrousers?\b",
    r"\blegging\b", r"\bleggings\b", r"\btights?\b",
    r"\bshort\b", r"\bshorts\b", r"\bsweatpants?\b", r"\bcapris?\b",
    # Underwear / Bras / Swim
    r"\bbra\b", r"\bbras\b", r"\bunderwear\b", r"\bboxer\b", r"\bboxers\b", r"\bbriefs?\b",
    r"\bthong\b", r"\bpanties\b", r"\bswim\b", r"\bbikini\b", r"\bswimsuit\b", r"\btrunk\b", r"\btrunks\b",
    # Dresses / Skirts / Rompers
    r"\bdress\b", r"\bdresses\b", r"\bskirt\b", r"\bskirts\b", r"\bromper\b", r"\bonesie\b", r"\bjumpsuit\b",
    # Outerwear
    r"\bhoodie\b", r"\bhoodies\b", r"\bsweatshirt\b", r"\bsweatshirts\b", r"\bsweater\b", r"\bsweaters\b",
    r"\bjacket\b", r"\bjackets\b", r"\bcoat\b", r"\bcoats\b", r"\bvest\b", r"\bvests\b",
    r"\bpullover\b", r"\bpullovers\b", r"\bwindbreaker\b", r"\banorak\b", r"\btracksuit\b",
    r"\bfleece\b", r"\bmid layer\b", r"\bouterwear\b", r"\bparka\b",
    # Necklines / Zips for clothing
    r"\b1/4\s*zip\b", r"\b1/2\s*zip\b", r"\bquarter\s*zip\b", r"\bhalf\s*zip\b",
    r"\bcrewneck\b", r"\bcrew\b",
    # Accessories
    r"\bsock\b", r"\bsocks\b",
    r"\bhat\b", r"\bhats\b", r"\bcap\b", r"\bcaps\b", r"\bbeanie\b", r"\bvisor\b",
    r"\bbag\b", r"\bbags\b", r"\bbackpack\b", r"\btote\b", r"\bduffel\b",
    r"\bglove\b", r"\bgloves\b", r"\bscarf\b", r"\bheadband\b", r"\bwristband\b", r"\bbelt\b",
    # Kids / Toddlers / Infants / Youth / Children
    r"\bkids?\b", r"\btoddler\b", r"\btoddlers\b", r"\binfant\b", r"\binfants\b",
    r"\bbaby\b", r"\bbabies\b", r"\blittle kid\b", r"\bbig kid\b",
    r"\bboys?\b", r"\bgirls?\b", r"\byouth\b", r"\bchildren\b", r"\bchild\b",
    r"\bpreschool\b", r"\bgrade school\b",
    # General apparel
    r"\bapparel\b", r"\bclothing\b",
]

compiled = [re.compile(p, re.IGNORECASE) for p in non_shoe_patterns]

def is_non_shoe(title):
    if not title:
        return False
    if title.lower().strip() in known_valid_shoes:
        return False
    cleaned = title
    for exc in shoe_exceptions:
        cleaned = exc.sub("", cleaned)
    for p in compiled:
        if p.search(cleaned):
            return True
    return False


def has_image(url):
    if not url:
        return False
    s = str(url).strip().lower()
    if not s or s in {"none", "null", "n/a"}:
        return False
    return s.startswith("http://") or s.startswith("https://")


def delete_in_batches(table, col, ids):
    id_list = list(ids)
    batch_size = 50
    total_deleted = 0
    for i in range(0, len(id_list), batch_size):
        batch = id_list[i:i + batch_size]
        id_filter = ",".join(urllib.parse.quote(str(x)) for x in batch)
        url = f"{SUPABASE_URL}/rest/v1/{table}?{col}=in.({id_filter})"
        req = Request(url, headers=headers, method="DELETE")
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            total_deleted += len(data)
    return total_deleted


def main():
    print("Fetching all records from Supabase...")
    products = fetch_all("products", "id,title,brand,match_key,image_url")
    offers = fetch_all("offers", "id,product_id,store_title,store,image_url")
    print(f"Initial: {len(products)} products, {len(offers)} offers in Supabase.")

    offers_by_pid = {}
    for o in offers:
        offers_by_pid.setdefault(o.get("product_id"), []).append(o)

    drop_prod_ids = set()
    drop_offer_ids = set()

    for p in products:
        title = p.get("title")
        if is_non_shoe(title):
            drop_prod_ids.add(p["id"])
            continue
        prod_offers = offers_by_pid.get(p["id"], [])
        if any(is_non_shoe(o.get("store_title")) for o in prod_offers):
            drop_prod_ids.add(p["id"])
            continue
        if not has_image(p.get("image_url")) and not any(has_image(o.get("image_url")) for o in prod_offers):
            drop_prod_ids.add(p["id"])

    for o in offers:
        if o.get("product_id") in drop_prod_ids or is_non_shoe(o.get("store_title")):
            drop_offer_ids.add(o["id"])
            if o.get("product_id"):
                drop_prod_ids.add(o["product_id"])

    for o in offers:
        if o.get("product_id") in drop_prod_ids:
            drop_offer_ids.add(o["id"])

    print(f"Products to delete (non-shoe, kids, or no photo): {len(drop_prod_ids)}")
    print(f"Offers to delete: {len(drop_offer_ids)}")

    print("Deleting offers from Supabase...")
    del_offers_count = delete_in_batches("offers", "id", drop_offer_ids)
    print(f"Deleted {del_offers_count} offers.")

    print("Deleting products from Supabase...")
    del_prods_count = delete_in_batches("products", "id", drop_prod_ids)
    print(f"Deleted {del_prods_count} products.")

    remaining_prods = fetch_all("products", "id,title")
    remaining_offers = fetch_all("offers", "id,store_title")
    print(f"\nRemaining in Supabase: {len(remaining_prods)} products, {len(remaining_offers)} offers.")

    print("\nCleaning local JSON files...")
    with open("data/products.json", "r", encoding="utf-8") as f:
        local_prods = json.load(f)

    local_offers_by_pid = {}
    with open("data/offers.json", "r", encoding="utf-8") as f:
        local_offers = json.load(f)
    for o in local_offers:
        local_offers_by_pid.setdefault(o.get("product_id"), []).append(o)

    clean_local_prods = []
    keep_ids = set()
    for p in local_prods:
        title = p.get("title", "")
        if is_non_shoe(title):
            continue
        p_offers = local_offers_by_pid.get(p.get("id"), [])
        if any(is_non_shoe(o.get("store_title", "")) for o in p_offers):
            continue
        if not has_image(p.get("image_url")) and not any(has_image(o.get("image_url")) for o in p_offers):
            continue
        clean_local_prods.append(p)
        keep_ids.add(p.get("id"))

    with open("data/products.json", "w", encoding="utf-8") as f:
        json.dump(clean_local_prods, f, indent=2)
    print(f"products.json updated: {len(local_prods)} -> {len(clean_local_prods)}")

    clean_local_offers = [
        o for o in local_offers
        if o.get("product_id") in keep_ids and not is_non_shoe(o.get("store_title", ""))
    ]
    with open("data/offers.json", "w", encoding="utf-8") as f:
        json.dump(clean_local_offers, f, indent=2)
    print(f"offers.json updated: {len(local_offers)} -> {len(clean_local_offers)}")
    print("\nDatabase and local JSON files purge complete!")


if __name__ == "__main__":
    main()

