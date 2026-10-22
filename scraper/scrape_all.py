"""
scrape_all.py - one script for the whole pipeline.

  python scraper\\scrape_all.py --store 6pm [--limit 20]   scrape one store -> data/offers_<store>.json
  python scraper\\scrape_all.py --merge                     dedupe + match -> data/offers.json, data/products.json
  python scraper\\scrape_all.py --report                    print the quality report
  python scraper\\scrape_all.py --upload [--dry-run] [--reset]   push to Supabase and print row counts
  python scraper\\scrape_all.py --all [--limit 20]          every store in turn, then merge + report

Rules for every request: robots.txt is checked (with * and $ wildcards), 2s delay (more if robots asks),
honest User-Agent, no retries on blocks, no bypassing. Only sneakers/running/athletic shoes, no kids.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from base import (  # noqa: E402
    BLOCK_STATUSES,
    USER_AGENT,
    BlockedError,
    DisallowedError,
    PoliteSession,
    clean_text,
    find_product,
    make_offer,
    parse_availability,
    parse_jsonld,
    parse_price,
)

DATA = ROOT / "data"

# --------------------------------------------------------------------------------------
# STORE CONFIG  (delete a line to drop a store)
# --------------------------------------------------------------------------------------
SIXPM_LISTINGS = [
    "/puma-shoes", "/skechers-shoes", "/under-armour-shoes", "/nike-shoes",
    "/men-sneakers-athletic-shoes", "/women-sneakers-athletic-shoes", "/running-shoes",
    "/adidas-shoes", "/new-balance-shoes", "/converse-shoes", "/vans-shoes",
    "/asics-shoes", "/reebok-shoes", "/hoka-shoes", "/brooks-shoes", "/saucony-shoes",
]

STORES: dict[str, dict[str, Any]] = {
    "6pm": {"kind": "family", "base": "https://www.6pm.com", "listings": SIXPM_LISTINGS, "cap": 300, "max_pages": 6},
    "zappos": {"kind": "family", "base": "https://www.zappos.com", "listings": SIXPM_LISTINGS, "cap": 250, "max_pages": 6},
    "puma": {"kind": "puma", "cap": 250},
    "skechers": {"kind": "sitemap", "index": "https://www.skechers.com/sitemap_index.xml", "child_hint": r"product",
                 "require_shoe_word": False, "cap": 200, "max_children": 6},
    "underarmour": {"kind": "sitemap", "index": "https://www.underarmour.com/sitemap_index.xml", "child_hint": r"product|pdp",
                    "require_shoe_word": True, "cap": 150, "max_children": 6},
    "nike": {"kind": "sitemap", "index": "https://www.nike.com/sitemap-v2-pdp-index.xml", "url_must": r"^/t/", "child_must": r"-us\.xml$",
             "require_shoe_word": True, "cap": 150, "max_children": 6},
}

# --------------------------------------------------------------------------------------
# SHOE FILTER: sneakers / running / athletic only, no kids
# --------------------------------------------------------------------------------------
KID_WORDS = set("kid kids youth junior juniors toddler toddlers infant infants baby preschool boy boys girl girls child children".split())
DENY_WORDS = set("""boot boots bootie booties sandal sandals slide slides slipper slippers clog clogs heel heels pump pumps
loafer loafers oxford oxfords flip flop flops mule mules moccasin moccasins cleat cleats soccer football futsal golf hiking
spikes spike throwing javelin welly wellies wellington sock socks shirt shirts tee tees hoodie hoodies jacket jackets
shorts pants pant pajama pajamas sleepwear nightwear robe robes bra underwear sweater sweatshirt sweatpants
legging leggings tights dress skirt romper onesie jumpsuit coat vest pullover fleece parka apparel clothing
bag backpack hat beanie insole insoles laces cleaner""".split())
SHOE_WORDS = set("shoe shoes sneaker sneakers trainer trainers runner runners running jogger joggers".split())


def norm_tokens(*parts: Any) -> list[str]:
    text = " ".join(str(p) for p in parts if p).lower().replace("\u2019", "'")
    text = re.sub(r"'s\b", "", text).replace("'", "")
    return re.sub(r"[^a-z0-9]+", " ", text).split()


def is_wanted(parts: tuple, require_shoe_word: bool = False) -> tuple[bool, str]:
    toks = set(norm_tokens(*parts))
    if toks & KID_WORDS:
        return False, "kids"
    if toks & DENY_WORDS:
        return False, "not_sneaker"
    if require_shoe_word and not (toks & SHOE_WORDS):
        return False, "no_shoe_word"
    return True, ""


def classify(title: str) -> str:
    t = set(norm_tokens(title))
    if "basketball" in t:
        return "basketball"
    if "running" in t or "run" in t:
        return "running"
    if "training" in t or "cross" in t:
        return "training"
    if "walking" in t or "walk" in t:
        return "walking"
    return "sneaker"


def guess_gender(*parts: Any) -> str:
    t = set(norm_tokens(*parts))
    if t & {"women", "womens", "woman", "ladies", "wmns"}:
        return "Women's"
    if t & {"men", "mens", "man"}:
        return "Men's"
    return "Unisex"


def canon_url(u: str) -> str:
    p = urlparse(u)
    return urlunparse((p.scheme, p.netloc, p.path.rstrip("/") or "/", "", "", ""))


# --------------------------------------------------------------------------------------
# SESSION: polite, wildcard-aware robots.txt, smarter block detection
# --------------------------------------------------------------------------------------
HARD_MARKERS = ("just a moment", "cf-browser-verification", "px-captcha", "pardon our interruption",
                "attention required", "access denied", "please verify you are a human")


class StoreSession(PoliteSession):
    def __init__(self, *a: Any, **kw: Any) -> None:
        super().__init__(*a, **kw)
        self._rules: dict[str, list[tuple[bool, str]]] = {}
        self._rx: dict[str, re.Pattern] = {}
        self.robots_status: dict[str, Any] = {}

    def _load_rules(self, host: str) -> list[tuple[bool, str]]:
        if host in self._rules:
            return self._rules[host]
        rules: list[tuple[bool, str]] = []
        try:
            self._apply_rate_limit()
            r = requests.Session.get(self, f"https://{host}/robots.txt", timeout=self.timeout)
            self._last_request_time = time.time()
            self.robots_status[host] = r.status_code
            if r.status_code == 200:
                agents: list[str] = []
                in_rules = False
                for raw in r.text.splitlines():
                    line = raw.split("#", 1)[0].strip()
                    if ":" not in line:
                        continue
                    k, v = [x.strip() for x in line.split(":", 1)]
                    k = k.lower()
                    if k == "user-agent":
                        if in_rules:
                            agents, in_rules = [], False
                        agents.append(v.lower())
                    elif k in ("allow", "disallow"):
                        in_rules = True
                        if "*" in agents and v:
                            rules.append((k == "allow", v))
                    elif k == "crawl-delay" and "*" in agents:
                        try:
                            self.delay = max(self.delay, float(v))
                        except ValueError:
                            pass
            elif r.status_code != 404:
                rules = [(False, "/")]  # 401/403/5xx on robots.txt: be conservative
        except Exception as exc:  # noqa: BLE001
            self.robots_status[host] = f"error {str(exc)[:40]}"
            rules = [(False, "/")]
        self._rules[host] = rules
        return rules

    def _pattern(self, pat: str) -> re.Pattern:
        if pat not in self._rx:
            rx = re.escape(pat).replace(r"\*", ".*")
            if rx.endswith(r"\$"):
                rx = rx[:-2] + "$"
            self._rx[pat] = re.compile(rx)
        return self._rx[pat]

    def is_allowed(self, url: str) -> bool:
        p = urlparse(url)
        target = (p.path or "/") + (f"?{p.query}" if p.query else "")
        best: tuple[int, bool] | None = None
        for allow, pat in self._load_rules(p.netloc):
            if self._pattern(pat).match(target):
                cand = (len(pat), allow)
                if best is None or cand[0] > best[0] or (cand[0] == best[0] and allow):
                    best = cand
        return True if best is None else best[1]

    def get(self, url: str, **kw: Any) -> tuple[int, str]:  # type: ignore[override]
        if not self.is_allowed(url):
            self.disallowed_urls.append(url)
            raise DisallowedError(f"robots.txt disallows {url}")
        self._apply_rate_limit()
        try:
            resp = requests.Session.get(self, url, timeout=kw.pop("timeout", self.timeout), **kw)
        finally:
            self._last_request_time = time.time()
        status, text = resp.status_code, resp.text
        if status in BLOCK_STATUSES:
            self.blocked_urls.append(url)
            raise BlockedError(f"HTTP {status} for {url}")
        if len(text) < 40000 and any(m in text.lower() for m in HARD_MARKERS):
            self.blocked_urls.append(url)
            raise BlockedError(f"challenge page on {url}")
        return status, text


class StoreAbort(Exception):
    pass


def new_stats() -> dict[str, Any]:
    return {"fetched": 0, "blocked": 0, "errors": 0, "disallowed": 0, "no_data": 0,
            "consec_blocks": 0, "rejected": Counter(), "candidates": 0, "notes": []}


def fetch(session: StoreSession, url: str, stats: dict) -> tuple[int, str] | None:
    try:
        res = session.get(url)
        stats["fetched"] += 1
        stats["consec_blocks"] = 0
        return res
    except DisallowedError:
        stats["disallowed"] += 1
    except BlockedError as exc:
        stats["blocked"] += 1
        stats["consec_blocks"] += 1
        print(f"    [blocked] {exc}")
        if stats["consec_blocks"] >= 5:
            raise StoreAbort("5 blocks in a row - stopping this store (no bypassing)")
    except Exception as exc:  # noqa: BLE001
        stats["errors"] += 1
        print(f"    [error] {url}: {str(exc)[:100]}")
    return None


def to_soup(text: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(text, "lxml")
    except Exception:  # noqa: BLE001
        return BeautifulSoup(text, "html.parser")


def has_type(item: dict, t: str) -> bool:
    ty = item.get("@type")
    return ty == t or (isinstance(ty, list) and t in ty)


def first(v: Any) -> Any:
    return v[0] if isinstance(v, list) and v else v


def size_sort_key(s: str) -> tuple:
    m = re.match(r"\s*(\d+(?:\.\d+)?)", s)
    return (0, float(m.group(1)), s) if m else (1, 0.0, s)


SIZE_RE = re.compile(r"^\d{1,2}(\.5)?$")


def walk_sizes(obj: Any, out: set, depth: int = 0) -> None:
    if depth > 14:
        return
    if isinstance(obj, dict):
        s = obj.get("size") or obj.get("sizeLabel") or obj.get("sizeValue")
        if isinstance(s, (str, int, float)) and SIZE_RE.match(str(s).strip()):
            avail = obj.get("available", obj.get("inStock", obj.get("orderable", True)))
            if avail not in (False, 0, "false", "False"):
                out.add(str(s).strip())
        for v in obj.values():
            walk_sizes(v, out, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            walk_sizes(v, out, depth + 1)


def sizes_from_next_data(soup: BeautifulSoup) -> list[str]:
    sc = soup.find("script", id="__NEXT_DATA__")
    if not sc:
        return []
    try:
        data = json.loads(sc.string or sc.get_text() or "")
    except Exception:  # noqa: BLE001
        return []
    out: set[str] = set()
    walk_sizes(data, out)
    return sorted(out, key=size_sort_key) if 0 < len(out) <= 30 else []


def add_offer(out: list, stats: dict, **kw: Any) -> None:
    offer = make_offer(category=classify(kw.get("store_title") or ""), **kw)
    if offer:
        out.append(offer)
    else:
        stats["rejected"]["no_price"] += 1


# --------------------------------------------------------------------------------------
# ENGINE 1: 6pm / Zappos (same platform): listing pages -> product pages
# --------------------------------------------------------------------------------------
def pdp_state(text: str) -> dict | None:
    m = re.search(r"window\.__INITIAL_STATE__\s*=\s*", text)
    if not m:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[m.end():])
        return obj if isinstance(obj, dict) else None
    except Exception:  # noqa: BLE001
        return None


def pick_style(state: dict | None, color_id: str | None) -> tuple[dict | None, bool]:
    styles = (((state or {}).get("product") or {}).get("detail") or {}).get("styles") or []
    if color_id:
        for st in styles:
            if str(st.get("colorId")) == color_id:
                return st, True
        for st in styles:
            if any(str(v) == color_id for v in st.values() if isinstance(v, (str, int))):
                return st, True
    return (styles[0] if styles else None), False


def find_style(state: Any, color_id: str | None) -> dict | None:
    """Find the style dict for this colour anywhere inside the page state."""
    if not state or not color_id:
        return None
    stack = [state]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            if str(cur.get("colorId")) == color_id and ("price" in cur or "stocks" in cur or "originalPrice" in cur):
                return cur
            stack.extend(v for v in cur.values() if isinstance(v, (dict, list)))
        elif isinstance(cur, list):
            stack.extend(v for v in cur if isinstance(v, (dict, list)))
    return None


def scrape_family(session: StoreSession, store: str, cfg: dict, limit: int, stats: dict) -> list[dict]:
    base, out, seen = cfg["base"], [], set()
    for path in cfg["listings"]:
        if len(out) >= limit:
            break
        lurl = base + path
        print(f"  [{store}] listing {path}")
        for page in range(cfg.get("max_pages", 6)):
            if len(out) >= limit:
                break
            url = lurl if page == 0 else f"{lurl}?p={page}"
            res = fetch(session, url, stats)
            if not res or res[0] != 200:
                break
            prods = [i for i in parse_jsonld(to_soup(res[1])) if has_type(i, "Product")]
            if not prods:
                break
            new = 0
            for p in prods:
                if len(out) >= limit:
                    break
                o = p.get("offers") or {}
                o = o[0] if isinstance(o, list) and o else (o if isinstance(o, dict) else {})
                rel = p.get("url") or o.get("url")
                if not rel:
                    continue
                full = canon_url(urljoin(base, rel))
                if full in seen:
                    continue
                seen.add(full)
                new += 1
                name = clean_text(p.get("name"))
                gender = p.get("gender") if isinstance(p.get("gender"), str) else ""
                ok, why = is_wanted((name, gender, urlparse(full).path))
                if not ok:
                    stats["rejected"][why] += 1
                    continue
                bf = p.get("brand")
                brand = bf.get("name") if isinstance(bf, dict) else str(bf or "Unknown")
                image = first(p.get("image"))
                image = image.get("url") if isinstance(image, dict) else image
                price, compare, sizes, color = parse_price(o.get("price")), None, [], None
                res2 = fetch(session, full, stats)
                if res2 and res2[0] == 200:
                    cid = re.search(r"/color/(\d+)", full)
                    state = pdp_state(res2[1])
                    st = find_style(state, cid.group(1) if cid else None)
                    if st:
                        stats["pdp_ok"] = stats.get("pdp_ok", 0) + 1
                        price = parse_price(st.get("price")) or price
                        compare = parse_price(st.get("originalPrice"))
                        color = st.get("color")
                        sizes = sorted({clean_text(s.get("size")) for s in st.get("stocks", []) if s.get("size")},
                                       key=size_sort_key)
                    else:
                        k = "pdp_no_style" if state else "pdp_no_state"
                        stats[k] = stats.get(k, 0) + 1
                        pp = parse_product_page(res2[1], full)  # fallback: JSON-LD on the product page
                        if pp:
                            price = price or pp["price"]
                            compare = pp["compare"] if pp["compare"] and (not price or pp["compare"] > price) else None
                            sizes = pp["sizes"]
                            color = pp["color"]
                add_offer(out, stats, store=store, store_title=name, brand=brand, image_url=image, price=price,
                          compare_at_price=compare, currency="USD", sizes=sizes,
                          in_stock=parse_availability(o.get("availability")), url=full, colorway=color,
                          gender=gender or None)
            print(f"    page {page}: {len(prods)} on page, {new} new, total kept {len(out)}")
            if new == 0:
                break
    return out


# --------------------------------------------------------------------------------------
# ENGINE 2: Puma US (sitemap shards -> product pages with JSON-LD)
# --------------------------------------------------------------------------------------
LOC_RE = re.compile(r"<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</loc>", re.S)


def locs(text: str) -> list[str]:
    return [html.unescape(x.strip()) for x in LOC_RE.findall(text)]


PUMA_PRIORITY = ("palermo", "speedcat", "rebound", "fade", "foreverrun", "velocity", "darter", "voltaic", "roma",
                 "homura", "electrify", "suede", "all-pro", "pacer", "caven", "carina", "softride", "mayze")


def puma_discover(session: StoreSession, stats: dict) -> list[str]:
    res = fetch(session, "https://us.puma.com/sitemaps/urls/us/sitemap_index.xml", stats)
    if not res:
        return []
    urls, seen = [], set()
    for shard in locs(res[1]):
        m = re.search(r"sitemap_(\d+)\.xml", shard)
        if m and not 3 <= int(m.group(1)) <= 16:
            continue
        print(f"  [puma] sitemap shard {shard.rsplit('/', 1)[-1]}")
        r2 = fetch(session, shard, stats)
        if not r2:
            continue
        for u in locs(r2[1]):
            if "/us/en/pd/" in u and u not in seen and is_wanted((urlparse(u).path,), True)[0]:
                seen.add(u)
                urls.append(u)
    urls.sort(key=lambda u: 0 if any(p in u.lower() for p in PUMA_PRIORITY) else 1)
    stats["candidates"] = len(urls)
    print(f"  [puma] {len(urls)} candidate sneaker URLs")
    return urls


def ld_offers(prod: dict) -> list[dict]:
    found: list[dict] = []

    def collect(o: Any) -> None:
        if isinstance(o, list):
            for x in o:
                collect(x)
        elif isinstance(o, dict):
            if "offers" in o and "price" not in o and "lowPrice" not in o:
                collect(o["offers"])
            else:
                found.append(o)

    collect(prod.get("offers"))
    for var in prod.get("hasVariant") or []:
        if isinstance(var, dict):
            collect(var.get("offers"))
    return found


def compare_price(offers: list[dict], soup: BeautifulSoup, price: float) -> float | None:
    for o in offers:
        ps = o.get("priceSpecification")
        for spec in ps if isinstance(ps, list) else [ps]:
            if isinstance(spec, dict) and re.search(r"strike|list|msrp|original", str(spec.get("priceType", "")), re.I):
                v = parse_price(spec.get("price"))
                if v and v > price:
                    return v
    el = soup.find(class_=re.compile(r"strikethrough|line-through|original-price|was-price", re.I))
    if el:
        v = parse_price(el.get_text(" ", strip=True))
        if v and price < v <= price * 6:
            return v
    return None


def parse_product_page(text: str, url: str) -> dict | None:
    soup = to_soup(text)
    prod = find_product(parse_jsonld(soup))
    if not prod:
        return None
    offers = ld_offers(prod)
    prices = [parse_price(o.get("price") or o.get("lowPrice")) for o in offers]
    prices = [p for p in prices if p]
    if not prices:
        return None
    price = min(prices)
    bf = prod.get("brand")
    brand = bf.get("name") if isinstance(bf, dict) else (bf if isinstance(bf, str) else None)
    image = first(prod.get("image"))
    image = image.get("url") if isinstance(image, dict) else image
    if not image:
        og = soup.find("meta", property="og:image")
        image = og.get("content") if og else None
    name = prod.get("name") or ((soup.find("meta", property="og:title") or {}).get("content") if soup else None)
    sizes = sorted({str(o.get("size")).strip() for o in offers if o.get("size")}, key=size_sort_key)
    for var in prod.get("hasVariant") or []:
        if isinstance(var, dict) and var.get("size"):
            sizes.append(str(var["size"]).strip())
    sizes = sorted(set(sizes), key=size_sort_key) or sizes_from_next_data(soup)
    avail = [parse_availability(o.get("availability")) for o in offers]
    in_stock = True if any(a is True for a in avail) else (False if any(a is False for a in avail) else None)
    color = prod.get("color")
    color = "/".join(color) if isinstance(color, list) else color
    currency = next((str(o.get("priceCurrency")).upper() for o in offers if o.get("priceCurrency")), None)
    code = prod.get("mpn") or prod.get("sku")
    return {"name": clean_text(name), "brand": brand, "image": image, "price": price,
            "compare": compare_price(offers, soup, price), "sizes": sizes, "in_stock": in_stock,
            "color": color, "currency": currency, "code": str(code) if code and len(str(code)) <= 20 else None}


def scrape_puma(session: StoreSession, store: str, cfg: dict, limit: int, stats: dict) -> list[dict]:
    urls = puma_discover(session, stats)
    out: list[dict] = []
    budget = int(limit * 1.8) + 10
    for url in urls[:budget]:
        if len(out) >= limit:
            break
        res = fetch(session, url, stats)
        if not res or res[0] != 200:
            continue
        pp = parse_product_page(res[1], url)
        if not pp:
            stats["no_data"] += 1
            continue
        if pp["currency"] and pp["currency"] != "USD":
            stats["rejected"]["not_usd"] += 1
            continue
        ok, why = is_wanted((pp["name"], urlparse(url).path), True)
        if not ok:
            stats["rejected"][why] += 1
            continue
        m = re.search(r"/pd/[^/]+/(\d+)", url)
        add_offer(out, stats, store=store, store_title=pp["name"], brand=pp["brand"] or "Puma", image_url=pp["image"],
                  price=pp["price"], compare_at_price=pp["compare"], currency="USD", sizes=pp["sizes"],
                  in_stock=pp["in_stock"], url=canon_url(url), style_code=m.group(1) if m else pp["code"],
                  colorway=pp["color"], gender=guess_gender(pp["name"], url))
        if len(out) % 25 == 0:
            print(f"    [puma] kept {len(out)}")
    return out


# --------------------------------------------------------------------------------------
# ENGINE 3: generic sitemap + JSON-LD (Skechers, Under Armour, Nike)
# --------------------------------------------------------------------------------------
def sitemap_discover(session: StoreSession, store: str, cfg: dict, stats: dict, need: int) -> list[str]:
    res = fetch(session, cfg["index"], stats)
    if not res:
        return []
    must = re.compile(cfg["url_must"]) if cfg.get("url_must") else None
    req = cfg.get("require_shoe_word", True)

    def keep(u: str) -> bool:
        path = urlparse(u).path
        if store == "nike" and "/p/" in path:  # robots.txt disallows */p/
            return False
        if must and not must.search(path):
            return False
        return is_wanted((path,), req)[0]

    text = res[1]
    if "<sitemapindex" not in text:
        urls = [u for u in locs(text) if keep(u)]
        stats["candidates"] = len(urls)
        return urls
    hint = re.compile(cfg.get("child_hint") or ".", re.I)
    children = locs(text)
    if cfg.get("child_must"):
        wanted = [c for c in children if re.search(cfg["child_must"], c, re.I)]
        if not wanted:
            names = [c.rsplit("/", 1)[-1] for c in children[:40]]
            stats["notes"].append(f"no matching sitemap; the index lists: {names}")
            return []
        children = wanted
    children = sorted(children, key=lambda c: 0 if hint.search(c) else 1)
    urls, seen = [], set()
    for child in children[: cfg.get("max_children", 6)]:
        print(f"  [{store}] sitemap {child.rsplit('/', 1)[-1][:60]}")
        r2 = fetch(session, child, stats)
        if not r2:
            continue
        for u in locs(r2[1]):
            if u not in seen and keep(u):
                seen.add(u)
                urls.append(u)
        if len(urls) >= need:
            break
    stats["candidates"] = len(urls)
    print(f"  [{store}] {len(urls)} candidate URLs")
    return urls


def scrape_sitemap(session: StoreSession, store: str, cfg: dict, limit: int, stats: dict) -> list[dict]:
    urls = sitemap_discover(session, store, cfg, stats, need=limit * 4)
    if not urls:
        stats["notes"].append("no candidate URLs found (sitemap layout differs - paste me this output)")
    out: list[dict] = []
    req = cfg.get("require_shoe_word", True)
    for url in urls[: limit * 4]:
        if len(out) >= limit:
            break
        if stats["fetched"] >= 30 and not out and stats["no_data"] >= 22:
            stats["notes"].append("no product data in the pages (needs JavaScript or wrong URLs) - store skipped")
            print(f"  [{store}] no usable product data, skipping store")
            break
        res = fetch(session, url, stats)
        if not res or res[0] != 200:
            continue
        pp = parse_product_page(res[1], url)
        if not pp:
            stats["no_data"] += 1
            continue
        if pp["currency"] and pp["currency"] != "USD":
            stats["rejected"]["not_usd"] += 1
            continue
        gender = guess_gender(pp["name"], urlparse(url).path)
        ok, why = is_wanted((pp["name"], gender, urlparse(url).path), req)
        if not ok:
            stats["rejected"][why] += 1
            continue
        code = pp["code"]
        if store == "nike":
            m = re.search(r"/([A-Z0-9]{5,8}-\d{3})/?$", urlparse(url).path)
            code = m.group(1) if m else code
        add_offer(out, stats, store=store, store_title=pp["name"], brand=pp["brand"] or store.title(),
                  image_url=pp["image"], price=pp["price"], compare_at_price=pp["compare"], currency="USD",
                  sizes=pp["sizes"], in_stock=pp["in_stock"], url=canon_url(url), style_code=code,
                  colorway=pp["color"], gender=gender)
        if len(out) % 25 == 0:
            print(f"    [{store}] kept {len(out)}")
    return out


# --------------------------------------------------------------------------------------
# RUN ONE STORE
# --------------------------------------------------------------------------------------
def run_store(name: str, limit: int | None) -> None:
    cfg = STORES[name]
    cap = limit if limit else cfg["cap"]
    session = StoreSession(user_agent=USER_AGENT, delay=2.0, timeout=20.0)
    stats = new_stats()
    print(f"\n=== {name}: target {cap} offers ===")
    engine = {"family": scrape_family, "puma": scrape_puma, "sitemap": scrape_sitemap}[cfg["kind"]]
    offers: list[dict] = []
    try:
        offers = engine(session, name, cfg, cap, stats)
    except StoreAbort as exc:
        stats["notes"].append(str(exc))
        print(f"  ABORTED: {exc}")
    except KeyboardInterrupt:
        print("  interrupted - saving what we have")
    except Exception as exc:  # noqa: BLE001
        stats["notes"].append(f"crashed: {exc}")
        print(f"  CRASHED: {exc}")
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / f"offers_{name}.json").write_text(json.dumps(offers, indent=2, ensure_ascii=False), encoding="utf-8")
    stats["rejected"] = dict(stats["rejected"])
    stats["kept"] = len(offers)
    (DATA / f"stats_{name}.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(f"=== {name}: kept {len(offers)} | fetched {stats['fetched']} | blocked {stats['blocked']} | "
          f"robots-disallowed {stats['disallowed']} | errors {stats['errors']} | rejected {stats['rejected']}")
    if any(k in stats for k in ("pdp_ok", "pdp_no_style", "pdp_no_state")):
        print(f"  product pages: matched {stats.get('pdp_ok', 0)} | no colour match {stats.get('pdp_no_style', 0)} | "
              f"no page state {stats.get('pdp_no_state', 0)}")
    print(f"  robots.txt status: {session.robots_status}")
    if stats["disallowed"] and not offers:
        stats["notes"].append("robots.txt blocks (or returned an error for) this site - skipping it, no bypassing")
    for n in stats["notes"]:
        print(f"  NOTE: {n}")


# --------------------------------------------------------------------------------------
# MERGE: dedupe + match
# --------------------------------------------------------------------------------------
def load_store_files() -> list[dict]:
    offers: list[dict] = []
    for f in sorted(DATA.glob("offers_*.json")):
        try:
            offers.extend(json.loads(f.read_text(encoding="utf-8")))
        except Exception as exc:  # noqa: BLE001
            print(f"  could not read {f.name}: {exc}")
    return offers


def fuzzy_merge(groups: dict[str, list[dict]]) -> int:
    buckets: dict[tuple, list[str]] = defaultdict(list)
    for key in groups:
        parts = key.split("|")
        if len(parts) == 5 and parts[2] and parts[3]:
            buckets[(parts[0], parts[1], parts[2], parts[4])].append(key)
    merged = 0
    for keys in buckets.values():
        keys.sort(key=lambda k: -len(groups[k]))
        for k in keys:
            if k not in groups:
                continue
            for k2 in keys:
                if k2 == k or k2 not in groups:
                    continue
                if {o["store"] for o in groups[k]} & {o["store"] for o in groups[k2]}:
                    continue
                a, b = set(k.split("|")[3].split()), set(k2.split("|")[3].split())
                if a and b and len(a & b) / len(a | b) >= 0.75:
                    for o in groups[k2]:
                        o["match_key"] = k
                    groups[k].extend(groups.pop(k2))
                    merged += 1
    return merged


def merge() -> None:
    from matching import group_offers  # your existing matching logic

    raw = load_store_files()
    print(f"loaded {len(raw)} offers from {len(list(DATA.glob('offers_*.json')))} store files")
    seen, offers = set(), []
    for o in raw:
        k = (o["store"], canon_url(o["url"]))
        if k not in seen:
            seen.add(k)
            offers.append(o)
    print(f"after URL dedupe: {len(offers)}")
    groups = group_offers(offers)
    fm = fuzzy_merge(groups)
    removed = 0
    for key, offs in list(groups.items()):
        color = key.split("|")[3] if len(key.split("|")) > 3 else ""
        if not color:
            continue
        best: dict[str, dict] = {}
        for o in offs:
            cur = best.get(o["store"])
            if cur is None or (o.get("in_stock") is not False, -o["price"]) > (cur.get("in_stock") is not False, -cur["price"]):
                best[o["store"]] = o
        removed += len(offs) - len(best)
        groups[key] = list(best.values())
    final = [o for offs in groups.values() for o in offs]
    products = []
    for key, offs in groups.items():
        lead = next((o for o in offs if o.get("image_url")), offs[0])
        products.append({"match_key": key, "brand": lead.get("brand"), "title": lead.get("store_title"),
                         "image_url": lead.get("image_url"),
                         "style_code": next((o["style_code"] for o in offs if o.get("style_code")), None),
                         "stores": sorted({o["store"] for o in offs}), "offers": offs})
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "offers.json").write_text(json.dumps(final, indent=2, ensure_ascii=False), encoding="utf-8")
    (DATA / "products.json").write_text(json.dumps(products, indent=2, ensure_ascii=False), encoding="utf-8")
    multi = sum(1 for p in products if len(p["stores"]) >= 2)
    print(f"fuzzy merges: {fm} | same-store duplicates removed: {removed}")
    print(f"WROTE data/offers.json ({len(final)} offers) and data/products.json ({len(products)} products, {multi} in 2+ stores)")


# --------------------------------------------------------------------------------------
# REPORT
# --------------------------------------------------------------------------------------
def report() -> None:
    path = DATA / "offers.json"
    if not path.exists():
        print("data/offers.json not found - run --merge first")
        return
    offers = json.loads(path.read_text(encoding="utf-8"))
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8")) if (DATA / "products.json").exists() else []
    print("\n" + "=" * 70 + "\nREPORT\n" + "=" * 70)
    print(f"offers: {len(offers)} | distinct products: {len(products)}")
    by = defaultdict(list)
    for o in offers:
        by[o["store"]].append(o)
    for store, items in sorted(by.items()):
        n = len(items)
        cov = lambda f: sum(1 for o in items if f(o))  # noqa: E731
        print(f"\n[{store}] {n} offers, currency {Counter(o.get('currency') for o in items).most_common(1)[0][0]}")
        print(f"  price {cov(lambda o: o.get('price'))}/{n} | original price {cov(lambda o: o.get('compare_at_price'))}/{n} | "
              f"discount {cov(lambda o: o.get('discount_pct'))}/{n} | image {cov(lambda o: o.get('image_url'))}/{n} | "
              f"sizes {cov(lambda o: o.get('sizes'))}/{n} | stock {cov(lambda o: o.get('in_stock') is not None)}/{n} | "
              f"style_code {cov(lambda o: o.get('style_code'))}/{n}")
        print(f"  brands: {Counter(o.get('brand') for o in items).most_common(8)}")
        print(f"  categories: {dict(Counter(o.get('category') for o in items))}")
        sf = DATA / f"stats_{store}.json"
        if sf.exists():
            st = json.loads(sf.read_text(encoding="utf-8"))
            print(f"  rejected by filter: {st.get('rejected')} | blocked {st.get('blocked')} | notes {st.get('notes')}")
    print(f"\naudience: {dict(Counter(detect_aud(o) for o in offers))}")
    multi = [p for p in products if len(p["stores"]) >= 2]
    print(f"\nproducts with offers from 2+ stores: {len(multi)}")
    for p in multi[:10]:
        print(f"  - {p['brand']} | {p['title']}")
        for o in p["offers"]:
            print(f"      [{o['store']}] {o.get('colorway') or '-'} | {o['currency']} {o['price']}"
                  f"{' (was ' + str(o['compare_at_price']) + ')' if o.get('compare_at_price') else ''}")
    dup_url = len(offers) - len({(o['store'], canon_url(o['url'])) for o in offers})
    dup_key = sum(len(p["offers"]) - len({o["store"] for o in p["offers"]}) for p in products
                  if p["match_key"].split("|")[3:4] not in ([""], []))
    print(f"\nduplicate URLs left: {dup_url} | same-store duplicates left (same colorway): {dup_key}")
    print(f"discounts above 60%: {sum(1 for o in offers if (o.get('discount_pct') or 0) > 60)} (check a few by hand)")
    print(f"soccer/cleat/kids/boot titles left: "
          f"{sum(1 for o in offers if not is_wanted((o.get('store_title'), o.get('gender')))[0])}")


def detect_aud(o: dict) -> str:
    try:
        from matching import detect_audience
        return detect_audience(o)
    except Exception:  # noqa: BLE001
        return "?"


# --------------------------------------------------------------------------------------
# UPLOAD
# --------------------------------------------------------------------------------------
def load_env() -> tuple[str, str]:
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env")
    except Exception:  # noqa: BLE001
        pass
    return (os.getenv("SUPABASE_URL") or "").strip(), (os.getenv("SUPABASE_SERVICE_KEY") or "").strip()


def chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def upload(dry: bool, reset: bool) -> None:
    path = DATA / "offers.json"
    if not path.exists():
        print("data/offers.json not found - run --merge first")
        return
    offers = json.loads(path.read_text(encoding="utf-8"))
    by_key: dict[str, list[dict]] = defaultdict(list)
    for o in offers:
        by_key[o["match_key"]].append(o)
    per_store = Counter(o["store"] for o in offers)
    print(f"local: {len(by_key)} products, {len(offers)} offers, per store {dict(per_store)}")
    if dry:
        print("dry run - nothing uploaded")
        return
    url, key = load_env()
    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
        return
    from supabase import create_client

    client = create_client(url, key)
    if reset:
        zero = "00000000-0000-0000-0000-000000000000"
        client.table("offers").delete().neq("id", zero).execute()
        client.table("products").delete().neq("id", zero).execute()
        print("tables emptied (--reset)")
    prows = []
    for k, offs in by_key.items():
        lead = next((o for o in offs if o.get("image_url")), offs[0])
        prows.append({"brand": lead.get("brand"), "title": lead.get("store_title") or k, "match_key": k,
                      "image_url": lead.get("image_url"),
                      "style_code": next((o["style_code"] for o in offs if o.get("style_code")), None)})
    id_by_key: dict[str, str] = {}
    for part in chunks(prows, 100):
        res = client.table("products").upsert(part, on_conflict="match_key").execute()
        for row in res.data or []:
            id_by_key[row["match_key"]] = row["id"]
    missing = [k for k in by_key if k not in id_by_key]
    if missing:  # fall back to reading ids back, page by page
        start = 0
        while True:
            page = client.table("products").select("id,match_key").range(start, start + 999).execute().data or []
            id_by_key.update({r["match_key"]: r["id"] for r in page})
            if len(page) < 1000:
                break
            start += 1000
    orows = []
    for o in offers:
        orows.append({"product_id": id_by_key.get(o["match_key"]), "store": o["store"],
                      "store_title": o.get("store_title") or "", "price": o["price"],
                      "compare_at_price": o.get("compare_at_price"), "discount_pct": o.get("discount_pct"),
                      "sizes": o.get("sizes") or [], "in_stock": o.get("in_stock"), "url": o["url"],
                      "image_url": o.get("image_url"), "currency": o.get("currency") or "USD",
                      "category": o.get("category") or "sneaker"})
    for part in chunks(orows, 100):
        client.table("offers").upsert(part, on_conflict="store,url").execute()
    pc = client.table("products").select("id", count="exact").limit(1).execute().count
    oc = client.table("offers").select("id", count="exact").limit(1).execute().count
    print(f"\nSupabase now: products {pc} (local {len(by_key)}) | offers {oc} (local {len(offers)})")
    for s in per_store:
        sc = client.table("offers").select("id", count="exact").eq("store", s).limit(1).execute().count
        print(f"  {s}: {sc} (local {per_store[s]})")


# --------------------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser(description="Shoe scraper pipeline")
    ap.add_argument("--store", choices=sorted(STORES), help="scrape one store")
    ap.add_argument("--all", action="store_true", help="scrape every store, then merge + report")
    ap.add_argument("--limit", type=int, help="max offers per store (use 20 for a test)")
    ap.add_argument("--merge", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--reset", action="store_true", help="empty Supabase tables before uploading")
    a = ap.parse_args()
    if not (a.store or a.all or a.merge or a.report or a.upload):
        ap.print_help()
        return
    if a.store:
        run_store(a.store, a.limit)
    if a.all:
        for name in STORES:
            run_store(name, a.limit)
        merge()
        report()
    if a.merge:
        merge()
    if a.report:
        report()
    if a.upload:
        upload(a.dry_run, a.reset)


if __name__ == "__main__":
    main()