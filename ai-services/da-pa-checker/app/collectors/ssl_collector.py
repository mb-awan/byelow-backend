import asyncio
import ssl
from datetime import datetime, timezone

from loguru import logger

from app.analyzers.base import AnalysisContext


class SslCollector:
    async def collect(self, ctx: AnalysisContext) -> None:
        if ctx.scheme != "https":
            ctx.ssl_valid = False
            return

        try:
            cert_info = await asyncio.to_thread(
                self._get_cert, ctx.domain
            )
            if cert_info is None:
                ctx.ssl_valid = False
                return

            ctx.ssl_valid = True
            ctx.ssl_issuer = self._extract_issuer(cert_info)

            not_after = cert_info.get("notAfter")
            if not_after:
                expiry = datetime.strptime(
                    not_after, "%b %d %H:%M:%S %Y %Z"
                ).replace(tzinfo=timezone.utc)
                ctx.ssl_days_remaining = (
                    expiry - datetime.now(timezone.utc)
                ).days

        except Exception as exc:
            logger.warning(f"SSL check failed for {ctx.domain}: {exc}")
            ctx.ssl_valid = False

    @staticmethod
    def _get_cert(domain: str) -> dict | None:
        ssl_ctx = ssl.create_default_context()
        with ssl.create_connection((domain, 443), timeout=5) as sock:
            with ssl_ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                return ssock.getpeercert()

    @staticmethod
    def _extract_issuer(cert: dict) -> str:
        issuer = cert.get("issuer", ())
        for rdn in issuer:
            for attr_type, attr_value in rdn:
                if attr_type == "organizationName":
                    return attr_value
        return "Unknown"
