"""Registry of approved HTML scraper sources."""

from __future__ import annotations

from typing import Any, Callable
from sources import puma, sixpm, wellies

SOURCES: list[dict[str, Any]] = [
    {
        "id": "6pm",
        "name": "6pm",
        "base_url": "https://www.6pm.com",
        "currency": "USD",
        "scrape": sixpm.scrape,
    },
    {
        "id": "puma",
        "name": "Puma US",
        "base_url": "https://us.puma.com",
        "currency": "USD",
        "scrape": puma.scrape,
    },
    {
        "id": "wellies",
        "name": "Wellies.com",
        "base_url": "https://www.wellies.com",
        "currency": "GBP",
        "scrape": wellies.scrape,
    },
]
