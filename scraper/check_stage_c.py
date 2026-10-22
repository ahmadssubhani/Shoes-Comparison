"""Stage C: probe non-Shopify USD sites. Test only; no scrapers."""

from __future__ import annotations

import json
import re
import time
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests

USER_AGENT = "Mozilla/5.0 (student-project; contact: ahmedssubhani@gmail.com)"
DELAY_SECONDS = 2
TIMEOUT = 20
MAX_PAGES = 10
BLOCK = {403, 418, 429, 503}

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
    "additional verification required",
)

SITES = [
    {"name": "famousfootwear.com", "host": "www.famousfootwear.com", "kind": "multi",
     "listings": ["/mens-sneakers", "/c/mens-shoes", "/mens-shoes"]},
    {"name": "shoecarnival.com", "host": "www.shoecarnival.com", "kind": "multi",
     "listings": ["/mens/shoes/sneakers", "/mens-shoes", "/c/mens-sneakers"]},
    {"name": "rackroomshoes.com", "host": "www.rackroomshoes.com", "kind": "multi",
     "listings": ["/mens-sneakers", "/c/mens-sneakers", "/mens-shoes"]},
    {"name": "hibbett.com", "host": "www.hibbett.com", "kind": "multi",
     "listings": ["/mens/shoes", "/c/mens-shoes", "/mens-sneakers"]},
    {"name": "dsw.com", "host": "www.dsw.com", "kind": "multi",
     "listings": ["/en/mens-shoes/sneakers", "/en/mens-shoes", "/mens-sneakers"]},
    {"name": "academy.com", "host": "www.academy.com", "kind": "multi",
     "listings": ["/c/mens-athletic-shoes", "/shop/mens-shoes", "/c/shoes"]},
    {"name": "kohls.com", "host": "www.kohls.com", "kind": "multi",
     "listings": ["/catalog/mens-shoes-sneakers.jsp", "/sale-mens-shoes", "/mens-sneakers"]},
    {"name": "macys.com", "host": "www.macys.com", "kind": "multi",
     "listings": ["/shop/mens-shoes/mens-sneakers", "/shop/mens/mens-shoes"]},
    {"name": "nordstromrack.com", "host": "www.nordstromrack.com", "kind": "multi",
     "listings": ["/c/category/shoes/mens", "/c/shoes/mens", "/mens-sneakers"]},
    {"name": "eastbay.com", "host": "www.eastbay.com", "kind": "multi",
     "listings": ["/category/mens/shoes.html", "/en/category/mens/shoes.html"]},
    {"name": "journeys.com", "host": "www.journeys.com", "kind": "multi",
     "listings": ["/mens-shoes", "/c/mens-shoes", "/mens-sneakers"]},
    {"name": "6pm.com", "host": "www.6pm.com", "kind": "multi",
     "listings": ["/men-sneakers-athletic-shoes", "/men-shoes", "/n/mens-sneakers"]},
    {"name": "reebok.com", "host": "www.reebok.com", "kind": "brand",
     "listings": ["/us/en/c/men/shoes", "/us/men-shoes", "/c/men/shoes"]},
    {"name": "underarmour.com", "host": "www.underarmour.com", "kind": "brand",
     "listings": ["/en-us/c/mens/shoes", "/en-us/mens/shoes", "/c/mens-shoes"]},
    {"name": "newbalance.com", "host": "www.newbalance.com", "kind": "brand",
     "listings": ["/mens-shoes", "/en-us/mens-shoes", "/mens-sneakers"]},
    {"name": "converse.com", "host": "www.converse.com", "kind": "brand",
     "listings": ["/shop/mens-shoes", "/en/us/mens-shoes", "/mens-shoes"]},
    {"name": "vans.com", "host": "www.vans.com", "kind": "brand",
     "listings": ["/shop/mens-shoes-sneakers", "/shop/mens-shoes", "/en-us/mens-shoes"]},
    {"name": "asics.com", "host": "www.asics.com", "kind": "brand",
     "listings": ["/us/en-us/mens-shoes", "/us/en-us/c/mens-shoes", "/en-us/mens-shoes"]},
    {"name": "brooksrunning.com", "host": "www.brooksrunning.com", "kind": "brand",
     "listings": ["/us/en/c/mens-running-shoes", "/c/mens-running-shoes", "/mens-shoes"]},
    {"name": "saucony.com", "host": "www.saucony.com", "kind": "brand",
     "listings": ["/en-us/c/mens-shoes", "/mens-shoes", "/c/mens-shoes"]},
    {"name": "hoka.com", "host": "www.hoka.com", "kind": "brand",
     "listings": ["/en/us/mens-shoes", "/mens-shoes", "/en/us/c/mens-shoes"]},
    {"name": "crocs.com", "host": "www.crocs.com", "kind": "brand",
     "listings": ["/c/mens-shoes", "/en-us/c/mens-shoes", "/mens-shoes"]},
    {"name": "merrell.com", "host": "www.merrell.com", "kind": "brand",
     "listings": ["/mens-shoes", "/en-us/mens-shoes", "/c/mens-shoes"]},
    {"name": "clarks.com", "host": "www.clarksusa.com", "kind": "brand",
     "listings": ["/mens-shoes", "/c/mens-shoes", "/mens-sneakers"],
     "alt_hosts": ["www.clarks.com", "us.clarks.com"]},
]

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"})


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


def is_challenge(text: str) -> bool:
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
    if is_challenge(resp.text):
        return f"{label}: challenge/block page"
    if resp.status_code != 200:
        return f"{label}: status {resp.status_code}"
    return "ok"


def blocked(status: str) -> bool:
    return "BLOCKED" in status or "challenge" in status


def load_robots(host: str) -> tuple[RobotFileParser | None, str, list[str]]:
    url = f"https://{host}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(url)
    resp = get(url)
    if resp is None:
        return None, "robots.txt request failed", []
    if resp.status_code in BLOCK:
        return None, f"robots.txt status {resp.status_code}", []
    if is_challenge(resp.text):
        return None, "robots.txt challenge/block page", []
    parser.parse(resp.text.splitlines())
    sitemaps = []
    for line in resp.text.splitlines():
        if line.lower().startswith("sitemap:"):
            sitemaps.append(line.split(":", 1)[1].strip())
    return parser, "ok", sitemaps


def allowed(parser: RobotFileParser, path: str) -> bool:
    return parser.can_fetch(USER_AGENT, path)


def json_ld_products(html: str) -> list[dict]:
    found: list[dict] = []
    for match in re.finditer(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, flags=re.I | re.S,
    ):
        try:
            data = json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
            elif isinstance(node, dict):
                types = node.get("@type")
                tlist = types if isinstance(types, list) else [types]
                tlist = [str(t).lower() for t in tlist if t]
                if "product" in tlist:
                    found.append(node)
                if isinstance(node.get("@graph"), list):
                    stack.extend(node["@graph"])
    return found


def shopify_html(html: str) -> bool:
    return "cdn.shopify.com" in html.lower() or "myshopify.com" in html.lower()


def try_shopify_json(host: str, parser: RobotFileParser, budget: list[int]) -> bool:
    if budget[0] >= MAX_PAGES:
        return False
    if not allowed(parser, "/products.json"):
        return False
    budget[0] += 1
    resp = get(f"https://{host}/products.json?limit=1")
    status = classify(resp, "products.json")
    if status != "ok" or resp is None:
        return False
    try:
        data = resp.json()
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and isinstance(data.get("products"), list)


def detect_platform(html: str) -> str:
    low = html.lower()
    if shopify_html(html):
        return "Shopify - exclude"
    if "__next_data__" in low:
        return "Next.js"
    if "/on/demandware.store/" in low or "demandware" in low:
        return "Salesforce Commerce Cloud"
    if "zappos" in low or "6pm" in low:
        return "custom (Zappos/6pm family)"
    if "magento" in low:
        return "Magento"
    if 'id="__next"' in low or 'id="root"' in low:
        return "JS SPA"
    return "custom HTML"


def product_links(html: str, base: str) -> list[str]:
    parser = HrefParser()
    try:
        parser.feed(html)
    except Exception:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for href in parser.hrefs:
        full = urljoin(base, href.split("#")[0])
        path = urlparse(full).path.lower()
        if any(s in path for s in ("/product/", "/products/", "/pd/", "/p/", "/sku/", "/dp/", "/ip/")):
            if any(s in path for s in ("/category/", "/catalog/", "/c/", "/login", "/account")):
                continue
            if full not in seen:
                seen.add(full)
                out.append(full)
        elif path.endswith(".html") and any(s in path for s in ("shoe", "sneaker", "runner", "trainer")):
            if full not in seen:
                seen.add(full)
                out.append(full)
    return out


def extract_fields(html: str, jsonld: list[dict], url: str) -> dict[str, Any]:
    title = brand = price = sku = image = None
    sale = False
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
            if offers.get("priceCurrency"):
                price = f"{price} {offers.get('priceCurrency')}"
        image = node.get("image")
        if isinstance(image, list) and image:
            image = image[0]
        if isinstance(image, dict):
            image = image.get("url")
        sku = node.get("sku") or node.get("mpn") or node.get("productID")
    og_title = re.search(r'property=["\']og:title["\'][^>]*content=["\']([^"\']+)', html, re.I)
    og_image = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
    if not title and og_title:
        title = og_title.group(1)
    if not image and og_image:
        image = og_image.group(1)
    sku_m = re.search(
        r'"sku"\s*:\s*"([^"]{3,40})"|style[\s_-]?code["\']?\s*[:=]\s*["\']([^"\']+)',
        html,
        re.I,
    )
    if not sku and sku_m:
        sku = next(g for g in sku_m.groups() if g)
    if re.search(r"(compareAt|listPrice|wasPrice|originalPrice|salePrice)", html, re.I):
        sale = True
    next_data = "__NEXT_DATA__" in html
    return {
        "title": bool(title),
        "brand": bool(brand),
        "price": bool(price) or bool(re.search(r"\$\s?\d+", html[:80000])),
        "sale_price": sale,
        "image": bool(image),
        "url": bool(url),
        "sku": bool(sku) or bool(re.search(r"style\s*(code|#)|\"mpn\"|\"sku\"", html, re.I)),
        "next_data": next_data,
        "samples": {
            "title": str(title)[:80] if title else None,
            "brand": str(brand)[:40] if brand else None,
            "price": str(price)[:40] if price else None,
            "sku": str(sku)[:40] if sku else None,
        },
    }


def render_kind(html: str, jsonld: list[dict], fields: dict) -> str:
    useful = sum(1 for k in ("title", "brand", "price", "image") if fields.get(k))
    if jsonld or useful >= 3:
        return "HTML"
    if "__NEXT_DATA__" in html and ("price" in html.lower() or "sku" in html.lower()):
        return "JS JSON blob"
    return "JS-only"


def sitemap_has_products(parser: RobotFileParser, sitemaps: list[str], budget: list[int], host: str) -> str:
    urls: list[str] = []
    for sm in sitemaps:
        if sm.startswith("http"):
            urls.append(sm)
        else:
            urls.append(f"https://{host}{sm if sm.startswith('/') else '/' + sm}")
    if not urls:
        urls = [f"https://{host}/sitemap.xml"]
    for url in urls[:2]:
        path = urlparse(url).path or "/sitemap.xml"
        if not allowed(parser, path or "/sitemap.xml"):
            return "robots disallows sitemap"
        if budget[0] >= MAX_PAGES:
            return "page budget exhausted"
        budget[0] += 1
        resp = get(url)
        st = classify(resp, "sitemap")
        if blocked(st):
            return st
        if st != "ok" or resp is None:
            continue
        text = resp.text
        locs = re.findall(r"<loc>([^<]+)</loc>", text, flags=re.I)
        productish = [u for u in locs if re.search(r"/product|/pd/|/p/|/sku/", u, re.I)]
        if "sitemapindex" in text.lower() and locs:
            return f"yes (index, {len(locs)} child sitemaps)"
        if productish:
            return f"yes ({len(productish)} product-like URLs in first sitemap)"
        if locs:
            return f"yes ({len(locs)} URLs, not obviously product paths)"
    return "no fetchable product sitemap"


def brands_hint(html: str, kind: str, name: str) -> str:
    if kind == "brand":
        return name.split(".")[0].replace("brooksrunning", "Brooks").title()
    found = []
    low = html.lower()
    for brand in ("nike", "adidas", "puma", "reebok", "new balance", "jordan", "asics", "hoka", "brooks", "saucony", "converse", "vans", "under armour"):
        if brand in low:
            found.append(brand.title() if brand != "new balance" else "New Balance")
    return ", ".join(found[:8]) or "unknown (listing too thin or JS)"


def check_site(cfg: dict) -> dict:
    hosts = [cfg["host"]] + cfg.get("alt_hosts", [])
    name = cfg["name"]
    print(f"\n=== {name} ===")
    parser = None
    host = hosts[0]
    sitemaps: list[str] = []
    robots_status = ""
    for h in hosts:
        parser, robots_status, sitemaps = load_robots(h)
        if parser is not None:
            host = h
            break
        if blocked(robots_status) or "status" in robots_status:
            print(f"FAILED  {name}: {robots_status}")
            return row(name, "unknown", "yes", "n/a", "n/a", "n/a", "n/a", "high", "n/a", False, robots_status)

    assert parser is not None
    print(f"        host: {host}")
    print(f"        robots sitemaps listed: {len(sitemaps)}")
    budget = [1]  # robots already counted

    if try_shopify_json(host, parser, budget):
        print("        Shopify /products.json works -> EXCLUDE")
        return row(name, "Shopify - exclude", "no", "JSON API", "n/a", "n/a", "n/a", "n/a", "n/a", False, "Shopify - exclude")

    listing_html = ""
    listing_url = ""
    listing_status = "no allowed listing"
    for path in cfg["listings"]:
        if budget[0] >= MAX_PAGES:
            break
        ok = allowed(parser, path)
        print(f"        robots listing {path}: {'allow' if ok else 'DISALLOW'}")
        if not ok:
            continue
        budget[0] += 1
        resp = get(f"https://{host}{path}")
        listing_status = classify(resp, "listing")
        if blocked(listing_status):
            print(f"FAILED  {name}: {listing_status}")
            return row(name, "unknown", "yes", "blocked", "n/a", "n/a", "n/a", "high", "n/a", False, listing_status)
        if listing_status == "ok" and resp is not None:
            listing_html = resp.text
            listing_url = resp.url
            print(f"        listing OK {len(listing_html)} bytes {resp.url}")
            break
        print(f"        listing skip: {listing_status}")

    if not listing_html:
        print(f"FAILED  {name}: {listing_status}")
        return row(name, "unknown", "partial", "missing listing", "n/a", "n/a", "n/a", "high", "n/a", False, listing_status)

    if shopify_html(listing_html):
        print("        HTML contains cdn.shopify.com -> EXCLUDE")
        return row(name, "Shopify - exclude", "no", "HTML", "n/a", "n/a", "n/a", "n/a", "n/a", False, "Shopify - exclude")

    platform = detect_platform(listing_html)
    links = product_links(listing_html, listing_url)
    print(f"        platform: {platform}")
    print(f"        product links in listing HTML: {len(links)}")
    listing_jsonld = json_ld_products(listing_html)

    sm_status = sitemap_has_products(parser, sitemaps, budget, host)
    print(f"        sitemap: {sm_status}")

    product_html = ""
    product_url = ""
    product_status = "no product URL"
    for link in links[:3]:
        if budget[0] >= MAX_PAGES:
            break
        path = urlparse(link).path
        if not allowed(parser, path):
            print(f"        robots DISALLOW product {path}")
            continue
        budget[0] += 1
        resp = get(link)
        product_status = classify(resp, "product")
        if blocked(product_status):
            print(f"FAILED  {name}: {product_status}")
            return row(name, platform, "yes", "blocked on PDP", "n/a", "n/a", sm_status, "high", "n/a", False, product_status, links=len(links))
        if product_status == "ok" and resp is not None:
            product_html = resp.text
            product_url = resp.url
            print(f"        product OK {len(product_html)} bytes {resp.url}")
            break
        print(f"        product skip: {product_status}")

    jsonld = json_ld_products(product_html) if product_html else listing_jsonld
    fields = extract_fields(product_html or listing_html, jsonld, product_url or listing_url)
    samples = fields.pop("samples")
    html_or_js = render_kind(product_html or listing_html, jsonld, fields)
    print(f"        JSON-LD Product: {'yes' if jsonld else 'no'}")
    print(f"        extractable: {', '.join(k for k,v in fields.items() if v and k != 'next_data') or 'none'}")
    if any(samples.values()):
        print(f"        samples: {samples}")
    print(f"        render: {html_or_js}")

    style = "yes" if fields.get("sku") else "unclear"
    jsonld_flag = "yes" if jsonld else ("in __NEXT_DATA__" if fields.get("next_data") else "no")
    if html_or_js == "HTML" and jsonld:
        effort = "low"
    elif html_or_js in {"HTML", "JS JSON blob"}:
        effort = "med"
    else:
        effort = "high"
    brands = brands_hint(listing_html + product_html, cfg["kind"], name)
    print(f"        brands hint: {brands}")
    return row(
        name, platform, "no", html_or_js, jsonld_flag, style, sm_status, effort, brands, True, "ok",
        links=len(links), fields=fields,
    )


def row(site, platform, blocked_s, html_or_js, jsonld, style, sitemap, effort, brands, ok, reason, links=0, fields=None):
    return {
        "site": site, "platform": platform, "blocked": blocked_s, "html_or_js": html_or_js,
        "jsonld": jsonld, "style_code": style, "sitemap": sitemap, "effort": effort,
        "brands": brands, "ok": ok, "reason": reason, "links": links, "fields": fields or {},
    }


def main() -> None:
    print(f"User-Agent: {USER_AGENT}")
    print("Stage C: non-Shopify USD probe. Skip us.puma.com. 2s delay, max 10 pages/site.")
    print("403/418/429/503 or challenge = FAILED. No scrapers.\n")
    rows = [check_site(cfg) for cfg in SITES]
    print("\n=== Table ===")
    hdr = f"{'site':<22} {'platform':<28} {'blocked?':<8} {'HTML/JS':<14} {'JSON-LD':<16} {'style':<8} {'sitemap':<28} {'effort':<6} {'brands'}"
    print(hdr)
    print("-" * 160)
    for r in rows:
        sm = str(r["sitemap"])[:28]
        print(
            f"{r['site']:<22} {str(r['platform'])[:28]:<28} {r['blocked']:<8} {str(r['html_or_js'])[:14]:<14} "
            f"{str(r['jsonld'])[:16]:<16} {str(r['style_code'])[:8]:<8} {sm:<28} {r['effort']:<6} {str(r['brands'])[:40]}"
        )


if __name__ == "__main__":
    main()
