from __future__ import annotations

import logging
import logging.config

from app.config.settings import settings


def configure_logging() -> None:
    stream = "ext://sys.stderr" if settings.log_output == "stderr" else "ext://sys.stdout"
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": settings.log_format,
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": stream,
                },
            },
            "root": {
                "level": settings.log_level,
                "handlers": ["console"],
            },
        }
    )
