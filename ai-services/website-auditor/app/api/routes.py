from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import Settings
from app.core.orchestrator import AuditOrchestrator
from app.models.requests import AuditRequest
from app.models.responses import AuditResponse

router = APIRouter()


@router.post(
    "/audit",
    response_model=AuditResponse,
    response_model_exclude_none=True,
    summary="Audit a website (SEO + technical checks)",
    description=(
        "POST a target website URL to receive a structured audit report: "
        "overall score/label, issues grouped by category, and actionable recommendations."
    ),
    tags=["Website Auditor"],
)
async def audit_website(request: AuditRequest) -> AuditResponse:
    settings = Settings()
    orchestrator = AuditOrchestrator(settings)

    try:
        report = await orchestrator.run_audit(request.url)
        return AuditResponse(success=True, data=report)
    except Exception as exc:
        logger.exception(f"Audit failed for {request.url}")
        raise HTTPException(status_code=500, detail=str(exc))
