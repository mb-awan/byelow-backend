from __future__ import annotations

import re
from urllib.parse import parse_qs, unquote, urljoin, urlparse, urlunparse


class URLValidationError(Exception):
    pass


# Tracking/UTM parameters to strip during normalization
_TRACKING_PARAMS = frozenset(
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "utm_id", "fbclid", "gclid", "msclkid", "mc_eid", "ref", "_ga",
        "yclid", "twclid", "igshid", "li_fat_id",
    }
)


def validate_and_normalize(raw_url: str) -> str:
    """Validate and normalize a URL.

    - Accepts http/https schemes only.
    - Lowercases the host.
    - Removes fragments and tracking parameters.
    - Strips trailing slashes from the path (except root "/").
    - Prepends https:// when no scheme is provided.

    Returns the normalized URL string.
    Raises URLValidationError on invalid input.
    """
    raw_url = raw_url.strip()
    if not raw_url:
        raise URLValidationError("URL must not be empty")

    # Reject non-http/https schemes explicitly
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", raw_url) and not re.match(
        r"^https?://", raw_url, re.IGNORECASE
    ):
        scheme = raw_url.split("://")[0]
        raise URLValidationError(
            f"Invalid scheme '{scheme}'. Only http and https are allowed."
        )

    # Prepend scheme if missing
    if not re.match(r"^https?://", raw_url, re.IGNORECASE):
        raw_url = f"https://{raw_url}"

    parsed = urlparse(raw_url)

    if parsed.scheme.lower() not in ("http", "https"):
        raise URLValidationError(
            f"Invalid scheme '{parsed.scheme}'. Only http and https are allowed."
        )

    hostname = parsed.hostname
    if not hostname:
        raise URLValidationError("URL has no valid hostname")

    if not re.match(r"^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$", hostname):
        raise URLValidationError(f"Invalid hostname: {hostname}")

    scheme = parsed.scheme.lower()
    host = hostname.lower()
    port = f":{parsed.port}" if parsed.port and parsed.port not in (80, 443) else ""
    path = parsed.path.rstrip("/") or "/"
    query = parsed.query

    return urlunparse((scheme, f"{host}{port}", path, "", query, ""))


def normalize_for_dedup(url: str) -> str:
    """Normalize a URL for deduplication purposes.

    - Lowercases scheme and host
    - Strips tracking parameters
    - Removes fragments
    - Strips trailing slashes from path
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().lstrip("www.")
    path = parsed.path.rstrip("/") or "/"

    # Filter tracking params
    if parsed.query:
        from urllib.parse import urlencode
        params = parse_qs(parsed.query, keep_blank_values=True)
        clean = {k: v for k, v in params.items() if k.lower() not in _TRACKING_PARAMS}
        query = urlencode(clean, doseq=True) if clean else ""
    else:
        query = ""

    return urlunparse((parsed.scheme.lower(), host, path, "", query, ""))


def extract_domain(url: str) -> str:
    """Extract the registered domain (without www) from a URL."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    netloc = (parsed.hostname or "").lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


def decode_duckduckgo_redirect(href: str) -> str | None:
    """Decode a DuckDuckGo redirect URL to get the actual destination URL."""
    if not href:
        return None
    # DDG redirect format: /l/?uddg=ENCODED_URL&rut=...
    if href.startswith("/l/?") or "duckduckgo.com/l/?" in href:
        try:
            parsed = urlparse(href if href.startswith("http") else f"https://duckduckgo.com{href}")
            params = parse_qs(parsed.query)
            if "uddg" in params:
                return unquote(params["uddg"][0])
        except Exception:
            pass
        return None
    # Direct URL
    if href.startswith("http"):
        return href
    return None
