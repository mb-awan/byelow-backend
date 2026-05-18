from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from html_parser import parse_html
from loguru import logger

from app.analyzers.base import AnalysisContext
from app.config import Settings


class HttpCollector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def collect(self, ctx: AnalysisContext) -> None:
        async with httpx.AsyncClient(
            timeout=self.settings.http_timeout,
            follow_redirects=True,
            max_redirects=self.settings.max_redirects,
            headers={"User-Agent": self.settings.user_agent},
            verify=True,
        ) as client:
            await self._fetch_page(client, ctx)
            self._extract_links(ctx)
            await self._fetch_robots(client, ctx)
            await self._fetch_sitemap(client, ctx)

    # ------------------------------------------------------------------

    async def _fetch_page(
        self, client: httpx.AsyncClient, ctx: AnalysisContext
    ) -> None:
        try:
            resp = await client.get(ctx.url)
            ctx.status_code = resp.status_code
            ctx.headers = dict(resp.headers)
            ctx.html = resp.text
            ctx.redirect_chain = [str(r.url) for r in resp.history]
            ctx.response_time = resp.elapsed.total_seconds()
        except httpx.HTTPError as exc:
            logger.warning(f"HTTP fetch failed for {ctx.url}: {exc}")

    def _extract_links(self, ctx: AnalysisContext) -> None:
        if not ctx.html:
            return
        soup = parse_html(ctx.html)
        for anchor in soup.find_all("a", href=True):
            href: str = anchor["href"]
            if href.startswith(("http://", "https://")):
                parsed = urlparse(href)
                link_domain = (parsed.hostname or "").lower().removeprefix("www.")
                if link_domain == ctx.domain:
                    ctx.internal_links.append(href)
                else:
                    ctx.external_links.append(href)
            elif href.startswith("/"):
                ctx.internal_links.append(
                    f"{ctx.scheme}://{ctx.domain}{href}"
                )

    async def _fetch_robots(
        self, client: httpx.AsyncClient, ctx: AnalysisContext
    ) -> None:
        url = f"{ctx.scheme}://{ctx.domain}/robots.txt"
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                ctx.robots_txt = resp.text
        except httpx.HTTPError:
            pass

    async def _fetch_sitemap(
        self, client: httpx.AsyncClient, ctx: AnalysisContext
    ) -> None:
        url = f"{ctx.scheme}://{ctx.domain}/sitemap.xml"
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                ctx.sitemap_xml = resp.text
        except httpx.HTTPError:
            pass
