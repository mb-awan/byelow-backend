import asyncio
from datetime import datetime, timezone

from loguru import logger

from app.analyzers.base import AnalysisContext


class WhoisCollector:
    async def collect(self, ctx: AnalysisContext) -> None:
        try:
            import whois  # lazy import — keeps startup fast

            w = await asyncio.to_thread(whois.whois, ctx.domain)

            creation = w.creation_date
            if isinstance(creation, list):
                creation = creation[0]
            if isinstance(creation, datetime):
                if creation.tzinfo is None:
                    creation = creation.replace(tzinfo=timezone.utc)
                ctx.domain_age_days = (
                    datetime.now(timezone.utc) - creation
                ).days

            ctx.registrar = w.registrar
            ctx.whois_raw = {
                "creation_date": str(creation) if creation else None,
                "registrar": w.registrar,
                "name_servers": (
                    list(w.name_servers) if w.name_servers else []
                ),
            }
        except Exception as exc:
            logger.warning(f"WHOIS lookup failed for {ctx.domain}: {exc}")
