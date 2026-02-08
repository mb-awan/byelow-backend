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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
