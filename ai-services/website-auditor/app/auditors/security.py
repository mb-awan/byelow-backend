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


class SecurityAuditor:
    """Security & trust signal checks (Plan §6).

    Presence-based checks only — no policy strength evaluation.
    """

    category = Category.SECURITY

    def audit(self, ctx: AuditContext) -> AuditResult:
        checks: list[AuditCheck] = []

        checks.append(self._check_https(ctx))
        checks.append(self._check_mixed_content(ctx))
        checks.append(self._check_csp(ctx))
        checks.append(self._check_x_frame_options(ctx))
        checks.append(self._check_x_content_type_options(ctx))
        checks.append(self._check_referrer_policy(ctx))

        return AuditResult(category=self.category, checks=checks)

    # ------------------------------------------------------------------

    @staticmethod
    def _check_https(ctx: AuditContext) -> AuditCheck:
        passed = ctx.final_url.startswith("https://")
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Site not served over HTTPS",
                    severity=Severity.HIGH,
                    category=Category.SECURITY,
                    explanation="The site is served over plain HTTP. All data between users and the server is unencrypted and can be intercepted.",
                    recommendation="Obtain and install an SSL/TLS certificate. Serve all content over HTTPS.",
                )
            )
        return AuditCheck(
            name="HTTPS usage",
            passed=passed,
            weight=25,
            details="HTTPS" if passed else "HTTP only",
            issues=issues,
        )

    @staticmethod
    def _check_mixed_content(ctx: AuditContext) -> AuditCheck:
        if not ctx.final_url.startswith("https://") or not ctx.html:
            return AuditCheck(
                name="Mixed content",
                passed=True,
                weight=20,
                details="Not applicable (site not on HTTPS or no HTML)",
            )

        soup = parse_html(ctx.html)

        # Check for http:// references in src/href attributes on HTTPS pages
        mixed_elements: list[str] = []

        for tag in soup.find_all(["img", "script", "link", "video", "audio", "source", "iframe"]):
            src = tag.get("src") or tag.get("href") or ""
            if src.startswith("http://"):
                mixed_elements.append(f"<{tag.name}> → {src[:80]}")

        passed = len(mixed_elements) == 0
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Mixed content detected",
                    severity=Severity.HIGH,
                    category=Category.SECURITY,
                    explanation=f"Found {len(mixed_elements)} resource(s) loaded over HTTP on an HTTPS page. Mixed content can be blocked by browsers and compromises security.",
                    recommendation="Update all resource URLs to use HTTPS or protocol-relative URLs.",
                )
            )
        return AuditCheck(
            name="Mixed content",
            passed=passed,
            weight=20,
            details=f"{len(mixed_elements)} mixed content element(s)" if mixed_elements else "No mixed content",
            issues=issues,
        )

    @staticmethod
    def _check_csp(ctx: AuditContext) -> AuditCheck:
        csp = ctx.headers.get("content-security-policy", "")
        passed = bool(csp)
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing Content-Security-Policy header",
                    severity=Severity.MEDIUM,
                    category=Category.SECURITY,
                    explanation="The Content-Security-Policy (CSP) header is not set. CSP helps prevent XSS attacks by controlling which resources the browser can load.",
                    recommendation="Add a Content-Security-Policy header to restrict resource loading to trusted sources.",
                )
            )
        return AuditCheck(
            name="Content-Security-Policy",
            passed=passed,
            weight=15,
            details="Present" if passed else "Not set",
            issues=issues,
        )

    @staticmethod
    def _check_x_frame_options(ctx: AuditContext) -> AuditCheck:
        xfo = ctx.headers.get("x-frame-options", "")
        passed = bool(xfo)
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing X-Frame-Options header",
                    severity=Severity.MEDIUM,
                    category=Category.SECURITY,
                    explanation="The X-Frame-Options header is not set. Without it, the page can be embedded in iframes on other sites, which may enable clickjacking attacks.",
                    recommendation="Add an X-Frame-Options header with value DENY or SAMEORIGIN.",
                )
            )
        return AuditCheck(
            name="X-Frame-Options",
            passed=passed,
            weight=15,
            details=f"Value: {xfo}" if passed else "Not set",
            issues=issues,
        )

    @staticmethod
    def _check_x_content_type_options(ctx: AuditContext) -> AuditCheck:
        xcto = ctx.headers.get("x-content-type-options", "")
        passed = xcto.lower() == "nosniff"
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing X-Content-Type-Options header",
                    severity=Severity.LOW,
                    category=Category.SECURITY,
                    explanation="The X-Content-Type-Options header is not set to 'nosniff'. Without it, browsers may try to MIME-sniff the content type, which can lead to security issues.",
                    recommendation="Add the header: X-Content-Type-Options: nosniff",
                )
            )
        return AuditCheck(
            name="X-Content-Type-Options",
            passed=passed,
            weight=10,
            details=f"Value: {xcto}" if xcto else "Not set",
            issues=issues,
        )

    @staticmethod
    def _check_referrer_policy(ctx: AuditContext) -> AuditCheck:
        rp = ctx.headers.get("referrer-policy", "")
        passed = bool(rp)
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing Referrer-Policy header",
                    severity=Severity.LOW,
                    category=Category.SECURITY,
                    explanation="The Referrer-Policy header is not set. Without it, the browser uses the default policy, which may leak URL information to third-party sites.",
                    recommendation="Add a Referrer-Policy header (e.g., 'strict-origin-when-cross-origin' or 'no-referrer').",
                )
            )
        return AuditCheck(
            name="Referrer-Policy",
            passed=passed,
            weight=15,
            details=f"Value: {rp}" if passed else "Not set",
            issues=issues,
        )
