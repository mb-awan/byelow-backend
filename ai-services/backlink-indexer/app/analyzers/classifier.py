"""Link classification utilities.

Given a parsed BeautifulSoup <a> tag and the surrounding page structure,
this module determines:

- link_type       : 'text' | 'image'
- link_position   : 'content' | 'header' | 'nav' | 'footer' | 'sidebar'
- rel_attributes  : list of rel values
- is_follow       : True when rel does NOT include 'nofollow'
- anchor_text     : visible text (or '[image]' for image links)
"""

from __future__ import annotations

from bs4 import BeautifulSoup, Tag


# Semantic HTML5 tags mapped to position labels
_TAG_POSITION_MAP: dict[str, str] = {
    "header": "header",
    "nav": "nav",
    "footer": "footer",
    "aside": "sidebar",
    "article": "content",
    "main": "content",
    "section": "content",
}

# Class / ID fragments that strongly indicate position
_HEADER_HINTS = frozenset({"header", "top-bar", "site-header", "navbar", "topnav"})
_NAV_HINTS = frozenset({"nav", "menu", "navigation", "breadcrumb", "toc"})
_FOOTER_HINTS = frozenset({"footer", "foot", "bottom", "copyright"})
_SIDEBAR_HINTS = frozenset({"sidebar", "aside", "widget", "side-bar", "rail"})


def _class_id_tokens(tag: Tag) -> set[str]:
    classes = tag.get("class") or []
    id_val = tag.get("id") or ""
    tokens: set[str] = set()
    for cls in classes:
        tokens.update(cls.lower().split("-"))
        tokens.add(cls.lower())
    for token in id_val.lower().split("-"):
        tokens.add(token)
    return tokens


def classify_link_position(link_tag: Tag) -> str:
    """Walk up the DOM tree from the <a> tag to determine link position."""
    parent = link_tag.parent
    while parent and parent.name not in ("[document]", "body", "html"):
        tag_name = getattr(parent, "name", "") or ""

        # Semantic tag check
        if tag_name in _TAG_POSITION_MAP:
            return _TAG_POSITION_MAP[tag_name]

        # Class/ID heuristic
        tokens = _class_id_tokens(parent)
        if tokens & _FOOTER_HINTS:
            return "footer"
        if tokens & _SIDEBAR_HINTS:
            return "sidebar"
        if tokens & _NAV_HINTS:
            return "nav"
        if tokens & _HEADER_HINTS:
            return "header"

        parent = parent.parent

    return "content"


def classify_link_type(link_tag: Tag) -> str:
    """Return 'image' if the link wraps an <img>, else 'text'."""
    return "image" if link_tag.find("img") else "text"


def extract_rel_attributes(link_tag: Tag) -> list[str]:
    """Extract the rel attribute values as a lowercase list."""
    raw = link_tag.get("rel", [])
    if isinstance(raw, str):
        raw = raw.split()
    return [r.lower() for r in raw]


def extract_anchor_text(link_tag: Tag, link_type: str) -> str:
    """Return visible anchor text, or '[image]' for image links."""
    if link_type == "image":
        img = link_tag.find("img")
        if img:
            alt = img.get("alt", "").strip()
            return f"[image: {alt}]" if alt else "[image]"
        return "[image]"
    return link_tag.get_text(separator=" ", strip=True) or ""
