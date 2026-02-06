import asyncio

from celery import Celery

from app.config import Settings

settings = Settings()

celery_app = Celery(
    "byelow_seo",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
)


@celery_app.task(name="analyze_url_task")
def analyze_url_task(url: str) -> dict:
    """Synchronous wrapper for running analysis in a Celery worker."""
    from app.core.orchestrator import AnalysisOrchestrator

    orchestrator = AnalysisOrchestrator(settings)
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(orchestrator.analyze(url))
        return result.model_dump()
    finally:
        loop.close()
