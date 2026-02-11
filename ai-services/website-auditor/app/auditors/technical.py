from __future__ import annotations

from app.auditors.base import (
    AuditCheck,
    AuditContext,
    AuditResult,
    Category,
    Issue,
    Severity,
)


class TechnicalAuditor:
    """Checks protocol-level health and delivery correctness (Plan §3)."""

    category = Category.TECHNICAL

    def audit(self, ctx: AuditContext) -> AuditResult:
        checks: list[AuditCheck] = []

        checks.append(self._check_status_code(ctx))
        checks.append(self._check_redirects(ctx))
        checks.append(self._check_https(ctx))
        checks.append(self._check_https_enforcement(ctx))
        checks.append(self._check_ttfb(ctx))
        checks.append(self._check_total_time(ctx))
        checks.append(self._check_compression(ctx))
        checks.append(self._check_server_header(ctx))

        return AuditResult(category=self.category, checks=checks)

    # ------------------------------------------------------------------

    @staticmethod
    def _check_status_code(ctx: AuditContext) -> AuditCheck:
        passed = 200 <= ctx.status_code < 400
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Non-success HTTP status",
                    severity=Severity.HIGH,
                    category=Category.TECHNICAL,
                    explanation=f"The page returned HTTP status {ctx.status_code}, which indicates an error or unexpected response.",
                    recommendation="Ensure the page returns a 200 OK status for normal content pages.",
                )
            )
        return AuditCheck(
            name="HTTP status code",
            passed=passed,
            weight=15,
            details=f"Status: {ctx.status_code}",
            issues=issues,
        )

    @staticmethod
    def _check_redirects(ctx: AuditContext) -> AuditCheck:
        count = len(ctx.redirect_chain)
        passed = count <= 2
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Excessive redirects",
                    severity=Severity.MEDIUM,
                    category=Category.TECHNICAL,
                    explanation=f"The page has {count} redirects before reaching the final URL. Excessive redirects slow down page delivery.",
                    recommendation="Reduce the redirect chain to at most 1-2 hops. Point links directly to the final URL.",
                )
            )
        return AuditCheck(
            name="Redirect chain",
            passed=passed,
            weight=10,
            details=f"{count} redirect(s)",
            issues=issues,
        )

    @staticmethod
    def _check_https(ctx: AuditContext) -> AuditCheck:
        passed = ctx.final_url.startswith("https://")
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="HTTPS not used",
                    severity=Severity.HIGH,
                    category=Category.TECHNICAL,
                    explanation="The final URL does not use HTTPS. Without HTTPS, data between the user and server is transmitted unencrypted.",
                    recommendation="Install an SSL/TLS certificate and serve the site over HTTPS.",
                )
            )
        return AuditCheck(
            name="HTTPS availability",
            passed=passed,
            weight=15,
            details=f"Final URL scheme: {'https' if passed else 'http'}",
            issues=issues,
        )

    @staticmethod
    def _check_https_enforcement(ctx: AuditContext) -> AuditCheck:
        """Check if HTTP redirects to HTTPS (only relevant if final URL is HTTPS)."""
        if not ctx.final_url.startswith("https://"):
            return AuditCheck(
                name="HTTP to HTTPS redirect",
                passed=False,
                weight=10,
                details="Site does not use HTTPS",
                issues=[
                    Issue(
                        name="No HTTP to HTTPS enforcement",
                        severity=Severity.HIGH,
                        category=Category.TECHNICAL,
                        explanation="The site does not enforce HTTPS. HTTP requests are not redirected to HTTPS.",
                        recommendation="Configure the server to redirect all HTTP requests to HTTPS (301 redirect).",
                    )
                ],
            )

        # If the original URL was HTTP and we ended up on HTTPS, enforcement works
        if ctx.url.startswith("http://") and ctx.final_url.startswith("https://"):
            return AuditCheck(
                name="HTTP to HTTPS redirect",
                passed=True,
                weight=10,
                details="HTTP correctly redirects to HTTPS",
            )

        # If original was already HTTPS, check redirect chain for http->https
        has_enforcement = any(
            r.get("url", "").startswith("http://") for r in ctx.redirect_chain
        )
        if ctx.url.startswith("https://") and not has_enforcement:
            # We can't verify enforcement since original request was HTTPS
            return AuditCheck(
                name="HTTP to HTTPS redirect",
                passed=True,
                weight=10,
                details="Site uses HTTPS (enforcement check requires HTTP request)",
            )

        return AuditCheck(
            name="HTTP to HTTPS redirect",
            passed=True,
            weight=10,
            details="HTTPS enforcement detected",
        )

    @staticmethod
    def _check_ttfb(ctx: AuditContext) -> AuditCheck:
        passed = ctx.ttfb < 0.8
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Slow Time to First Byte",
                    severity=Severity.MEDIUM,
                    category=Category.TECHNICAL,
                    explanation=f"TTFB is {ctx.ttfb:.2f}s. A TTFB above 0.8s indicates slow server response.",
                    recommendation="Optimize server-side processing, use caching, or consider a CDN to reduce TTFB.",
                )
            )
        return AuditCheck(
            name="Time to First Byte (TTFB)",
            passed=passed,
            weight=10,
            details=f"{ctx.ttfb:.3f}s",
            issues=issues,
        )

    @staticmethod
    def _check_total_time(ctx: AuditContext) -> AuditCheck:
        passed = ctx.total_time < 3.0
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Slow total response time",
                    severity=Severity.MEDIUM,
                    category=Category.TECHNICAL,
                    explanation=f"Total response time is {ctx.total_time:.2f}s. Responses above 3s indicate delivery issues.",
                    recommendation="Investigate server performance, network latency, and consider using a CDN.",
                )
            )
        return AuditCheck(
            name="Total response time",
            passed=passed,
            weight=10,
            details=f"{ctx.total_time:.3f}s",
            issues=issues,
        )

    @staticmethod
    def _check_compression(ctx: AuditContext) -> AuditCheck:
        encoding = ctx.headers.get("content-encoding", "").lower()
        passed = encoding in ("gzip", "br", "deflate")
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="No response compression",
                    severity=Severity.MEDIUM,
                    category=Category.TECHNICAL,
                    explanation="The server does not compress responses with gzip or brotli. Uncompressed responses increase transfer size and load time.",
                    recommendation="Enable gzip or brotli compression on the web server.",
                )
            )
        return AuditCheck(
            name="Compression support",
            passed=passed,
            weight=15,
            details=f"Content-Encoding: {encoding or 'none'}",
            issues=issues,
        )

    @staticmethod
    def _check_server_header(ctx: AuditContext) -> AuditCheck:
        server = ctx.headers.get("server", "")
        # Exposing detailed server version info is a minor concern
        has_version = False
        if server:
            import re

            has_version = bool(re.search(r"\d+\.\d+", server))

        passed = not has_version
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Server version exposed",
                    severity=Severity.LOW,
                    category=Category.TECHNICAL,
                    explanation=f"The Server header exposes version information: '{server}'. This may assist attackers in identifying known vulnerabilities.",
                    recommendation="Configure the server to hide or minimize version information in the Server header.",
                )
            )
        return AuditCheck(
            name="Server header inspection",
            passed=passed,
            weight=5,
            details=f"Server: {server or 'not set'}",
            issues=issues,
        )
