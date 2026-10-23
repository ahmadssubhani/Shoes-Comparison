"""Normalization and matching logic for offers across sources."""

from __future__ import annotations

import html
import json
import os
import re
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

PUNCT_RE = re.compile(r"[^a-z0-9\s]+")
SPACE_RE = re.compile(r"\s+")
PAREN_RE = re.compile(r"\([^)]*\)")

AUDIENCE_WORDS_MEN = {"men", "mens", "man", "mans", "male"}
AUDIENCE_WORDS_WOMEN = {"women", "womens", "woman", "womans", "female", "ladies", "lady", "wmns", "wmn"}
AUDIENCE_WORDS_KIDS = {
    "kids",
    "kid",
    "children",
    "child",
    "boys",
    "boy",
    "girls",
    "girl",
    "youth",
    "toddler",
    "infant",
    "baby",
    "preschool",
    "gs",
    "ps",
    "td",
}

DROP_WORDS_MODEL = {
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "boot",
    "boots",
    "welly",
    "wellies",
    "cleat",
    "cleats",
    "sandal",
    "sandals",
    "slide",
    "slides",
    "slipper",
    "slippers",
    "trainer",
    "trainers",
    "clog",
    "clogs",
    "footwear",
    "soccer",
    "ground",
    "firm",
    "artificial",
    "turf",
    "indoor",
    "court",
    "road",
    "trail",
    "running",
    "athletic",
    "walking",
    "casual",
    "men",
    "mens",
    "man",
    "mans",
    "male",
    "women",
    "womens",
    "woman",
    "womans",
    "female",
    "ladies",
    "lady",
    "wmns",
    "wmn",
    "kids",
    "kid",
    "boys",
    "boy",
    "girls",
    "girl",
    "youth",
    "child",
    "children",
    "toddler",
    "pro",
    "play",
    "match",
    "ultimate",
    "elite",
    "team",
    "training",
    "cross",
    "road",
    "update",
    "ls",
    "v6",
    "standard",
    "classic",
    "puma",
    "nike",
    "adidas",
    "wellies",
    "under",
    "armour",
    "crocs",
    "clarks",
    "florsheim",
    "brogini",
    "lemieux",
    "skechers",
    "asics",
    "saucony",
    "vans",
    "salomon",
    "merrell",
    "hoka",
    "brooks",
    "converse",
    "reebok",
}

COLOR_DROP_WORDS = {
    "puma",
    "nike",
    "adidas",
    "color",
    "colour",
    "and",
    "with",
    "the",
}

COLOR_SYNONYMS = {
    "grey": "gray",
    "blk": "black",
    "wht": "white",
}


def detect_audience(offer: dict[str, Any]) -> str:
    """Detect audience (men, women, kids, or unisex) from gender attribute, title, or URL."""
    gender = str(offer.get("gender") or "").lower()
    if gender:
        if any(w in gender for w in AUDIENCE_WORDS_KIDS):
            return "kids"
        if any(w in gender for w in AUDIENCE_WORDS_WOMEN):
            return "women"
        if any(w in gender for w in AUDIENCE_WORDS_MEN):
            return "men"

    text = f"{offer.get('store_title') or ''} {offer.get('url') or ''}".lower()
    text = html.unescape(text)
    text = re.sub(r"['’]s\b", "", text)
    text = PUNCT_RE.sub(" ", text)
    tokens = set(SPACE_RE.split(text))

    if tokens & AUDIENCE_WORDS_KIDS:
        return "kids"
    if tokens & AUDIENCE_WORDS_WOMEN:
        return "women"
    if tokens & AUDIENCE_WORDS_MEN:
        return "men"
    return "unisex"


def normalize_colorway(colorway: str | None) -> str:
    """Normalize colorway: lowercase, remove punctuation, drop brand words, normalize synonyms, sort tokens."""
    if not colorway:
        return ""
    text = html.unescape(str(colorway)).lower()
    text = re.sub(r"['’]s\b", "", text)
    text = PUNCT_RE.sub(" ", text)
    raw_tokens = [w for w in SPACE_RE.split(text) if w and w not in COLOR_DROP_WORDS]
    tokens = [COLOR_SYNONYMS.get(w, w) for w in raw_tokens]
    unique_tokens = sorted(list(dict.fromkeys(tokens)))
    return " ".join(unique_tokens)


def extract_model(title: str | None, brand: str | None, colorway: str | None = None) -> str:
    """Extract core model silhouette by stripping brand, audience, footwear filler, and punctuation."""
    text = (title or "").lower().replace("&", " and ")
    text = html.unescape(text)
    text = re.sub(r"&#8482;|&trade;", "", text)
    text = PAREN_RE.sub(" ", text)

    # If title has " - Color / Color", split it
    if " - " in text:
        head, tail = text.split(" - ", 1)
        if "/" in tail or len(tail.split()) <= 5:
            text = head

    # Remove "in <Color>"
    text = re.sub(r"\bin\s+[a-z\s]+$", "", text, flags=re.I)

    # Strip 's or ’s before stripping punctuation
    text = re.sub(r"['’]s\b", "", text)

    # Strip brand words
    brand_word = (brand or "").lower().strip()
    if brand_word:
        text = re.sub(rf"\b{re.escape(brand_word)}\b", " ", text, flags=re.I)

    # Replace punctuation with spaces
    text = PUNCT_RE.sub(" ", text)
    tokens = SPACE_RE.split(text)

    # Filter out drop words
    clean_words = [w for w in tokens if w and w not in DROP_WORDS_MODEL and w != brand_word]
    return " ".join(clean_words)


def match_key(offer: dict[str, Any]) -> str:
    """
    Construct canonical match key:
    brand + audience + model + colorway (if present).
    When Puma style code is present, it identifies Puma-store models.
    Never merges different colorways or kids vs adult versions.
    """
    brand = (offer.get("brand") or "").strip().lower()
    audience = detect_audience(offer)
    colorway = normalize_colorway(offer.get("colorway"))
    model = extract_model(offer.get("store_title"), brand, colorway)

    key = f"{brand}|{audience}|{model}|{colorway}"
    return key


def group_offers(offers: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """
    Group offers by match key.
    Enforces currency isolation (USD vs GBP never merged).
    Never merges different colorways or kids vs adult versions.
    """
    grouped: dict[str, list[dict[str, Any]]] = {}

    for offer in offers:
        key = match_key(offer)
        curr = offer.get("currency") or "USD"
        # Currency isolation so different currencies are never mixed
        key = f"{key}|{curr}"
        offer["match_key"] = key

        # If two offers from Puma have different style codes, keep them separate
        style_code = offer.get("style_code")
        if offer.get("store") == "puma" and style_code:
            existing = grouped.get(key, [])
            # If an existing puma offer has a DIFFERENT style code, adjust key to prevent collision
            conflict = any(
                o.get("store") == "puma" and o.get("style_code") and o.get("style_code") != style_code
                for o in existing
            )
            if conflict:
                key = f"{key}|{style_code}"
                offer["match_key"] = key

        grouped.setdefault(key, []).append(offer)

    return apply_optional_llm_matching(grouped)

    return apply_optional_llm_matching(grouped)


def apply_optional_llm_matching(grouped: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Optional Gemini pass for leftover singleton titles. Off unless USE_LLM_MATCHING=true."""
    flag = (os.getenv("USE_LLM_MATCHING") or "false").strip().lower()
    if flag not in {"1", "true", "yes"}:
        return grouped
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        print("USE_LLM_MATCHING is on but GEMINI_API_KEY is empty; skipping LLM matching.")
        return grouped

    unmatched = [
        key for key, group in grouped.items() if len({offer.get("store") for offer in group}) < 2
    ]
    if not unmatched:
        return grouped

    sample = unmatched[:40]
    payload_rows = []
    for key in sample:
        offer = grouped[key][0]
        payload_rows.append(
            {
                "match_key": key,
                "brand": offer.get("brand"),
                "title": offer.get("store_title"),
                "currency": offer.get("currency"),
            }
        )
    prompt = (
        "These shoe listings were not matched across stores. Only match if they have the same currency. "
        "Return JSON only: a list of objects {\"from\": match_key, \"to\": match_key} "
        "when two rows are the same product silhouette. If none, return [].\n"
        + json.dumps(payload_rows)
    )
    try:
        pairs = _gemini_match_pairs(prompt, api_key)
    except (URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        print(f"LLM matching skipped: {exc}")
        return grouped

    for pair in pairs:
        src = pair.get("from")
        dest = pair.get("to")
        if src not in grouped or dest not in grouped or src == dest:
            continue
        # Check currency compatibility
        if grouped[src][0].get("currency") != grouped[dest][0].get("currency"):
            continue
        grouped[dest].extend(grouped.pop(src))
        for offer in grouped[dest]:
            offer["match_key"] = dest

    return grouped


def _gemini_match_pairs(prompt: str, api_key: str) -> list[dict]:
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={api_key}"
    )
    req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    parsed = json.loads(text)
    if not isinstance(parsed, list):
        return []
    return [row for row in parsed if isinstance(row, dict)]

