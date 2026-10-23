import json, sys
sys.path.insert(0, "scraper")
from scrape_all import StoreSession, USER_AGENT

offers = json.load(open("data/offers_zappos.json", encoding="utf-8"))
for o in offers[:5]:
    print(o["store_title"], "|", o["price"], "|", o.get("compare_at_price"), "|", o.get("colorway"), "|", o.get("sizes"))

url = offers[0]["url"]
s = StoreSession(user_agent=USER_AGENT)
status, text = s.get(url)
print("\n", url, status, len(text))
for m in ["__INITIAL_STATE__", "application/ld+json", "__NEXT_DATA__", "colorId", "stocks", "originalPrice", "window.__"]:
    print(m, text.count(m))
for m in ["colorId", "originalPrice", "window.__"]:
    i = text.find(m)
    if i >= 0:
        print("\n---", m, "---")
        print(text[max(0, i - 200): i + 500])