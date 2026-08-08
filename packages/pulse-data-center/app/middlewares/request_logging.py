from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.config.settings import settings

logger = logging.getLogger(settings.http_logger_name)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            # ExceptionHandlingMiddleware owns error logging and the 500 response.
            raise

        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "%s %s status=%s request_id=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            request_id,
            elapsed_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response


def install_request_middleware(app) -> None:
    app.add_middleware(RequestLoggingMiddleware)
