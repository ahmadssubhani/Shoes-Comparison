import json
import re

with open("data/products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

shoe_exceptions = [
    re.compile(r"\b(low|mid|high)\s*[- ]\s*top\b", re.IGNORECASE),
    re.compile(r"\btop\s*[- ]\s*sider\b", re.IGNORECASE),
]

apparel_and_kids = [
    r"\btop\b", r"\btops\b", r"\bt-shirt\b", r"\btee\b", r"\btees\b", r"\btank\b", r"\btanks\b",
    r"\bshirt\b", r"\bshirts\b", r"\bpolo\b", r"\bpolos\b", r"\bjersey\b", r"\bjerseys\b",
    r"\bpajama\b", r"\bpajamas\b", r"\bpj\b", r"\bpjs\b", r"\bsleepwear\b", r"\bnightwear\b",
    r"\bpant\b", r"\bpants\b", r"\bjogger\b", r"\bjoggers\b", r"\btrousers?\b",
    r"\blegging\b", r"\bleggings\b", r"\btights?\b",
    r"\bshort\b", r"\bshorts\b",
    r"\bbra\b", r"\bbras\b", r"\bunderwear\b", r"\bboxer\b", r"\bboxers\b", r"\bbriefs?\b",
    r"\bswim\b", r"\bbikini\b", r"\bswimsuit\b", r"\btrunk\b", r"\btrunks\b",
    r"\bdress\b", r"\bdresses\b", r"\bskirt\b", r"\bskirts\b", r"\bromper\b", r"\bonesie\b",
    r"\bhoodie\b", r"\bhoodies\b", r"\bsweatshirt\b", r"\bsweatshirts\b", r"\bsweater\b", r"\bsweaters\b",
    r"\bjacket\b", r"\bjackets\b", r"\bcoat\b", r"\bcoats\b", r"\bvest\b", r"\bvests\b",
    r"\bpullover\b", r"\bpullovers\b", r"\bwindbreaker\b", r"\banorak\b", r"\btracksuit\b",
    r"\bfleece\b",
    r"\bsock\b", r"\bsocks\b",
    r"\bhat\b", r"\bhats\b", r"\bcap\b", r"\bcaps\b", r"\bbeanie\b", r"\bvisor\b",
    r"\bbag\b", r"\bbags\b", r"\bbackpack\b", r"\btote\b", r"\bduffel\b",
    r"\bglove\b", r"\bgloves\b", r"\bscarf\b", r"\bheadband\b", r"\bwristband\b", r"\bbelt\b",
    r"\bkids?\b", r"\btoddler\b", r"\btoddlers\b", r"\binfant\b", r"\binfants\b",
    r"\bbaby\b", r"\bbabies\b", r"\blittle kid\b", r"\bbig kid\b",
    r"\bboys?\b", r"\bgirls?\b", r"\byouth\b", r"\bchildren\b", r"\bchild\b",
    r"\bapparel\b", r"\bclothing\b",
]

compiled_patterns = [re.compile(p, re.IGNORECASE) for p in apparel_and_kids]

def is_flagged(title):
    cleaned_title = title
    for exc in shoe_exceptions:
        cleaned_title = exc.sub("", cleaned_title)
    for p in compiled_patterns:
        m = p.search(cleaned_title)
        if m:
            return True, m.group(0)
    return False, None

shoe_words = [r"\bshoe\b", r"\bshoes\b", r"\bsneaker\b", r"\bsneakers\b", r"\bboot\b", r"\bboots\b",
              r"\bsandal\b", r"\bsandals\b", r"\bslide\b", r"\bslides\b", r"\bslip-on\b", r"\bslip-ins\b",
              r"\bcleat\b", r"\bcleats\b", r"\bclog\b", r"\bclogs\b", r"\bflip flop\b", r"\bloafer\b", r"\bflats?\b",
              r"\brunner\b", r"\btrainer\b", r"\btrainers\b", r"\bspikes?\b", r"\bmule\b", r"\bespadrille\b",
              r"\bfootwear\b", r"\bheels?\b", r"\bpump\b", r"\bpumps\b", r"\boxford\b", r"\bderby\b",
              r"\bclog\b", r"\bflip-flop\b", r"\bplatform\b", r"\bwedge\b"]

clean = []
for p in products:
    fl, _ = is_flagged(p.get("title", ""))
    if not fl:
        clean.append(p)

no_shoe_word = []
for p in clean:
    title = p.get("title", "")
    if not any(re.search(sw, title, re.I) for sw in shoe_words):
        no_shoe_word.append((p.get("id"), title, p.get("brand"), p.get("image_url")))

print(f"Items remaining without explicit shoe noun: {len(no_shoe_word)}")
# Check all of them for any suspicious words:
for pid, title, brand, img in no_shoe_word:
    # Print if title looks suspicious
    lower = title.lower()
    # Check if there are any suspicious items
    for word in ["crew", "knit", "layer", "tight", "thermal", "gaiter", "suit", "pad", "shinguard", "watch", "bottle", "sunglasses", "glasses", "strap", "wallet"]:
        if re.search(r"\b" + word + r"\b", lower):
            print(f"  Suspicious [{word}]: ({brand}) {title}")

