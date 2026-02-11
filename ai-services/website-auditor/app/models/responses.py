from __future__ import annotations

from pydantic import BaseModel, Field


class IssueResponse(BaseModel):
    name: str
    severity: str
    category: str
    explanation: str
    recommendation: str


class CheckResponse(BaseModel):
    name: str
    passed: bool
    weight: float
    details: str = ""


class CategoryScoreResponse(BaseModel):
    category: str
    score: float = Field(ge=0, le=100)
    label: str
    earned_points: float
    total_points: float
    checks: list[CheckResponse]
    issues: list[IssueResponse]


class SummaryResponse(BaseModel):
    url: str
    final_url: str
    overall_score: float = Field(ge=0, le=100)
    overall_label: str
    total_issues: int
    issues_by_severity: dict[str, int]


class AuditReportResponse(BaseModel):
    summary: SummaryResponse
    categories: list[CategoryScoreResponse]
    all_issues: list[IssueResponse]


class AuditResponse(BaseModel):
    success: bool
    data: AuditReportResponse | None = None
    error: str | None = None
