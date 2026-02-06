from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Byelow SEO Authority Scorer"
    debug: bool = False

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"

    # HTTP collection
    http_timeout: float = 15.0
    max_redirects: int = 5
    user_agent: str = "ByelowSEOBot/1.0"

    # --------------- DA signal weights ---------------
    da_weight_backlinks: float = 0.30
    da_weight_referring_domains: float = 0.25
    da_weight_link_diversity: float = 0.10
    da_weight_domain_age: float = 0.10
    da_weight_dns_quality: float = 0.05
    da_weight_ssl_trust: float = 0.05
    da_weight_domain_spam: float = -0.15  # negative → penalty

    # --------------- PA signal weights ---------------
    pa_weight_page_backlinks: float = 0.25
    pa_weight_onpage_seo: float = 0.30
    pa_weight_internal_linking: float = 0.15
    pa_weight_content_quality: float = 0.15
    pa_weight_page_spam: float = -0.15  # negative → penalty

    # External backlink API keys (optional)
    moz_access_id: str | None = None
    moz_secret_key: str | None = None
    ahrefs_api_key: str | None = None

    # Scoring curve
    log_scale_factor: float = 15.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
