from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ContentContext:
    """Shared data populated by the extractor, consumed by analyzers."""

    url: str
    final_url: str
    domain: str
    title: str
    meta_description: str
    headings: list[dict]          # [{"level": 1, "text": "...", "order": 0}]
    content_text: str
    image_alts: list[str]
    internal_links: list[dict]    # [{"text": "...", "href": "...", "is_contextual": bool}]
    word_count: int
    has_schema_markup: bool = False
    target_keywords: list[str] = field(default_factory=list)
    country: str = ""
    language: str = ""
    extraction_warnings: list[str] = field(default_factory=list)
