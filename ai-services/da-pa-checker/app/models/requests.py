import re

from pydantic import BaseModel, field_validator


class AnalyzeRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL must not be empty")
        if not re.match(r"^https?://", v):
            v = f"https://{v}"
        return v
