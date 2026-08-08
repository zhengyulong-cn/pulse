class Settings:
    app_name: str = "pulse-data-center"
    app_version: str = "0.1.0"
    app_host: str = "127.0.0.1"
    app_port: int = 8001
    app_reload: bool = False

    log_level: str = "INFO"
    log_format: str = "%(asctime)s %(levelname)s %(name)s %(message)s"
    log_output: str = "stdout"
    http_logger_name: str = "pulse_data_center.http"
    exception_logger_name: str = "pulse_data_center.exception"

settings = Settings()
