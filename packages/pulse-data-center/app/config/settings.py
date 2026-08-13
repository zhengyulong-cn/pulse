import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings:
    app_name: str = "pulse-data-center"
    app_version: str = "0.1.0"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    app_reload: bool = False

    log_level: str = "INFO"
    log_format: str = "%(asctime)s %(levelname)s %(name)s %(message)s"
    log_output: str = "stdout"
    http_logger_name: str = "pulse_data_center.http"
    exception_logger_name: str = "pulse_data_center.exception"

    postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "123456")
    postgres_host: str = os.getenv("POSTGRES_HOST", "127.0.0.1")
    postgres_port: str = os.getenv("POSTGRES_PORT", "5432")
    postgres_database: str = os.getenv("POSTGRES_DATABASE", "postgres")

    redis_host: str = os.getenv("REDIS_HOST", "127.0.0.1")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_database: int = int(os.getenv("REDIS_DATABASE", "0"))
    redis_password: str | None = os.getenv("REDIS_PASSWORD")

    tqsdk_username: str = os.getenv("TQSDK_USERNAME", "Zhengyu")
    tqsdk_password: str = os.getenv("TQSDK_PASSWORD", "lzy523024")


settings = Settings()
