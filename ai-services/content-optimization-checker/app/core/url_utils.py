from __future__ import annotations

import re
from urllib.parse import urlparse, urlunparse


class URLValidationError(Exception):
    pass


def validate_and_normalize(raw_url: str) -> str:
    """Validate and normalize a URL.

    - Accepts http/https schemes only.
    - Lowercases the host.
    - Removes fragments.
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
