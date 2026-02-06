from urllib.parse import urlparse


def parse_url(url: str) -> tuple[str, str, str]:
    """Return (scheme, domain, path) from a URL string.

    Handles bare domains (no scheme) by defaulting to ``https``.
    Strips ``www.`` prefix from the domain.
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    parsed = urlparse(url)
    scheme = parsed.scheme or "https"
    domain = (parsed.hostname or "").lower().removeprefix("www.")
    path = parsed.path or "/"
    return scheme, domain, path
