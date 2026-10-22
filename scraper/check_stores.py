"""Stage A: probe Pakistan candidate stores. Public data only; respect robots.txt."""

from __future__ import annotations

import json
import re
import time
from collections import Counter, defaultdict
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests

USER_AGENT = "Mozilla/5.0 (student-project; contact: ahmedssubhani@gmail.com)"
DELAY_SECONDS = 2
PRODUCT_LIMIT = 50
TIMEOUT = 20

SHOPIFY_PATH = "/products.json"
SHOPIFY_QUERY = f"{SHOPIFY_PATH}?limit={PRODUCT_LIMIT}"
WOO_PATH = "/wp-json/wc/store/v1/products"
WOO_QUERY = f"{WOO_PATH}?per_page={PRODUCT_LIMIT}"
CART_PATH = "/cart.js"

# Local brands + Servis official domain from search.
# Multi-brand: elmstreet.pk plus four other PK retailers that list Nike/Adidas/Puma/etc.
# Official brand PK sites: test even if they are likely to block; Skechers PK partner is stepabove.pk.
CANDIDATES = [
    "bata.com.pk",
    "ndure.com",
    "borjan.com.pk",
    "stylo.pk",
    "unze.com.pk",
    "servis.pk",
    "elmstreet.pk",
    "speedsports.pk",
    "sportsplus.pk",
    "affinity.com.pk",
    "shoestreet.pk",
    "puma.com.pk",
    "nike.com.pk",
    "adidas.com.pk",
    "stepabove.pk",
]

TARGET_BRANDS = ("nike", "adidas", "puma", "skechers", "new balance")

FOOTWEAR_KEYWORDS = (
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "boot",
    "boots",
    "sandal",
    "sandals",
    "slipper",
    "loafer",
    "trainer",
    "cleat",
    "footwear",
    "slide",
    "slides",
    "clog",
    "mule",
    "oxford",
    "heel",
    "pump",
    "khussa",
    "chappal",
    "jogger",
    "running",
)

CHALLENGE_MARKERS = (
    "just a moment",
    "attention required",
    "cf-browser-verification",
    "captcha",
    "enable javascript and cookies",
    "please verify you are a human",
    "access denied",
    "checking your browser",
)

BLOCK_STATUSES = {403, 429, 503}
PUNCT_RE = re.compile(r"[^a-z0-9\s]+")
PAREN_RE = re.compile(r"\([^)]*\)")
DROP_WORDS = {
    "mens",
    "men",
    "womens",
    "women",
    "kids",
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "in",
    "pakistan",
    "pk",
}

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept": "*/*"})


class HrefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        for name, value in attrs:
            if name == "href" and value:
                self.hrefs.append(value)


def pause() -> None:
    time.sleep(DELAY_SECONDS)


def looks_like_challenge(text: str) -> bool:
    lowered = (text or "").lower()
    return any(marker in lowered for marker in CHALLENGE_MARKERS)


def fail(domain: str, reason: str, extra: dict | None = None) -> dict:
    print(f"FAILED  {domain}: {reason}")
    row = {"domain": domain, "ok": False, "reason": reason, "platform": None}
    if extra:
        row.update(extra)
    return row


def to_float(value: Any) -> float | None:
    if value in (None, "", False):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).replace(",", "").replace("Rs.", "").replace("Rs", "").replace("PKR", "")
    text = text.replace("$", "").strip()
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def guess_currency(hints: list[str], prices: list[float]) -> str:
    blob = " ".join(hints).upper()
    if "PKR" in blob or "RS." in blob or "RS " in blob or "₨" in blob:
        return "PKR"
    if "USD" in blob or "$" in blob:
        return "USD"
    if prices and min(prices) >= 500:
        return "PKR (inferred from price magnitude)"
    if prices and max(prices) < 500:
        return "unknown (prices look small; maybe USD)"
    return "unknown"


def looks_like_footwear(bits: list[str]) -> bool:
    haystack = " ".join(bits).lower()
    return any(keyword in haystack for keyword in FOOTWEAR_KEYWORDS)


def brand_hits(bits: list[str]) -> set[str]:
    haystack = " ".join(bits).lower()
    found: set[str] = set()
    for brand in TARGET_BRANDS:
        if brand in haystack:
            found.add(brand)
    return found


def clean_model(title: str) -> str:
    text = (title or "").lower()
    text = PAREN_RE.sub(" ", text)
    if " - " in text:
        head, tail = text.split(" - ", 1)
        if "/" in tail or tail.count(" ") <= 6:
            text = head
    text = PUNCT_RE.sub(" ", text)
    words = [w for w in text.split() if w and w not in DROP_WORDS]
    return " ".join(words)


def load_robots(domain: str) -> tuple[RobotFileParser | None, str | None]:
    robots_url = f"https://{domain}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(robots_url)
    pause()
    try:
        resp = SESSION.get(robots_url, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        return None, f"robots.txt request error: {exc}"
    if resp.status_code in BLOCK_STATUSES:
        return None, f"robots.txt status {resp.status_code}"
    if looks_like_challenge(resp.text):
        return None, "robots.txt looks like a challenge/block page"
    parser.parse(resp.text.splitlines())
    return parser, None


def allowed(parser: RobotFileParser, path: str) -> bool:
    return parser.can_fetch(USER_AGENT, path)


def get(url: str) -> requests.Response | None:
    pause()
    try:
        return SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException:
        return None


def classify_response(resp: requests.Response | None, what: str) -> tuple[str, Any | None]:
    if resp is None:
        return f"{what} request error", None
    if resp.status_code in BLOCK_STATUSES:
        return f"{what} status {resp.status_code}", None
    if looks_like_challenge(resp.text):
        return f"{what} challenge/block page", None
    return "ok", resp


def parse_json(resp: requests.Response) -> Any | None:
    try:
        return resp.json()
    except json.JSONDecodeError:
        return None


def shopify_products(payload: Any) -> list[dict] | None:
    if isinstance(payload, dict) and isinstance(payload.get("products"), list):
        return payload["products"]
    return None


def analyze_shopify(products: list[dict]) -> dict:
    titles: list[str] = []
    vendors: Counter[str] = Counter()
    shoe_count = 0
    discount_count = 0
    prices: list[float] = []
    currency_hints: list[str] = []
    target: set[str] = set()
    for product in products:
        title = str(product.get("title") or "")
        vendor = (product.get("vendor") or "").strip() or "(blank)"
        titles.append(title)
        vendors[vendor] += 1
        bits = [
            title,
            vendor,
            str(product.get("product_type") or ""),
            str(product.get("tags") or ""),
            str(product.get("handle") or ""),
        ]
        if looks_like_footwear(bits):
            shoe_count += 1
        target |= brand_hits(bits)
        had_real = False
        for variant in product.get("variants") or []:
            price = to_float(variant.get("price"))
            compare = to_float(variant.get("compare_at_price"))
            if price is not None:
                prices.append(price)
            if compare is not None and price is not None and compare > price:
                had_real = True
            for presentment in variant.get("presentment_prices") or []:
                price_obj = presentment.get("price") or {}
                currency_hints.append(str(price_obj.get("currency_code") or ""))
        if had_real:
            discount_count += 1
    return {
        "titles": titles,
        "vendors": vendors,
        "shoe_count": shoe_count,
        "discount_count": discount_count,
        "prices": prices,
        "currency_hints": currency_hints,
        "target_brands": target,
    }


def analyze_woo(products: list[dict]) -> dict:
    titles: list[str] = []
    vendors: Counter[str] = Counter()
    shoe_count = 0
    discount_count = 0
    prices: list[float] = []
    currency_hints: list[str] = []
    target: set[str] = set()
    for product in products:
        title = str(product.get("name") or product.get("title") or "")
        titles.append(title)
        cats = product.get("categories") or []
        cat_names = []
        if isinstance(cats, list):
            for cat in cats:
                if isinstance(cat, dict):
                    cat_names.append(str(cat.get("name") or cat.get("slug") or ""))
                else:
                    cat_names.append(str(cat))
        brands = product.get("brands") or []
        brand_names = []
        if isinstance(brands, list):
            for brand in brands:
                if isinstance(brand, dict):
                    brand_names.append(str(brand.get("name") or brand.get("slug") or ""))
                else:
                    brand_names.append(str(brand))
        vendor = brand_names[0] if brand_names else (cat_names[0] if cat_names else "(blank)")
        vendors[vendor] += 1
        bits = [title, " ".join(cat_names), " ".join(brand_names), str(product.get("sku") or "")]
        if looks_like_footwear(bits):
            shoe_count += 1
        target |= brand_hits(bits)
        price_info = product.get("prices") if isinstance(product.get("prices"), dict) else {}
        currency_hints.append(str(price_info.get("currency_code") or product.get("currency") or ""))
        price = to_float(price_info.get("price") or product.get("price") or product.get("prices"))
        regular = to_float(
            price_info.get("regular_price") or product.get("regular_price") or product.get("compare_at_price")
        )
        sale = to_float(price_info.get("sale_price") or product.get("sale_price"))
        if price_info.get("currency_prefix"):
            currency_hints.append(str(price_info.get("currency_prefix")))
        if price_info.get("currency_minor_unit") == 2 and price is not None and price > 1000:
            # Woo store API often stores minor units (paisa).
            price = price / 100
            regular = regular / 100 if regular is not None else None
            sale = sale / 100 if sale is not None else None
        if sale is not None and sale > 0:
            current = sale
        else:
            current = price
        if current is not None:
            prices.append(current)
        compare = regular
        if compare is not None and current is not None and compare > current:
            discount_count += 1
    return {
        "titles": titles,
        "vendors": vendors,
        "shoe_count": shoe_count,
        "discount_count": discount_count,
        "prices": prices,
        "currency_hints": currency_hints,
        "target_brands": target,
    }


def extract_json_ld_products(html: str) -> list[dict]:
    found: list[dict] = []
    for match in re.finditer(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.I | re.S,
    ):
        raw = match.group(1).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        nodes = data if isinstance(data, list) else [data]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            types = node.get("@type")
            type_list = types if isinstance(types, list) else [types]
            type_list = [str(t).lower() for t in type_list if t]
            if "product" in type_list:
                found.append(node)
            graph = node.get("@graph")
            if isinstance(graph, list):
                for item in graph:
                    if isinstance(item, dict):
                        item_types = item.get("@type")
                        item_list = item_types if isinstance(item_types, list) else [item_types]
                        item_list = [str(t).lower() for t in item_list if t]
                        if "product" in item_list:
                            found.append(item)
    return found


def pick_product_url(html: str, base: str) -> str | None:
    parser = HrefParser()
    try:
        parser.feed(html)
    except Exception:
        return None
    for href in parser.hrefs:
        lower = href.lower()
        if any(part in lower for part in ("/product/", "/products/", "/item/", "/p/")):
            if "login" in lower or "account" in lower:
                continue
            return urljoin(base, href)
    return None


def jsonld_has_product(html: str) -> bool:
    return bool(extract_json_ld_products(html))


def print_pass(domain: str, platform: str, stats: dict, currency: str, extra: str = "") -> None:
    vendors = stats["vendors"].most_common(5)
    target = ", ".join(sorted(stats["target_brands"])) or "none of Nike/Adidas/Puma/Skechers/NB"
    print(f"PASS    {domain}")
    print(f"        platform: {platform}")
    print(f"        currency: {currency}")
    print(f"        products: {stats.get('product_count', 0)}")
    print(f"        look like footwear: {stats['shoe_count']}")
    print(f"        real discounts (compare_at > price): {stats['discount_count']}")
    print(f"        top brands/vendors: {', '.join(f'{n} ({c})' for n, c in vendors) or '(none)'}")
    print(f"        carries Nike/Adidas/Puma/Skechers/New Balance: {target}")
    if extra:
        print(f"        {extra}")


def try_shopify(domain: str, parser: RobotFileParser) -> dict | None:
    if not allowed(parser, SHOPIFY_PATH) or not allowed(parser, SHOPIFY_QUERY):
        return {"skip": "robots.txt disallows /products.json"}
    resp = get(f"https://{domain}{SHOPIFY_QUERY}")
    status, payload_resp = classify_response(resp, "products.json")
    if status != "ok":
        if "status 403" in status or "status 429" in status or "status 503" in status or "challenge" in status:
            return {"block": status}
        return {"skip": status}
    assert payload_resp is not None
    if payload_resp.status_code != 200:
        return {"skip": f"products.json status {payload_resp.status_code}"}
    payload = parse_json(payload_resp)
    products = shopify_products(payload)
    if products is None:
        return {"skip": "products.json is not Shopify products[]"}
    stats = analyze_shopify(products)
    stats["product_count"] = len(products)
    currency_hints = list(stats["currency_hints"])
    if allowed(parser, CART_PATH):
        cart_resp = get(f"https://{domain}{CART_PATH}")
        cart_status, cart_ok = classify_response(cart_resp, "cart.js")
        if cart_status == "ok" and cart_ok is not None and cart_ok.status_code == 200:
            cart = parse_json(cart_ok)
            if isinstance(cart, dict) and cart.get("currency"):
                currency_hints.append(str(cart.get("currency")))
    currency = guess_currency(currency_hints, stats["prices"])
    print_pass(domain, "shopify", stats, currency)
    return {
        "ok": True,
        "domain": domain,
        "platform": "shopify",
        "currency": currency,
        **stats,
        "final_host": urlparse(payload_resp.url).netloc,
    }


def try_woo(domain: str, parser: RobotFileParser) -> dict | None:
    if not allowed(parser, WOO_PATH) or not allowed(parser, WOO_QUERY):
        return {"skip": "robots.txt disallows WooCommerce store API"}
    resp = get(f"https://{domain}{WOO_QUERY}")
    status, payload_resp = classify_response(resp, "woocommerce API")
    if status != "ok":
        if "status 403" in status or "status 429" in status or "status 503" in status or "challenge" in status:
            return {"block": status}
        return {"skip": status}
    assert payload_resp is not None
    if payload_resp.status_code != 200:
        return {"skip": f"woocommerce API status {payload_resp.status_code}"}
    payload = parse_json(payload_resp)
    if not isinstance(payload, list):
        return {"skip": "woocommerce API did not return a product list"}
    stats = analyze_woo(payload)
    stats["product_count"] = len(payload)
    currency = guess_currency(stats["currency_hints"], stats["prices"])
    print_pass(domain, "woocommerce", stats, currency)
    return {
        "ok": True,
        "domain": domain,
        "platform": "woocommerce",
        "currency": currency,
        **stats,
        "final_host": urlparse(payload_resp.url).netloc,
    }


def try_jsonld(domain: str, parser: RobotFileParser) -> dict:
    extra_notes = []
    home_has = False
    product_has = False
    product_url = None
    if not allowed(parser, "/"):
        extra_notes.append("robots.txt disallows homepage")
    else:
        home = get(f"https://{domain}/")
        status, home_resp = classify_response(home, "homepage")
        if status != "ok":
            if "status 403" in status or "status 429" in status or "status 503" in status or "challenge" in status:
                return fail(domain, status, {"platform": "needs HTML scraping"})
            extra_notes.append(status)
        elif home_resp is not None:
            if looks_like_challenge(home_resp.text):
                return fail(domain, "homepage challenge/block page", {"platform": "needs HTML scraping"})
            home_has = jsonld_has_product(home_resp.text)
            product_url = pick_product_url(home_resp.text, f"https://{domain}/")
            currency_guess = guess_currency([home_resp.text[:8000]], [])
            extra_notes.append(f"homepage JSON-LD Product: {'yes' if home_has else 'no'}")
            extra_notes.append(f"currency hint: {currency_guess}")

    if product_url:
        path = urlparse(product_url).path or "/"
        if not allowed(parser, path):
            extra_notes.append(f"robots.txt disallows sample product path {path}")
        else:
            prod = get(product_url)
            status, prod_resp = classify_response(prod, "product page")
            if status != "ok":
                extra_notes.append(status)
            elif prod_resp is not None:
                product_has = jsonld_has_product(prod_resp.text)
                extra_notes.append(f"sample product JSON-LD Product: {'yes' if product_has else 'no'} ({product_url})")
    else:
        extra_notes.append("no product URL found on homepage")

    reason = "needs HTML scraping"
    print(f"NEEDS HTML  {domain}: {reason}")
    for note in extra_notes:
        print(f"        {note}")
    return {
        "domain": domain,
        "ok": False,
        "reason": reason,
        "platform": "needs HTML scraping",
        "jsonld_homepage": home_has,
        "jsonld_product": product_has,
        "notes": extra_notes,
    }


def check_store(domain: str) -> dict:
    print(f"\n=== {domain} ===")
    parser, robots_reason = load_robots(domain)
    if parser is None:
        return fail(domain, robots_reason or "robots.txt check failed")

    shopify = try_shopify(domain, parser)
    if shopify and shopify.get("ok"):
        return shopify
    if shopify and shopify.get("block"):
        return fail(domain, shopify["block"], {"platform": "shopify-blocked"})
    if shopify and shopify.get("skip"):
        print(f"        shopify probe: {shopify['skip']}")

    woo = try_woo(domain, parser)
    if woo and woo.get("ok"):
        return woo
    if woo and woo.get("block"):
        return fail(domain, woo["block"], {"platform": "woocommerce-blocked"})
    if woo and woo.get("skip"):
        print(f"        woocommerce probe: {woo['skip']}")

    return try_jsonld(domain, parser)


def print_shared_brands(passing: list[dict]) -> None:
    print("\n=== Shared brands among passing stores ===")
    if len(passing) < 2:
        print("Need at least two passing stores to compare brands.")
        return
    brand_to_stores: dict[str, set[str]] = defaultdict(set)
    for store in passing:
        for brand in store.get("vendors") or []:
            if brand == "(blank)":
                continue
            brand_to_stores[brand.lower()].add(store["domain"])
        for brand in store.get("target_brands") or []:
            brand_to_stores[brand].add(store["domain"])
    pair_brands: dict[tuple[str, str], list[str]] = defaultdict(list)
    for brand, stores in brand_to_stores.items():
        if len(stores) < 2:
            continue
        ordered = sorted(stores)
        for i, a in enumerate(ordered):
            for b in ordered[i + 1 :]:
                pair_brands[(a, b)].append(brand)
    if not pair_brands:
        print("No overlapping vendor/brand names among passing stores.")
        return
    for (a, b), brands in sorted(pair_brands.items()):
        sample = ", ".join(sorted(set(brands))[:12])
        extra = "" if len(set(brands)) <= 12 else f" (+{len(set(brands)) - 12} more)"
        print(f"{a} <-> {b}: {len(set(brands))} shared brand(s) - {sample}{extra}")


def print_model_overlap(passing: list[dict]) -> None:
    print("\n=== Same-model title overlap (best effort) ===")
    key_to_stores: dict[str, dict[str, str]] = defaultdict(dict)
    for store in passing:
        for title in store.get("titles") or []:
            key = clean_model(title)
            if len(key) < 8:
                continue
            key_to_stores[key][store["domain"]] = title
    overlaps = [(key, mapping) for key, mapping in key_to_stores.items() if len(mapping) >= 2]
    if not overlaps:
        print("No cleaned titles matched across two passing stores in the first 50 products.")
        return
    print(f"Found {len(overlaps)} cleaned-title overlap(s). Sample:")
    for key, mapping in sorted(overlaps, key=lambda item: (-len(item[1]), item[0]))[:12]:
        print(f"  [{key}]")
        for domain, title in mapping.items():
            print(f"    {domain}: {title}")


def main() -> None:
    print(f"User-Agent: {USER_AGENT}")
    print(f"Delay: {DELAY_SECONDS}s; max {PRODUCT_LIMIT} products per store")
    print("Platform order: Shopify /products.json, then WooCommerce store API, then JSON-LD check.")
    print("403/429/503 or challenge = FAILED, no retries.\n")
    print("Search notes:")
    print("  Servis official store: servis.pk")
    print("  Extra PK multi-brand (Nike/Adidas/Puma etc.): speedsports.pk, sportsplus.pk,")
    print("    affinity.com.pk, shoestreet.pk")
    print("  Official PK brand sites: puma.com.pk, nike.com.pk, adidas.com.pk (test only).")
    print("  Skechers authorized PK partner: stepabove.pk")
    print()

    results = [check_store(domain) for domain in CANDIDATES]
    passing = [r for r in results if r.get("ok")]
    html_needed = [r for r in results if r.get("platform") == "needs HTML scraping"]
    failed = [r for r in results if not r.get("ok") and r.get("platform") != "needs HTML scraping"]

    print("\n=== Summary ===")
    print(f"Passing JSON APIs: {len(passing)} - {', '.join(r['domain'] for r in passing) or '(none)'}")
    print(f"Needs HTML scraping: {len(html_needed)} - {', '.join(r['domain'] for r in html_needed) or '(none)'}")
    print(f"Failed/blocked: {len(failed)} - {', '.join(r['domain'] for r in failed) or '(none)'}")
    for r in failed:
        print(f"  - {r['domain']}: {r['reason']}")
    for r in html_needed:
        jsonld = []
        if r.get("jsonld_homepage"):
            jsonld.append("homepage")
        if r.get("jsonld_product"):
            jsonld.append("product page")
        print(f"  - {r['domain']}: {r['reason']}; JSON-LD Product on {', '.join(jsonld) or 'neither'}")

    print_shared_brands(passing)
    print_model_overlap(passing)


if __name__ == "__main__":
    main()
