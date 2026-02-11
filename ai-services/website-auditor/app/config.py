from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Byelow Website Auditor"
    debug: bool = False

    # HTTP fetching
    http_timeout: float = 20.0
    max_redirects: int = 10
    user_agent: str = "ByelowAuditorBot/1.0 (+https://byelow.com/bot)"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
