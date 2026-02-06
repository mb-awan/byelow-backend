from pydantic import BaseModel, Field


class AuthorityScore(BaseModel):
    domain_authority: float = Field(
        ...,
        ge=0,
        le=100,
        description="Domain Authority – Custom Authority Score (Estimated)",
    )
    page_authority: float = Field(
        ...,
        ge=0,
        le=100,
        description="Page Authority – Custom Authority Score (Estimated)",
    )
    label: str = "Custom Authority Score (Estimated)"
    domain: str
    url: str


class AnalyzeResponse(BaseModel):
    success: bool
    data: AuthorityScore | None = None
    error: str | None = None
