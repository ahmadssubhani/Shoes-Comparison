"""Base scraping utilities, PoliteSession, JSON-LD parser, and offer normalization."""

from __future__ import annotations

import html
import json
import re
import time
from typing import Any
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (student-project; contact: ahmedssubhani@gmail.com)"
DELAY_SECONDS = 2.0
TIMEOUT = 20.0

BLOCK_STATUSES = {403, 429, 503}

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
    "px-captcha",
    "additional verification required",
)

PRICE_RE = re.compile(r"(\d+(?:\.\d{1,2})?)")

CANONICAL_BRANDS = {
    "puma": "Puma",
    "crocs": "Crocs",
    "clarks": "Clarks",
    "clarks usa": "Clarks",
    "aigle": "Aigle",
    "hunter": "Hunter",
    "under armour": "Under Armour",
    "florsheim": "Florsheim",
    "brogini": "Brogini",
    "muds": "Muds",
    "lemieux": "LeMieux",
    "skechers": "Skechers",
    "nike": "Nike",
    "adidas": "Adidas",
    "new balance": "New Balance",
    "asics": "Asics",
    "saucony": "Saucony",
    "vans": "Vans",
    "salomon": "Salomon",
    "merrell": "Merrell",
    "hoka": "Hoka",
    "brooks": "Brooks",
    "converse": "Converse",
    "reebok": "Reebok",
}


class ScraperError(Exception):
    """Base error for scraper operations."""
    pass


class DisallowedError(ScraperError):
    """Raised when robots.txt disallows fetching a URL."""
    pass


class BlockedError(ScraperError):
    """Raised on 403, 429, 503, or anti-bot challenge pages."""
    pass


class PoliteSession(requests.Session):
    """Polite requests.Session with rate limiting, robots.txt caching, and bot detection."""

    def __init__(
        self,
        user_agent: str = USER_AGENT,
        delay: float = DELAY_SECONDS,
        timeout: float = TIMEOUT,
    ) -> None:
        super().__init__()
        self.user_agent = user_agent
        self.delay = delay
        self.timeout = timeout
        self.headers.update(
            {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        self._robots_cache: dict[str, RobotFileParser] = {}
        self._last_request_time: float = 0.0
        self.disallowed_urls: list[str] = []
        self.blocked_urls: list[str] = []
        self.request_history: list[dict[str, Any]] = []

    def get_robots_parser(self, netloc: str, scheme: str = "https") -> RobotFileParser:
        if netloc in self._robots_cache:
            return self._robots_cache[netloc]

        robots_url = f"{scheme}://{netloc}/robots.txt"
        rfp = RobotFileParser()
        try:
            self._apply_rate_limit()
            resp = super().get(robots_url, timeout=self.timeout, verify=True)
            self._last_request_time = time.time()
            if resp.status_code == 200:
                rfp.parse(resp.text.splitlines())
            else:
                rfp.parse(["User-agent: *", "Allow: /"])
        except Exception:
            rfp.parse(["User-agent: *", "Allow: /"])

        self._robots_cache[netloc] = rfp
        return rfp

    def is_allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        if not parsed.netloc:
            return True
        rfp = self.get_robots_parser(parsed.netloc, parsed.scheme or "https")
        return rfp.can_fetch(self.user_agent, url)

    def _apply_rate_limit(self) -> None:
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def get(self, url: str, **kwargs) -> tuple[int, str]:  # type: ignore[override]
        """Check robots.txt, rate limit, request public URL, and check for blocks."""
        allowed = self.is_allowed(url)
        if not allowed:
            self.disallowed_urls.append(url)
            self.request_history.append({"url": url, "robots": False, "status": None})
            raise DisallowedError(f"URL disallowed by robots.txt: {url}")

        self._apply_rate_limit()

        timeout = kwargs.pop("timeout", self.timeout)
        try:
            resp = super().get(url, timeout=timeout, verify=True, **kwargs)
        except Exception as exc:
            self.request_history.append({"url": url, "robots": True, "status": "ERROR", "error": str(exc)})
            raise

        self._last_request_time = time.time()
        status = resp.status_code
        text = resp.text

        self.request_history.append({"url": url, "robots": True, "status": status})

        if status in BLOCK_STATUSES:
            self.blocked_urls.append(url)
            raise BlockedError(f"HTTP {status} block response for {url}")

        lower_snip = text[:10000].lower()
        if any(marker in lower_snip for marker in CHALLENGE_MARKERS):
            self.blocked_urls.append(url)
            raise BlockedError(f"Challenge or CAPTCHA detected on {url}")

        return status, text

    def get_soup(self, url: str, **kwargs) -> tuple[int, BeautifulSoup]:
        status, text = self.get(url, **kwargs)
        soup = BeautifulSoup(text, "lxml")
        return status, soup


def clean_text(text: str | None) -> str:
    """Normalize HTML entities, strip surrounding and collapse internal whitespace."""
    if text is None:
        return ""
    unescaped = html.unescape(str(text))
    # Replace non-breaking spaces and collapse whitespace
    collapsed = re.sub(r"\s+", " ", unescaped)
    return collapsed.strip()


def parse_price(val: Any) -> float | None:
    """Extract numeric price as float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val > 0 else None
    s = str(val).replace(",", "").strip()
    match = PRICE_RE.search(s)
    if not match:
        return None
    try:
        f = float(match.group(1))
        return f if f > 0 else None
    except ValueError:
        return None


def canonical_brand(brand: str | None) -> str:
    """Standardize brand names and remove excess whitespace."""
    if not brand:
        return "Unknown"
    raw = clean_text(brand).lower()
    # Strip common filler suffixes
    raw = re.sub(r"\s+(shoes|footwear|boots|clothing|apparel)$", "", raw).strip()
    if raw in CANONICAL_BRANDS:
        return CANONICAL_BRANDS[raw]
    return clean_text(brand).title()


def _flatten_jsonld(item: Any, out: list[dict]) -> None:
    """Recursively collect dicts from JSON-LD structures, unwrapping @graph and lists."""
    if isinstance(item, list):
        for sub in item:
            _flatten_jsonld(sub, out)
    elif isinstance(item, dict):
        if "@graph" in item:
            _flatten_jsonld(item["@graph"], out)
        out.append(item)


def parse_jsonld(soup: BeautifulSoup) -> list[dict]:
    """Parse all JSON-LD scripts from soup and return a flattened list of dicts."""
    results: list[dict] = []
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        raw_text = script.string or script.get_text() or ""
        raw_text = raw_text.strip()
        if not raw_text:
            continue
        try:
            data = json.loads(raw_text)
            _flatten_jsonld(data, results)
        except Exception:
            continue
    return results


def find_product(jsonld_list: list[dict]) -> dict | None:
    """Find the schema.org/Product or ProductGroup dict from parsed JSON-LD items."""
    # First priority: direct @type == "Product"
    for item in jsonld_list:
        t = item.get("@type")
        if t == "Product" or (isinstance(t, list) and "Product" in t):
            return item
    # Second priority: ProductGroup
    for item in jsonld_list:
        t = item.get("@type")
        if t == "ProductGroup" or (isinstance(t, list) and "ProductGroup" in t):
            return item
    return None


def parse_availability(raw: Any) -> bool | None:
    """Normalize schema.org availability string or boolean."""
    if isinstance(raw, bool):
        return raw
    if raw is None:
        return None
    s = str(raw).lower()
    if "instock" in s or "in_stock" in s or "preorder" in s or "backorder" in s:
        return True
    if "outofstock" in s or "out_of_stock" in s or "discontinued" in s or "soldout" in s:
        return False
    return None


def make_offer(
    store: str,
    store_title: str | None,
    brand: str | None,
    image_url: str | None,
    price: float | str | None,
    compare_at_price: float | str | None = None,
    currency: str = "USD",
    category: str = "footwear",
    sizes: list[str] | None = None,
    in_stock: bool | None = None,
    url: str | None = None,
    style_code: str | None = None,
    colorway: str | None = None,
    gender: str | None = None,
) -> dict | None:
    """
    Construct normalized offer dict.
    Returns None if price is missing/invalid or url is missing.
    Applies discount rule: keep compare_at_price only if > price.
    """
    parsed_price = parse_price(price)
    clean_url = str(url).strip() if url else ""
    if parsed_price is None or not clean_url:
        return None

    parsed_compare = parse_price(compare_at_price)
    discount_pct: int | None = None
    if parsed_compare is not None and parsed_compare > parsed_price:
        discount_pct = round((parsed_compare - parsed_price) / parsed_compare * 100)
    else:
        parsed_compare = None
        discount_pct = None

    offer: dict[str, Any] = {
        "store": store,
        "store_title": clean_text(store_title),
        "brand": canonical_brand(brand),
        "image_url": str(image_url).strip() if image_url else None,
        "price": parsed_price,
        "compare_at_price": parsed_compare,
        "discount_pct": discount_pct,
        "currency": currency.upper().strip(),
        "category": category,
        "sizes": [clean_text(s) for s in sizes] if sizes else [],
        "in_stock": in_stock,
        "url": clean_url,
    }
    if style_code:
        offer["style_code"] = str(style_code).strip()
    if colorway:
        offer["colorway"] = clean_text(colorway)
    if gender:
        offer["gender"] = clean_text(gender)

    return offer
