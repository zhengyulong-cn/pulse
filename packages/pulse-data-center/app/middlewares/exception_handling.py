from __future__ import annotations

import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config.settings import settings

logger = logging.getLogger(settings.exception_logger_name)


class ExceptionHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            request_id = getattr(request.state, "request_id", None)
            logger.exception(
                "Unhandled exception method=%s path=%s request_id=%s",
                request.method,
                request.url.path,
                request_id,
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "code": 500,
                    "message": "Internal server error",
                    "request_id": request_id,
                },
            )
            if request_id:
                response.headers["X-Request-ID"] = request_id
            return response


def install_exception_middleware(app) -> None:
    app.add_middleware(ExceptionHandlingMiddleware)
