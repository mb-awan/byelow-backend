"""
Unified AI Services — DA/PA checker, Website Auditor, and Content Optimizer on port 8000.

Mounts all services under /api/v1:
  - POST /api/v1/analyze          (DA/PA checker)
  - POST /api/v1/audit            (Website Auditor)
  - POST /api/v1/content-optimize (Content Optimization Checker)
"""
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

_base = os.path.dirname(os.path.abspath(__file__))
_da_path = os.path.join(_base, "da-pa-checker")
_auditor_path = os.path.join(_base, "website-auditor")
_content_path = os.path.join(_base, "content-optimization-checker")

# Load DA/PA router
sys.path.insert(0, _da_path)
from app.api.routes import router as da_pa_router

# Clear app from sys.modules so the next import uses website-auditor's app
for key in list(sys.modules):
    if key == "app" or key.startswith("app."):
        del sys.modules[key]

# Load Website Auditor router
sys.path.insert(0, _auditor_path)
from app.api.routes import router as auditor_router

# Clear app from sys.modules so the next import uses content-optimization-checker's app
for key in list(sys.modules):
    if key == "app" or key.startswith("app."):
        del sys.modules[key]

# Load Content Optimization Checker router
sys.path.insert(0, _content_path)
from app.api.routes import router as content_optimizer_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Byelow AI Services (DA/PA + Website Auditor + Content Optimizer)")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Byelow AI Services",
    description=(
        "Domain/Page Authority analysis, Website Auditor, and "
        "Content Optimization Checker — all on /api/v1."
    ),
    lifespan=lifespan,
)
app.include_router(da_pa_router, prefix="/api/v1")
app.include_router(auditor_router, prefix="/api/v1")
app.include_router(content_optimizer_router, prefix="/api/v1")
