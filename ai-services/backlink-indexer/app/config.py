from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Byelow Backlink Indexer"
    debug: bool = False

    http_timeout: float = 20.0
    discovery_timeout: float = 30.0
    max_redirects: int = 5
    user_agent: str = "ByelowBacklinkBot/1.0 (+https://byelow.com/bot)"
    # Set to true in production. False avoids SSL verify failures on Windows/dev.
    verify_ssl: bool = False

    # How many verification requests to run concurrently (be respectful)
    max_concurrent_verifications: int = 5

    # DataForSEO credentials — set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD for non-zero results.
    # Load from repo root .env / .env.development / .env.production when running from ai-services/.
    dataforseo_login: str = ""
    dataforseo_password: str = ""

    # Load env in order: ai-services/.env, then repo root .env, .env.development, .env.production
    # so that DataForSEO credentials in the same env as the Node app are picked up.
    model_config = {
        "env_file": [".env", "../.env", "../.env.development", "../.env.production"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
