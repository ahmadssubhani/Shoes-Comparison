import json
import re
from urllib.request import Request, urlopen

SUPABASE_URL = "https://ayzegxvfbvntplxkukro.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5emVneHZmYnZudHBseGt1a3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQ5MjY2MSwiZXhwIjoyMTA4MDY4NjYxfQ.lnWRQ1hu73b403IzALZ9PVBP0Rs6aqgGSofQiFCxQB0"

def fetch_all(table, select_cols):
    rows = []
    limit = 1000
    offset = 0
    while True:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Range": f"{offset}-{offset + limit - 1}"
        }
        req = Request(f"{SUPABASE_URL}/rest/v1/{table}?select={select_cols}", headers=headers)
        with urlopen(req) as resp:
            batch = json.loads(resp.read().decode())
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows

products = fetch_all("products", "id,title,brand,match_key")
offers = fetch_all("offers", "id,product_id,store_title,store,category")

print(f"Total Products in Supabase: {len(products)}")
print(f"Total Offers in Supabase: {len(offers)}")

# Safe exceptions where "top" or similar words appear in shoe model names
shoe_exceptions = [
    re.compile(r"\b(low|mid|high)\s*[- ]\s*top\b", re.IGNORECASE),
    re.compile(r"\btop\s*[- ]\s*sider\b", re.IGNORECASE),
]

# Patterns for non-shoe items (apparel, accessories, kids)
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
    r"\bcrewneck\b", r"\bcrew\b",  # note: crew could be Skechers Alumni Crew, etc.
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

# Exceptions to "crew": Are there any shoes named "Crew"? (e.g. J.Crew collab)
# Let's check how "crew" behaves.

def check_title(title):
    cleaned = title
    for exc in shoe_exceptions:
        cleaned = exc.sub("", cleaned)
    for p in compiled:
        m = p.search(cleaned)
        if m:
            return True, m.group(0)
    return False, None

flagged_products = []
clean_products = []

for p in products:
    title = p.get("title") or ""
    fl, reason = check_title(title)
    if fl:
        flagged_products.append((p, reason))
    else:
        clean_products.append(p)

print(f"\nFlagged non-shoe products: {len(flagged_products)}")
print(f"Clean footwear products: {len(clean_products)}")

# Print reason breakdown
from collections import Counter
c = Counter([r.lower() for _, r in flagged_products])
print("\nBreakdown:")
for k, v in c.most_common():
    print(f"  {k}: {v}")

print("\nSample flagged items (25):")
for p, r in flagged_products[:25]:
    print(f"  [{r.upper()}] ({p.get('brand')}) {p.get('title')}")

