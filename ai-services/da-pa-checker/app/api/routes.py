from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import Settings
from app.core.orchestrator import AnalysisOrchestrator
from app.models.requests import AnalyzeRequest
from app.models.responses import AnalyzeResponse

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse, response_model_exclude_none=True)
async def analyze_url(request: AnalyzeRequest) -> AnalyzeResponse:
    settings = Settings()
    orchestrator = AnalysisOrchestrator(settings)

    try:
        result = await orchestrator.analyze(request.url)
        return AnalyzeResponse(success=True, data=result)
    except Exception as exc:
        logger.exception(f"Analysis failed for {request.url}")
        raise HTTPException(status_code=500, detail=str(exc))
