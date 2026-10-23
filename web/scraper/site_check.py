# import requests, re, time

# SITES = ["nike.com","adidas.com","skechers.com","newbalance.com","reebok.com",
#          "zappos.com","hibbett.com","shoecarnival.com","famousfootwear.com"]
# H = {"User-Agent": "Mozilla/5.0 (compatible; StudentProjectBot/1.0)"}

# for s in SITES:
#     print(f"\n=== {s} ===")
#     for host in (f"https://www.{s}", f"https://{s}"):
#         try:
#             r = requests.get(host + "/robots.txt", headers=H, timeout=15)
#             print(f"robots.txt: HTTP {r.status_code}")
#             if r.status_code == 200:
#                 txt = r.text
#                 dis = [l for l in txt.splitlines() if l.lower().startswith("disallow")]
#                 print("  disallow rules:", len(dis))
#                 print("  sitemaps:", re.findall(r"(?i)^sitemap:\s*(\S+)", txt, re.M)[:3])
#                 print("  crawl-delay:", re.findall(r"(?i)^crawl-delay:\s*(\S+)", txt, re.M)[:2])
#                 print("  rules mentioning product/search/shoe:",
#                       [l for l in dis if re.search(r"product|/p/|/pd/|search|shoe|sneaker", l, re.I)][:6])
#             time.sleep(2)
#             h = requests.get(host + "/", headers=H, timeout=15)
#             print(f"homepage: HTTP {h.status_code}, {len(h.text)} bytes, shopify={'cdn.shopify.com' in h.text}")
#             break
#         except Exception as e:
#             print("  error:", type(e).__name__, str(e)[:80])
#     time.sleep(2)

import re
import time
import requests

SITES = [
    "https://www.nike.com",
    "https://www.adidas.com",
    "https://www.skechers.com",
    "https://www.newbalance.com",
    "https://www.reebok.com",
    "https://www.zappos.com",
    "https://www.hibbett.com",
    "https://www.shoecarnival.com",
    "https://www.famousfootwear.com",
    "https://www.underarmour.com",
    "https://www.asics.com",
    "https://www.finishline.com",
]
H = {"User-Agent": "Mozilla/5.0 (compatible; StudentProjectBot/1.0)"}
PRODUCT_WORDS = r"product|/p/|/pd/|/pdp|search|shoe|sneaker|running"

for base in SITES:
    print(f"\n=== {base} ===")
    try:
        r = requests.get(base + "/robots.txt", headers=H, timeout=15)
        print(f"robots.txt: HTTP {r.status_code}")
        if r.status_code == 200:
            txt = r.text
            dis = [l.strip() for l in txt.splitlines() if l.lower().startswith("disallow")]
            print("  disallow rules:", len(dis))
            print("  sitemaps:", re.findall(r"(?i)^sitemap:\s*(\S+)", txt, re.M)[:3])
            print("  crawl-delay:", re.findall(r"(?i)^crawl-delay:\s*(\S+)", txt, re.M)[:2])
            print("  product/search/shoe rules:",
                  [l for l in dis if re.search(PRODUCT_WORDS, l, re.I)][:8])
        time.sleep(2)
        h = requests.get(base + "/", headers=H, timeout=15)
        print(f"homepage: HTTP {h.status_code}, {len(h.text)} bytes, "
              f"shopify={'cdn.shopify.com' in h.text}")
    except Exception as e:
        print("  error:", type(e).__name__, str(e)[:100])
    time.sleep(2)

print("\nDone.")