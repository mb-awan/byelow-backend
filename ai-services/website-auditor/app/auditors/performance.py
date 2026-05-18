from __future__ import annotations

import re

from bs4 import BeautifulSoup
from html_parser import parse_html

from app.auditors.base import (
    AuditCheck,
    AuditContext,
    AuditResult,
    Category,
    Issue,
    Severity,
)


class PerformanceAuditor:
    """Lightweight HTML-based performance signals (Plan §5).

    No JavaScript execution or lab metrics — HTML analysis only.
    """

    category = Category.PERFORMANCE

    def audit(self, ctx: AuditContext) -> AuditResult:
        checks: list[AuditCheck] = []

        soup = parse_html(ctx.html) if ctx.html else None

        checks.append(self._check_html_size(ctx))
        checks.append(self._check_external_resources(soup))
        checks.append(self._check_blocking_scripts(soup))
        checks.append(self._check_image_formats(soup))

        return AuditResult(category=self.category, checks=checks)

    # ------------------------------------------------------------------

    @staticmethod
    def _check_html_size(ctx: AuditContext) -> AuditCheck:
        size_kb = ctx.html_size_bytes / 1024
        # HTML documents larger than 100KB are considered heavy
        passed = size_kb < 100
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Large HTML document",
                    severity=Severity.MEDIUM,
                    category=Category.PERFORMANCE,
                    explanation=f"The HTML document is {size_kb:.1f} KB. Large HTML documents increase download time and parsing overhead.",
                    recommendation="Reduce HTML size by removing unnecessary markup, inline styles, and inline scripts. Consider lazy loading or server-side rendering optimizations.",
                )
            )
        return AuditCheck(
            name="HTML document size",
            passed=passed,
            weight=20,
            details=f"{size_kb:.1f} KB",
            issues=issues,
        )

    @staticmethod
    def _check_external_resources(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="External resource count",
                passed=True,
                weight=25,
                details="No HTML to analyze",
            )

        css_count = len(soup.find_all("link", rel="stylesheet"))
        js_count = len(soup.find_all("script", src=True))
        img_count = len(soup.find_all("img", src=True))
        total = css_count + js_count + img_count

        # More than 50 external resources is heavy
        passed = total <= 50
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Too many external resources",
                    severity=Severity.MEDIUM,
                    category=Category.PERFORMANCE,
                    explanation=f"The page references {total} external resources ({css_count} CSS, {js_count} JS, {img_count} images). Each resource requires an HTTP request.",
                    recommendation="Combine and minify CSS/JS files, lazy-load images, and remove unused resources.",
                )
            )
        return AuditCheck(
            name="External resource count",
            passed=passed,
            weight=25,
            details=f"{total} total ({css_count} CSS, {js_count} JS, {img_count} images)",
            issues=issues,
        )

    @staticmethod
    def _check_blocking_scripts(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Render-blocking scripts",
                passed=True,
                weight=30,
                details="No HTML to analyze",
            )

        all_scripts = soup.find_all("script", src=True)
        blocking = []
        for script in all_scripts:
            has_async = script.has_attr("async")
            has_defer = script.has_attr("defer")
            has_module = script.get("type", "").lower() == "module"
            if not (has_async or has_defer or has_module):
                src = script.get("src", "")
                blocking.append(src)

        passed = len(blocking) == 0
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Render-blocking scripts detected",
                    severity=Severity.MEDIUM,
                    category=Category.PERFORMANCE,
                    explanation=f"Found {len(blocking)} script(s) without async or defer attributes. These scripts block page rendering until they are downloaded and executed.",
                    recommendation="Add 'async' or 'defer' attributes to script tags that don't need to run immediately, or move them to the end of the body.",
                )
            )
        return AuditCheck(
            name="Render-blocking scripts",
            passed=passed,
            weight=30,
            details=f"{len(blocking)} blocking script(s) out of {len(all_scripts)} total",
            issues=issues,
        )

    @staticmethod
    def _check_image_formats(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Image format usage",
                passed=True,
                weight=25,
                details="No HTML to analyze",
            )

        images = soup.find_all("img", src=True)
        format_counts: dict[str, int] = {}
        for img in images:
            src = img["src"].lower().split("?")[0]  # Remove query params
            ext_match = re.search(r"\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)$", src)
            if ext_match:
                ext = ext_match.group(1)
                if ext == "jpeg":
                    ext = "jpg"
                format_counts[ext] = format_counts.get(ext, 0) + 1
            else:
                format_counts["other"] = format_counts.get("other", 0) + 1

        total_images = len(images)
        modern_count = format_counts.get("webp", 0) + format_counts.get("avif", 0) + format_counts.get("svg", 0)
        legacy_count = format_counts.get("jpg", 0) + format_counts.get("png", 0) + format_counts.get("bmp", 0)

        # Pass if no images, or if at least some modern formats are used
        if total_images == 0:
            return AuditCheck(
                name="Image format usage",
                passed=True,
                weight=25,
                details="No images found",
            )

        modern_ratio = modern_count / total_images if total_images > 0 else 0
        passed = modern_ratio >= 0.3 or legacy_count == 0
        issues: list[Issue] = []
        if not passed:
            format_details = ", ".join(f"{k}: {v}" for k, v in sorted(format_counts.items()))
            issues.append(
                Issue(
                    name="Legacy image formats dominant",
                    severity=Severity.LOW,
                    category=Category.PERFORMANCE,
                    explanation=f"Only {modern_count}/{total_images} images use modern formats (WebP/AVIF/SVG). Legacy formats (JPG/PNG) are larger and slower to load.",
                    recommendation="Convert images to WebP or AVIF format for better compression and faster loading.",
                )
            )

        format_summary = ", ".join(f"{k}: {v}" for k, v in sorted(format_counts.items()))
        return AuditCheck(
            name="Image format usage",
            passed=passed,
            weight=25,
            details=f"{total_images} images ({format_summary})",
            issues=issues,
        )
