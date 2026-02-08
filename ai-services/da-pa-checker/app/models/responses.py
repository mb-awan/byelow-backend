from pydantic import BaseModel, Field


class BacklinksInfo(BaseModel):
    total: int = 0
    dofollow: int = 0
    nofollow: int = 0


class AuthorityScore(BaseModel):
    domain_authority: float = Field(
        ...,
        ge=0,
        le=100,
        description="Domain Authority (0-100)",
    )
    page_authority: float = Field(
        ...,
        ge=0,
        le=100,
        description="Page Authority (0-100)",
    )
    spam_score: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Spam Score percentage (0-100)",
    )
    referring_domains: int = Field(
        default=0,
        ge=0,
        description="Number of referring domains",
    )
    backlinks: BacklinksInfo = Field(default_factory=BacklinksInfo)
    domain: str
    url: str


class AnalyzeResponse(BaseModel):
    success: bool
    data: AuthorityScore | None = None
    error: str | None = None
