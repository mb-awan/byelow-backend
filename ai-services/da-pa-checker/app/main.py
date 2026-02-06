import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.api.routes import router
from app.config import Settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Byelow SEO Authority Scorer")
    yield
    logger.info("Shutting down")


def create_app() -> FastAPI:
    settings = Settings()

    logger.remove()
    logger.add(sys.stderr, level="DEBUG" if settings.debug else "INFO")

    app = FastAPI(
        title=settings.app_name,
        description="Domain Authority & Page Authority — Custom Authority Score (Estimated)",
        lifespan=lifespan,
    )
    app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
