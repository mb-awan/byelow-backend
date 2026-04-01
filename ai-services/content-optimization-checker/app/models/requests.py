from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.core.url_utils import URLValidationError, validate_and_normalize


class OptimizeRequest(BaseModel):
    """Request body for the content optimization endpoint."""

    url: str = Field(..., description="Target webpage URL to optimize (e.g. https://example.com)")
    keywords: list[str] | None = Field(default=None, description="Optional target keyword(s)")
    country: str | None = Field(default=None, description='Optional target country (e.g. "US")')
    language: str | None = Field(default=None, description='Optional target language (e.g. "en")')

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        try:
            return validate_and_normalize(v)
        except URLValidationError as exc:
            raise ValueError(str(exc))

    @field_validator("keywords", mode="before")
    @classmethod
    def clean_keywords(cls, v) -> list[str] | None:
        if v is None:
            return None
        if isinstance(v, str):
            v = [v]
        cleaned = [kw.strip() for kw in v if isinstance(kw, str) and kw.strip()]
        return cleaned if cleaned else None
