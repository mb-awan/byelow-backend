from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DiscoveredCandidate:
    """A single URL that was discovered as a potential backlink source.

    At discovery time we do NOT know whether the page actually contains
    a link to the target — that is determined during verification.
    """

    url: str
    """The source URL that might link to the target domain."""

    source: str
    """Which discoverer found this URL: 'duckduckgo' | 'common_crawl' | 'direct'."""

    raw_snippet: str = ""
    """Optional context snippet from the discovery source (search snippet, etc.)."""


@dataclass
class DiscoveryResult:
    """Aggregate result from a single discoverer."""

    source: str
    candidates: list[DiscoveredCandidate] = field(default_factory=list)
    warning: str | None = None
    """Non-empty when the discoverer encountered an error or limitation."""
