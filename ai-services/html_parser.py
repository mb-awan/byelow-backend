"""BeautifulSoup HTML parsing with lxml when available, html.parser fallback otherwise."""
from __future__ import annotations

from bs4 import BeautifulSoup

_CACHED_PARSER: str | None = None


def get_html_parser() -> str:
    global _CACHED_PARSER
    if _CACHED_PARSER is not None:
        return _CACHED_PARSER
    try:
        import lxml  # noqa: F401

        BeautifulSoup("<html></html>", "lxml")
        _CACHED_PARSER = "lxml"
    except Exception:
        _CACHED_PARSER = "html.parser"
    return _CACHED_PARSER


def parse_html(html: str) -> BeautifulSoup:
    if not html:
        return BeautifulSoup("", get_html_parser())
    return BeautifulSoup(html, get_html_parser())
