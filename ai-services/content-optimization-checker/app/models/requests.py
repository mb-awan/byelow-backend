from __future__ import annotations

from pydantic import BaseModel, field_validator

from app.core.url_utils import URLValidationError, validate_and_normalize


class OptimizeRequest(BaseModel):
    """Request body for the content optimization endpoint."""

    url: str
    keywords: list[str] | None = None       # Target keyword(s) — optional
    country: str | None = None              # Target country (e.g. "US") — optional
    language: str | None = None             # Target language (e.g. "en") — optional

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
