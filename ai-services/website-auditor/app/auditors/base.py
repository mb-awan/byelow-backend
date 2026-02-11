from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol, runtime_checkable


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Category(str, Enum):
    TECHNICAL = "technical"
    SEO = "seo"
    PERFORMANCE = "performance"
    SECURITY = "security"
    ACCESSIBILITY = "accessibility"


@dataclass
class Issue:
    """A single detected issue."""

    name: str
    severity: Severity
    category: Category
    explanation: str
    recommendation: str


@dataclass
class AuditCheck:
    """Result of a single audit check within a category."""

    name: str
    passed: bool
    weight: float  # how many points this check is worth
    details: str = ""
    issues: list[Issue] = field(default_factory=list)


@dataclass
class AuditResult:
    """Aggregated result from one auditor (one category)."""

    category: Category
    checks: list[AuditCheck] = field(default_factory=list)

    @property
    def earned_points(self) -> float:
        return sum(c.weight for c in self.checks if c.passed)

    @property
    def total_points(self) -> float:
        return sum(c.weight for c in self.checks)

    @property
    def score(self) -> float:
        if self.total_points == 0:
            return 0.0
        return round((self.earned_points / self.total_points) * 100, 1)

    @property
    def issues(self) -> list[Issue]:
        all_issues: list[Issue] = []
        for check in self.checks:
            all_issues.extend(check.issues)
        return all_issues


@runtime_checkable
class Auditor(Protocol):
    """Contract that every category auditor must satisfy."""

    category: Category

    def audit(self, ctx: AuditContext) -> AuditResult: ...


@dataclass
class AuditContext:
    """Shared data bag populated by the fetcher, consumed by auditors."""

    url: str
    final_url: str
    status_code: int
    headers: dict[str, str] = field(default_factory=dict)
    redirect_chain: list[dict] = field(default_factory=list)
    html: str = ""
    html_size_bytes: int = 0
    ttfb: float = 0.0
    total_time: float = 0.0
    robots_txt: str | None = None
    sitemap_xml: str | None = None
    fetch_error: str | None = None
