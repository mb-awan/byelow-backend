import dns.asyncresolver
import dns.exception
from loguru import logger

from app.analyzers.base import AnalysisContext


class DnsCollector:
    async def collect(self, ctx: AnalysisContext) -> None:
        resolver = dns.asyncresolver.Resolver()
        resolver.lifetime = 5.0  # seconds

        await self._query_mx(resolver, ctx)
        await self._query_txt(resolver, ctx)
        await self._query_ns(resolver, ctx)

    async def _query_mx(
        self, resolver: dns.asyncresolver.Resolver, ctx: AnalysisContext
    ) -> None:
        try:
            answers = await resolver.resolve(ctx.domain, "MX")
            ctx.dns_records["MX"] = [str(r.exchange) for r in answers]
            ctx.has_mx = len(ctx.dns_records["MX"]) > 0
        except dns.exception.DNSException as exc:
            logger.debug(f"MX lookup failed for {ctx.domain}: {exc}")

    async def _query_txt(
        self, resolver: dns.asyncresolver.Resolver, ctx: AnalysisContext
    ) -> None:
        try:
            answers = await resolver.resolve(ctx.domain, "TXT")
            records = [str(r) for r in answers]
            ctx.dns_records["TXT"] = records

            for rec in records:
                lower = rec.lower()
                if "v=spf1" in lower:
                    ctx.has_spf = True

            # DMARC lives at _dmarc.<domain>
            try:
                dmarc_answers = await resolver.resolve(
                    f"_dmarc.{ctx.domain}", "TXT"
                )
                for r in dmarc_answers:
                    if "v=dmarc1" in str(r).lower():
                        ctx.has_dmarc = True
                        break
            except dns.exception.DNSException:
                pass

        except dns.exception.DNSException as exc:
            logger.debug(f"TXT lookup failed for {ctx.domain}: {exc}")

    async def _query_ns(
        self, resolver: dns.asyncresolver.Resolver, ctx: AnalysisContext
    ) -> None:
        try:
            answers = await resolver.resolve(ctx.domain, "NS")
            ctx.dns_records["NS"] = [str(r.target) for r in answers]
        except dns.exception.DNSException as exc:
            logger.debug(f"NS lookup failed for {ctx.domain}: {exc}")
