from __future__ import annotations

from loguru import logger

from app.auditors.accessibility import AccessibilityAuditor
from app.auditors.base import AuditContext, AuditResult, Category, Issue
from app.auditors.performance import PerformanceAuditor
from app.auditors.security import SecurityAuditor
from app.auditors.seo import SEOAuditor
from app.auditors.technical import TechnicalAuditor
from app.config import Settings
from app.core.fetcher import fetch_page
from app.core.scoring import compute_category_score, compute_overall_score, score_label
from app.models.responses import (
    AuditReportResponse,
    CategoryScoreResponse,
    CheckResponse,
    IssueResponse,
    SummaryResponse,
)


class AuditOrchestrator:
    """Coordinates page fetching, auditing, scoring, and report assembly."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.auditors = [
            TechnicalAuditor(),
            SEOAuditor(),
            PerformanceAuditor(),
            SecurityAuditor(),
            AccessibilityAuditor(),
        ]

    async def run_audit(self, url: str) -> AuditReportResponse:
        """Run a full audit on the given URL and return a structured report."""

        # Phase 1: Fetch the page
        logger.info(f"Fetching page: {url}")
        fetch_result = await fetch_page(url, self.settings)

        if fetch_result.error and fetch_result.status_code == 0:
            # Total fetch failure — return a minimal report with error context
            logger.error(f"Fetch failed for {url}: {fetch_result.error}")
            raise RuntimeError(
                f"Could not fetch the page: {fetch_result.error}"
            )

        # Build the shared audit context from fetch results
        ctx = AuditContext(
            url=url,
            final_url=fetch_result.final_url or url,
            status_code=fetch_result.status_code,
            headers=fetch_result.headers,
            redirect_chain=fetch_result.redirect_chain,
            html=fetch_result.html,
            html_size_bytes=fetch_result.html_size_bytes,
            ttfb=fetch_result.ttfb,
            total_time=fetch_result.total_time,
            robots_txt=fetch_result.robots_txt,
            sitemap_xml=fetch_result.sitemap_xml,
            fetch_error=fetch_result.error,
        )

        logger.info(
            f"Page fetched: status={ctx.status_code}, "
            f"size={ctx.html_size_bytes}B, ttfb={ctx.ttfb}s"
        )

        # Phase 2: Run all auditors
        audit_results: list[AuditResult] = []
        for auditor in self.auditors:
            try:
                result = auditor.audit(ctx)
                audit_results.append(result)
                logger.info(
                    f"{result.category.value} audit: {result.score}/100 "
                    f"({result.earned_points}/{result.total_points} pts)"
                )
            except Exception as exc:
                logger.exception(
                    f"Auditor {auditor.category.value} failed: {exc}"
                )

        # Phase 3: Compute scores
        category_scores: dict[Category, float] = {}
        for result in audit_results:
            category_scores[result.category] = compute_category_score(result)

        overall_score = compute_overall_score(category_scores)
        overall_label = score_label(overall_score)

        # Phase 4: Assemble the report
        all_issues: list[Issue] = []
        category_responses: list[CategoryScoreResponse] = []

        for result in audit_results:
            cat_issues = result.issues
            all_issues.extend(cat_issues)

            category_responses.append(
                CategoryScoreResponse(
                    category=result.category.value,
                    score=result.score,
                    label=score_label(result.score),
                    earned_points=result.earned_points,
                    total_points=result.total_points,
                    checks=[
                        CheckResponse(
                            name=c.name,
                            passed=c.passed,
                            weight=c.weight,
                            details=c.details,
                        )
                        for c in result.checks
                    ],
                    issues=[
                        IssueResponse(
                            name=i.name,
                            severity=i.severity.value,
                            category=i.category.value,
                            explanation=i.explanation,
                            recommendation=i.recommendation,
                        )
                        for i in cat_issues
                    ],
                )
            )

        # Count issues by severity
        severity_counts: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        for issue in all_issues:
            severity_counts[issue.severity.value] = (
                severity_counts.get(issue.severity.value, 0) + 1
            )

        all_issue_responses = [
            IssueResponse(
                name=i.name,
                severity=i.severity.value,
                category=i.category.value,
                explanation=i.explanation,
                recommendation=i.recommendation,
            )
            for i in all_issues
        ]

        summary = SummaryResponse(
            url=url,
            final_url=ctx.final_url,
            overall_score=overall_score,
            overall_label=overall_label,
            total_issues=len(all_issues),
            issues_by_severity=severity_counts,
        )

        logger.info(
            f"Audit complete for {url}: score={overall_score} "
            f"({overall_label}), {len(all_issues)} issue(s)"
        )

        return AuditReportResponse(
            summary=summary,
            categories=category_responses,
            all_issues=all_issue_responses,
        )
