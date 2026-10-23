import json
import re

with open("scratch_bad_items.txt", "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

shoe_words = re.compile(r"\b(sneakers?|shoes?|boots?|sandals?|footbed|cleats?|slides?|loafers?|slip-ons?|slip-ins)\b", re.IGNORECASE)

shoe_lookalikes = []
for line in lines:
    if shoe_words.search(line):
        shoe_lookalikes.append(line)

print(f"Flagged items with shoe keywords: {len(shoe_lookalikes)}")
for item in shoe_lookalikes:
    print(" ", item)

