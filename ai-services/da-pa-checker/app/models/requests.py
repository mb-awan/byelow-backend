import re

from pydantic import BaseModel, Field, field_validator


class AnalyzeRequest(BaseModel):
    url: str = Field(..., description="Target website URL to analyze (e.g. https://example.com)")

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL must not be empty")
        if not re.match(r"^https?://", v):
            v = f"https://{v}"
        return v
