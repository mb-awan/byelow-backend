from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Byelow Content Optimization Checker"
    debug: bool = False

    http_timeout: float = 20.0
    max_redirects: int = 10
    user_agent: str = "ByelowContentBot/1.0 (+https://byelow.com/bot)"
    # Set to true in production. False avoids SSL verify failures on Windows/dev.
    verify_ssl: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
