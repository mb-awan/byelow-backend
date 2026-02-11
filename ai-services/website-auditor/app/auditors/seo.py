from __future__ import annotations

from bs4 import BeautifulSoup

from app.auditors.base import (
    AuditCheck,
    AuditContext,
    AuditResult,
    Category,
    Issue,
    Severity,
)


class SEOAuditor:
    """Checks page structure and metadata for SEO best practices (Plan §4)."""

    category = Category.SEO

    def audit(self, ctx: AuditContext) -> AuditResult:
        checks: list[AuditCheck] = []

        soup = BeautifulSoup(ctx.html, "lxml") if ctx.html else None

        checks.append(self._check_title(soup))
        checks.append(self._check_meta_description(soup))
        checks.append(self._check_h1(soup))
        checks.append(self._check_canonical(soup))
        checks.append(self._check_robots_meta(soup))
        checks.append(self._check_robots_txt(ctx))
        checks.append(self._check_sitemap(ctx))

        return AuditResult(category=self.category, checks=checks)

    # ------------------------------------------------------------------

    @staticmethod
    def _check_title(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Page title",
                passed=False,
                weight=20,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing page title",
                        severity=Severity.HIGH,
                        category=Category.SEO,
                        explanation="Could not parse HTML to check for a title tag.",
                        recommendation="Ensure the page returns valid HTML with a <title> tag.",
                    )
                ],
            )

        title_tag = soup.find("title")
        if not title_tag or not title_tag.get_text(strip=True):
            return AuditCheck(
                name="Page title",
                passed=False,
                weight=20,
                details="Title tag missing or empty",
                issues=[
                    Issue(
                        name="Missing page title",
                        severity=Severity.HIGH,
                        category=Category.SEO,
                        explanation="The page does not have a <title> tag or it is empty. The title is a critical element for search engines and browser tabs.",
                        recommendation="Add a descriptive <title> tag between 30 and 60 characters.",
                    )
                ],
            )

        title_text = title_tag.get_text(strip=True)
        title_len = len(title_text)
        length_ok = 10 <= title_len <= 70
        issues: list[Issue] = []
        if not length_ok:
            issues.append(
                Issue(
                    name="Title length issue",
                    severity=Severity.LOW,
                    category=Category.SEO,
                    explanation=f"Title is {title_len} characters. Titles shorter than 10 or longer than 70 characters may not display well in search results.",
                    recommendation="Keep the title between 30 and 60 characters for optimal display.",
                )
            )
        return AuditCheck(
            name="Page title",
            passed=True,
            weight=20,
            details=f"Title ({title_len} chars): {title_text[:80]}",
            issues=issues,
        )

    @staticmethod
    def _check_meta_description(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Meta description",
                passed=False,
                weight=15,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing meta description",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="Could not parse HTML to check for a meta description.",
                        recommendation="Ensure the page returns valid HTML with a meta description tag.",
                    )
                ],
            )

        meta = soup.find("meta", attrs={"name": "description"})
        if not meta:
            # Also check case-insensitive
            meta = soup.find("meta", attrs={"name": lambda v: v and v.lower() == "description"})

        if not meta or not meta.get("content", "").strip():
            return AuditCheck(
                name="Meta description",
                passed=False,
                weight=15,
                details="Meta description missing or empty",
                issues=[
                    Issue(
                        name="Missing meta description",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="The page does not have a meta description. Search engines often use the meta description as the snippet in results.",
                        recommendation="Add a meta description tag with 120-160 characters summarizing the page content.",
                    )
                ],
            )

        content = meta["content"].strip()
        desc_len = len(content)
        length_ok = 50 <= desc_len <= 160
        issues: list[Issue] = []
        if not length_ok:
            issues.append(
                Issue(
                    name="Meta description length issue",
                    severity=Severity.LOW,
                    category=Category.SEO,
                    explanation=f"Meta description is {desc_len} characters. Descriptions outside 50-160 characters may be truncated or ignored.",
                    recommendation="Keep the meta description between 120 and 160 characters.",
                )
            )
        return AuditCheck(
            name="Meta description",
            passed=True,
            weight=15,
            details=f"Description ({desc_len} chars): {content[:100]}",
            issues=issues,
        )

    @staticmethod
    def _check_h1(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="H1 tag",
                passed=False,
                weight=15,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing H1 tag",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="Could not parse HTML to check for an H1 tag.",
                        recommendation="Ensure the page returns valid HTML with an <h1> heading.",
                    )
                ],
            )

        h1_tags = soup.find_all("h1")
        if not h1_tags:
            return AuditCheck(
                name="H1 tag",
                passed=False,
                weight=15,
                details="No H1 tag found",
                issues=[
                    Issue(
                        name="Missing H1 tag",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="The page does not have an <h1> heading. H1 tags help define the main topic of the page.",
                        recommendation="Add a single <h1> tag that describes the main content of the page.",
                    )
                ],
            )

        issues: list[Issue] = []
        if len(h1_tags) > 1:
            issues.append(
                Issue(
                    name="Multiple H1 tags",
                    severity=Severity.LOW,
                    category=Category.SEO,
                    explanation=f"The page has {len(h1_tags)} H1 tags. While not strictly an error, a single H1 is generally preferred.",
                    recommendation="Use a single H1 tag for the main heading. Use H2-H6 for subheadings.",
                )
            )

        h1_text = h1_tags[0].get_text(strip=True)
        return AuditCheck(
            name="H1 tag",
            passed=True,
            weight=15,
            details=f"{len(h1_tags)} H1 tag(s). First: {h1_text[:80]}",
            issues=issues,
        )

    @staticmethod
    def _check_canonical(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Canonical tag",
                passed=False,
                weight=15,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing canonical tag",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="Could not parse HTML to check for a canonical tag.",
                        recommendation="Ensure the page returns valid HTML with a canonical link tag.",
                    )
                ],
            )

        canonical = soup.find("link", attrs={"rel": "canonical"})
        if not canonical or not canonical.get("href", "").strip():
            return AuditCheck(
                name="Canonical tag",
                passed=False,
                weight=15,
                details="No canonical tag found",
                issues=[
                    Issue(
                        name="Missing canonical tag",
                        severity=Severity.MEDIUM,
                        category=Category.SEO,
                        explanation="The page does not specify a canonical URL. Without a canonical tag, search engines may treat duplicate URLs as separate pages.",
                        recommendation='Add a <link rel="canonical" href="..."> tag pointing to the preferred URL.',
                    )
                ],
            )

        href = canonical["href"].strip()
        return AuditCheck(
            name="Canonical tag",
            passed=True,
            weight=15,
            details=f"Canonical: {href[:100]}",
        )

    @staticmethod
    def _check_robots_meta(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Robots meta tag",
                passed=False,
                weight=5,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing robots meta tag",
                        severity=Severity.LOW,
                        category=Category.SEO,
                        explanation="Could not parse HTML to check for robots meta tag.",
                        recommendation="Ensure the page returns valid HTML.",
                    )
                ],
            )

        robots = soup.find("meta", attrs={"name": "robots"})
        if not robots:
            robots = soup.find(
                "meta", attrs={"name": lambda v: v and v.lower() == "robots"}
            )

        if not robots:
            return AuditCheck(
                name="Robots meta tag",
                passed=True,
                weight=5,
                details="No robots meta tag (defaults to index, follow)",
            )

        content = robots.get("content", "").lower()
        issues: list[Issue] = []
        if "noindex" in content:
            issues.append(
                Issue(
                    name="Page set to noindex",
                    severity=Severity.HIGH,
                    category=Category.SEO,
                    explanation="The robots meta tag contains 'noindex', which tells search engines not to index this page.",
                    recommendation="Remove 'noindex' if this page should appear in search results.",
                )
            )

        return AuditCheck(
            name="Robots meta tag",
            passed="noindex" not in content,
            weight=5,
            details=f"Robots: {content or 'empty'}",
            issues=issues,
        )

    @staticmethod
    def _check_robots_txt(ctx: AuditContext) -> AuditCheck:
        passed = ctx.robots_txt is not None
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing robots.txt",
                    severity=Severity.LOW,
                    category=Category.SEO,
                    explanation="No robots.txt file was found. While not required, robots.txt helps guide search engine crawlers.",
                    recommendation="Create a robots.txt file at the site root to control crawler access.",
                )
            )
        return AuditCheck(
            name="robots.txt availability",
            passed=passed,
            weight=5,
            details="Found" if passed else "Not found",
            issues=issues,
        )

    @staticmethod
    def _check_sitemap(ctx: AuditContext) -> AuditCheck:
        passed = ctx.sitemap_xml is not None
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing sitemap.xml",
                    severity=Severity.LOW,
                    category=Category.SEO,
                    explanation="No sitemap.xml was found at the default location. A sitemap helps search engines discover and index pages.",
                    recommendation="Create a sitemap.xml and submit it to search engines.",
                )
            )
        return AuditCheck(
            name="sitemap.xml availability",
            passed=passed,
            weight=5,
            details="Found" if passed else "Not found",
            issues=issues,
        )
