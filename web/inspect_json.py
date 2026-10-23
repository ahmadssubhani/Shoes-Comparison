import json

with open("data/offers.json", "r", encoding="utf-8") as f:
    offers = json.load(f)

print(type(offers), len(offers))
if isinstance(offers, list) and len(offers) > 0:
    print(list(offers[0].keys()))
    print(offers[0])

