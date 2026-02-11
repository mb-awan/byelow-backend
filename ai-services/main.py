"""
Unified AI Services — DA/PA checker and Website Auditor on port 8000.

Mounts both services under /api/v1:
  - POST /api/v1/analyze  (DA/PA)
  - POST /api/v1/audit   (Website Auditor)
"""
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

_base = os.path.dirname(os.path.abspath(__file__))
_da_path = os.path.join(_base, "da-pa-checker")
_auditor_path = os.path.join(_base, "website-auditor")

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Byelow AI Services (DA/PA + Website Auditor)")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Byelow AI Services",
    description="Domain/Page Authority analysis and Website Auditor — both on /api/v1.",
    lifespan=lifespan,
)
app.include_router(da_pa_router, prefix="/api/v1")
app.include_router(auditor_router, prefix="/api/v1")
