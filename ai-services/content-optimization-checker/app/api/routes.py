from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import Settings
from app.core.orchestrator import ContentOptimizationOrchestrator
from app.models.requests import OptimizeRequest
from app.models.responses import ContentOptimizeResponse

router = APIRouter()


@router.post(
    "/content-optimize",
    response_model=ContentOptimizeResponse,
    response_model_exclude_none=True,
    summary="Optimize webpage content for SEO",
    description=(
        "POST a webpage URL and optional keywords/country/language to get a structured "
        "content optimization report (intent detection, keyword placement, E-E-A-T signals, "
        "and rewrite/recommendation checklist)."
    ),
    tags=["Content Optimization"],
)
async def content_optimize(request: OptimizeRequest) -> ContentOptimizeResponse:
    """Analyze and optimize webpage content for SEO.

    Accepts a URL plus optional target keywords, country, and language.
    Returns a structured report (sections A–G) covering intent detection,
    keyword placement, content structure, E-E-A-T signals, and actionable
    recommendations.
    """
    settings = Settings()
    orchestrator = ContentOptimizationOrchestrator(settings)

    try:
        report = await orchestrator.optimize(
            url=request.url,
            keywords=request.keywords or [],
            country=request.country or "",
            language=request.language or "",
        )
        return ContentOptimizeResponse(success=True, data=report)
    except Exception as exc:
        logger.exception(f"Content optimization failed for {request.url}")
        raise HTTPException(status_code=500, detail=str(exc))
