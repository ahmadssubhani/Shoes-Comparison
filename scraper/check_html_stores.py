"""Stage A2: probe official/non-Shopify USD sites for HTML scrape feasibility."""

from __future__ import annotations

import json
import re
import time
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import requests

USER_AGENT = "Mozilla/5.0 (student-project; contact: ahmedssubhani@gmail.com)"
DELAY_SECONDS = 2
TIMEOUT = 20
MAX_PRODUCT_PAGES = 20
BLOCK = {403, 429, 503}

CHALLENGE_MARKERS = (
    "just a moment",
    "attention required",
    "cf-browser-verification",
    "captcha",
    "enable javascript and cookies",
    "please verify you are a human",
    "access denied",
    "checking your browser",
    "pardon our interruption",
    "robot or human",
    "px-captcha",
    "akamai",
)

SITES = [
    {
        "name": "footlocker.com",
        "host": "www.footlocker.com",
        "listings": [
            "/category/sport/casual/mens/shoes.html",
            "/en/category/mens/shoes.html",
            "/category/mens/shoes.html",
        ],
        "page2": "?currentPage=2",
    },
    {
        "name": "finishline.com",
        "host": "www.finishline.com",
        "listings": ["/store/men/shoes", "/store/mens"],
        "page2": "?page=2",
    },
    {
        "name": "jdsports.com",
        "host": "www.jdsports.com",
        "listings": [
            "/store/men/shoes",
            "/store/mens",
            "/men/mens-footwear/mens-trainers",
        ],
        "page2": "?page=2",
    },
    {
        "name": "champssports.com",
        "host": "www.champssports.com",
        "listings": [
            "/category/sport/casual/mens/shoes.html",
            "/category/mens/shoes.html",
        ],
        "page2": "?currentPage=2",
    },
    {
        "name": "dickssportinggoods.com",
        "host": "www.dickssportinggoods.com",
        "listings": ["/f/mens-athletic-shoes", "/f/mens-sneakers"],
        "page2": "?pageNumber=2",
    },
    {
        "name": "zappos.com",
        "host": "www.zappos.com",
        "listings": ["/men-sneakers-athletic-shoes", "/men-shoes"],
        "page2": "/page2",
    },
    {
        "name": "nike.com",
        "host": "www.nike.com",
        "listings": ["/w/mens-shoes-nik1zy7ok", "/w/mens-lifestyle-shoes-13jrmznik1zy7ok"],
        "page2": "?page=2",
    },
    {
        "name": "adidas.com",
        "host": "www.adidas.com",
        "listings": ["/us/men-shoes", "/us/men-athletic_sneakers"],
        "page2": "?start=48",
    },
    {
        "name": "puma.com",
        "host": "us.puma.com",
        "listings": ["/us/en/men/shoes", "/us/en/men/sneakers"],
        "page2": "?offset=24",
    },
    {
        "name": "skechers.com",
        "host": "www.skechers.com",
        "listings": ["/men/shoes", "/men/sneakers"],
        "page2": "?start=12",
    },
]

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
    }
)


class HrefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        for key, value in attrs:
            if key == "href" and value:
                self.hrefs.append(value)


def pause() -> None:
    time.sleep(DELAY_SECONDS)


def challenge(text: str) -> bool:
    low = (text or "").lower()
    return any(m in low for m in CHALLENGE_MARKERS)


def get(url: str) -> requests.Response | None:
    pause()
    try:
        return SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        print(f"        request error: {exc}")
        return None


def classify(resp: requests.Response | None, label: str) -> str:
    if resp is None:
        return f"{label}: request failed"
    if resp.status_code in BLOCK:
        return f"{label}: BLOCKED status {resp.status_code}"
    if challenge(resp.text):
        return f"{label}: challenge/block page"
    if resp.status_code != 200:
        return f"{label}: status {resp.status_code}"
    return "ok"


def load_robots(host: str) -> tuple[RobotFileParser | None, str]:
    url = f"https://{host}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(url)
    resp = get(url)
    if resp is None:
        return None, "robots.txt request failed"
    if resp.status_code in BLOCK:
        return None, f"robots.txt status {resp.status_code}"
    if challenge(resp.text):
        return None, "robots.txt challenge/block page"
    parser.parse(resp.text.splitlines())
    return parser, "ok"


def allowed(parser: RobotFileParser, path: str) -> bool:
    return parser.can_fetch(USER_AGENT, path)


def json_ld_products(html: str) -> list[dict]:
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
        stack = list(nodes)
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                types = node.get("@type")
                type_list = types if isinstance(types, list) else [types]
                type_list = [str(t).lower() for t in type_list if t]
                if "product" in type_list:
                    found.append(node)
                graph = node.get("@graph")
                if isinstance(graph, list):
                    stack.extend(graph)
            elif isinstance(node, list):
                stack.extend(node)
    return found


def detect_platform(html: str, shopify_ok: bool) -> str:
    if shopify_ok:
        return "Shopify - exclude"
    low = html.lower()
    if "cdn.shopify.com" in low or "myshopify.com" in low:
        return "Shopify-like - exclude"
    if "__next_data__" in low:
        return "Next.js"
    if "nuxt" in low and "__nuxt" in low:
        return "Nuxt"
    if "/on/demandware.store/" in low or "demandware" in low or "salesforce commerce" in low:
        return "Salesforce Commerce Cloud"
    if "magento" in low:
        return "Magento"
    if "window.__PRELOADED_STATE__" in html or "window.__INITIAL_STATE__" in html:
        return "SPA with preload state"
    if 'id="root"' in low or 'id="__next"' in low or 'id="app"' in low:
        return "JS SPA (React/Vue shell)"
    return "custom HTML"


def js_or_html(html: str, jsonld: list[dict], fields: dict[str, bool]) -> str:
    if jsonld or sum(fields.values()) >= 3:
        return "HTML (product fields present in raw response)"
    low = html.lower()
    if any(token in low for token in ("__next_data__", "__preloaded_state__", "application/json")):
        embedded = bool(re.search(r"<script[^>]*>(.|\\n){200,}</script>", html, re.I))
        if embedded and ("price" in low or "sku" in low or "product" in low):
            return "mixed: JS app but JSON blob in HTML"
        return "JS-rendered (Playwright likely)"
    if len(re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)) < 2000:
        return "JS-rendered (Playwright likely)"
    return "likely JS-rendered; little product data in HTML"


def extract_fields(html: str, jsonld: list[dict], url: str) -> dict[str, Any]:
    title = brand = price = sale = image = sku = None
    if jsonld:
        node = jsonld[0]
        title = node.get("name")
        brand = node.get("brand")
        if isinstance(brand, dict):
            brand = brand.get("name")
        offers = node.get("offers")
        if isinstance(offers, list) and offers:
            offers = offers[0]
        if isinstance(offers, dict):
            price = offers.get("price") or offers.get("lowPrice")
            sale = offers.get("salePrice")
            currency = offers.get("priceCurrency")
            if currency:
                price = f"{price} {currency}" if price else currency
        image = node.get("image")
        if isinstance(image, list) and image:
            image = image[0]
        if isinstance(image, dict):
            image = image.get("url")
        sku = node.get("sku") or node.get("mpn") or node.get("productID")
    # meta fallbacks
    og_title = re.search(r'property=["\']og:title["\'][^>]*content=["\']([^"\']+)', html, re.I)
    og_image = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
    sku_meta = re.search(
        r'(?:itemprop=["\']sku["\'][^>]*content=["\']([^"\']+)|"sku"\s*:\s*"([^"]{3,40})"|style[\s_-]?code["\']?\s*[:=]\s*["\']([^"\']+))',
        html,
        re.I,
    )
    if not title and og_title:
        title = og_title.group(1)
    if not image and og_image:
        image = og_image.group(1)
    if not sku and sku_meta:
        sku = next(g for g in sku_meta.groups() if g)
    dollar = re.search(r"\$\s?\d+(?:\.\d{2})?", html)
    if not price and dollar:
        price = dollar.group(0)
    return {
        "title": bool(title),
        "brand": bool(brand) or bool(re.search(r'itemprop=["\']brand["\']', html, re.I)),
        "price_usd": bool(price) or "$" in html[:50000],
        "sale_price": bool(sale) or bool(re.search(r'(compare|was|original|list)[^.]{0,40}\$\d', html, re.I)),
        "image": bool(image),
        "url": bool(url),
        "sku_or_style": bool(sku) or bool(re.search(r"style\s*(code|#)|product[-_ ]?id|sku", html, re.I)),
        "samples": {
            "title": str(title)[:80] if title else None,
            "brand": str(brand)[:40] if brand else None,
            "price": str(price)[:40] if price else None,
            "sku": str(sku)[:40] if sku else None,
        },
    }


def product_links(html: str, base: str) -> list[str]:
    parser = HrefParser()
    try:
        parser.feed(html)
    except Exception:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for href in parser.hrefs:
        full = urljoin(base, href)
        path = urlparse(full).path.lower()
        if any(part in path for part in ("/product/", "/products/", "/pd/", "/p/", "/sku/", ".html")):
            if any(skip in path for skip in ("/category/", "/store/men", "/login", "/account", "/help")):
                continue
            if full in seen:
                continue
            seen.add(full)
            out.append(full)
    return out


def try_shopify(host: str, parser: RobotFileParser) -> bool:
    path = "/products.json?limit=1"
    if not allowed(parser, "/products.json") or not allowed(parser, path):
        return False
    resp = get(f"https://{host}{path}")
    status = classify(resp, "products.json")
    if status != "ok" or resp is None:
        return False
    try:
        data = resp.json()
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and isinstance(data.get("products"), list)


def check_site(cfg: dict) -> dict:
    host = cfg["host"]
    name = cfg["name"]
    print(f"\n=== {name} ({host}) ===")
    parser, robots_status = load_robots(host)
    if parser is None:
        print(f"FAILED  {name}: {robots_status}")
        return {
            "site": name,
            "platform": "unknown",
            "html_or_js": "n/a",
            "jsonld": "n/a",
            "blocked": "yes",
            "style_code": "n/a",
            "effort": "high",
            "ok": False,
            "reason": robots_status,
        }

    listing_ok_paths = []
    listing_blocked_paths = []
    for path in cfg["listings"]:
        ok = allowed(parser, path)
        print(f"        robots listing {path}: {'allow' if ok else 'DISALLOW'}")
        (listing_ok_paths if ok else listing_blocked_paths).append(path)

    shopify = try_shopify(host, parser)
    if shopify:
        print("        Shopify /products.json works -> EXCLUDE")
        return {
            "site": name,
            "platform": "Shopify - exclude",
            "html_or_js": "JSON API",
            "jsonld": "n/a",
            "blocked": "no",
            "style_code": "n/a",
            "effort": "n/a",
            "ok": False,
            "reason": "Shopify - exclude",
        }

    listing_html = ""
    listing_url = None
    listing_status = "no allowed listing path"
    for path in listing_ok_paths:
        listing_url = f"https://{host}{path}"
        resp = get(listing_url)
        listing_status = classify(resp, "listing")
        if listing_status.startswith("listing: BLOCKED") or listing_status.endswith("challenge/block page"):
            print(f"FAILED  {name}: {listing_status}")
            return {
                "site": name,
                "platform": "unknown",
                "html_or_js": "blocked",
                "jsonld": "n/a",
                "blocked": "yes",
                "style_code": "n/a",
                "effort": "high",
                "ok": False,
                "reason": listing_status,
            }
        if listing_status == "ok" and resp is not None:
            listing_html = resp.text
            listing_url = resp.url
            print(f"        listing OK ({len(listing_html)} bytes) {resp.url}")
            break
        print(f"        listing skip: {listing_status} ({path})")

    if not listing_html:
        print(f"FAILED  {name}: could not fetch listing ({listing_status})")
        return {
            "site": name,
            "platform": "unknown",
            "html_or_js": "blocked/missing listing",
            "jsonld": "n/a",
            "blocked": "yes" if "BLOCKED" in listing_status or "challenge" in listing_status else "partial",
            "style_code": "n/a",
            "effort": "high",
            "ok": False,
            "reason": listing_status,
        }

    platform = detect_platform(listing_html, False)
    listing_jsonld = json_ld_products(listing_html)
    print(f"        platform guess: {platform}")
    print(f"        listing JSON-LD Product: {'yes' if listing_jsonld else 'no'}")

    # pagination: one extra listing request, still well under 20 pages
    page2_path = cfg["listings"][0] + cfg.get("page2", "?page=2")
    pagination = "not tested (robots disallows page 2 or no listing)"
    if allowed(parser, page2_path):
        p2 = get(f"https://{host}{page2_path}")
        st = classify(p2, "page2")
        if st == "ok" and p2 is not None:
            pagination = f"page 2 returned {p2.status_code}, {len(p2.text)} bytes"
            if p2.text[:2000] == listing_html[:2000]:
                pagination += " (looks similar to page 1; may be JS pagination)"
            else:
                pagination += " (HTML differs from page 1)"
        else:
            pagination = st
    print(f"        pagination: {pagination}")

    links = product_links(listing_html, listing_url or f"https://{host}/")
    print(f"        product links found in listing HTML: {len(links)}")
    product_html = ""
    product_url = None
    product_status = "no product URL in listing HTML"
    fetched_products = 0
    for link in links[:MAX_PRODUCT_PAGES]:
        path = urlparse(link).path
        if not allowed(parser, path):
            print(f"        robots DISALLOW product {path}")
            continue
        resp = get(link)
        fetched_products += 1
        product_status = classify(resp, "product")
        if product_status.startswith("product: BLOCKED") or "challenge" in product_status:
            print(f"FAILED  {name}: {product_status}")
            return {
                "site": name,
                "platform": platform,
                "html_or_js": "blocked on PDP",
                "jsonld": "n/a",
                "blocked": "yes",
                "style_code": "n/a",
                "effort": "high",
                "ok": False,
                "reason": product_status,
            }
        if product_status == "ok" and resp is not None:
            product_html = resp.text
            product_url = resp.url
            print(f"        product OK ({len(product_html)} bytes) {resp.url}")
            break
        print(f"        product skip: {product_status}")
        if fetched_products >= 3:
            break

    jsonld = json_ld_products(product_html) if product_html else []
    print(f"        product JSON-LD Product: {'yes' if jsonld else 'no'}")
    fields = extract_fields(product_html or listing_html, jsonld or listing_jsonld, product_url or listing_url or "")
    samples = fields.pop("samples")
    print(f"        extractable: {', '.join(k for k, v in fields.items() if v) or 'none'}")
    if any(samples.values()):
        print(f"        samples: {samples}")
    render = js_or_html(product_html or listing_html, jsonld, fields)
    print(f"        render: {render}")

    style = "yes" if fields["sku_or_style"] else "unclear"
    blocked = "no"
    if "JS-rendered" in render:
        effort = "high"
    elif jsonld and fields["title"] and fields["price_usd"]:
        effort = "low"
    else:
        effort = "med"

    return {
        "site": name,
        "platform": platform,
        "html_or_js": render,
        "jsonld": "yes" if jsonld or listing_jsonld else "no",
        "blocked": blocked,
        "style_code": style,
        "effort": effort,
        "ok": True,
        "pagination": pagination,
        "fields": fields,
        "robots_listing": "allow" if listing_ok_paths else "disallow",
    }


def main() -> None:
    print(f"User-Agent: {USER_AGENT}")
    print("Stage A2: listing + one product page only. No scrapers written.")
    print("2s delay; 403/429/503 or challenge = FAILED.\n")
    rows = [check_site(cfg) for cfg in SITES]
    print("\n=== Table ===")
    print(f"{'site':<24} {'platform':<28} {'HTML or JS':<42} {'JSON-LD':<8} {'blocked?':<10} {'style code':<12} {'effort'}")
    print("-" * 140)
    for r in rows:
        print(
            f"{r['site']:<24} {str(r['platform'])[:28]:<28} {str(r['html_or_js'])[:42]:<42} "
            f"{r['jsonld']:<8} {r['blocked']:<10} {r['style_code']:<12} {r['effort']}"
        )


if __name__ == "__main__":
    main()
