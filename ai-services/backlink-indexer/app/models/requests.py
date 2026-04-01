from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.core.url_utils import URLValidationError, validate_and_normalize


class BacklinkIndexRequest(BaseModel):
    """Request body for the backlink indexer endpoint."""

    url: str = Field(..., description="Target domain or full URL to find and verify backlinks for")

    max_backlinks: int = Field(50, description="Maximum number of backlinks to discover and index (capped at 100)")

    verify: bool = Field(
        True,
        description="If true, fetch and verify each candidate backlink. If false, return candidates as unverified.",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        # Accept bare domains like "example.com"
        if not v.startswith(("http://", "https://")):
            v = f"https://{v}"
        try:
            return validate_and_normalize(v)
        except URLValidationError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("max_backlinks")
    @classmethod
    def clamp_max_backlinks(cls, v: int) -> int:
        return max(1, min(v, 100))
