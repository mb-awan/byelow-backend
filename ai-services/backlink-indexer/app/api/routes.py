from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import Settings
from app.core.orchestrator import BacklinkIndexOrchestrator
from app.models.requests import BacklinkIndexRequest
from app.models.responses import BacklinkIndexResponse

router = APIRouter()


@router.post(
    "/backlink-index",
    response_model=BacklinkIndexResponse,
    response_model_exclude_none=True,
    summary="Discover and verify backlinks for a domain or URL",
    description=(
        "Discovers backlink candidates using DuckDuckGo and Common Crawl (free, "
        "no API key required), then verifies each candidate by fetching the source "
        "page and confirming the link exists. Returns a structured backlink index "
        "following professional SEO lifecycle standards."
    ),
)
async def backlink_index(request: BacklinkIndexRequest) -> BacklinkIndexResponse:
    settings = Settings()
    orchestrator = BacklinkIndexOrchestrator(settings)

    try:
        data = await orchestrator.analyze(
            url=request.url,
            max_backlinks=request.max_backlinks,
            verify=request.verify,
        )
        return BacklinkIndexResponse(success=True, data=data)
    except Exception as exc:
        logger.exception(f"Backlink indexing failed for {request.url}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
