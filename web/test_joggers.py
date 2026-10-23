import json
import re

with open("data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

# Inspect products containing 'jogger'
joggers = [p for p in products if re.search(r"\bjogger", p["title"], re.I)]
print("JOGGERS:")
for p in joggers:
    print(" ", p["brand"], "-->", p["title"])

# Inspect products containing 'dress'
dresses = [p for p in products if re.search(r"\bdress", p["title"], re.I)]
print("\nDRESSES:")
for p in dresses:
    print(" ", p["brand"], "-->", p["title"])

