from pydantic import BaseModel, Field, field_validator

from app.core.url_utils import URLValidationError, validate_and_normalize


class AuditRequest(BaseModel):
    url: str = Field(..., description="Target website URL to audit (e.g. https://example.com)")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        try:
            return validate_and_normalize(v)
        except URLValidationError as e:
            raise ValueError(str(e))
