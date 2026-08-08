from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.settings import settings
from app.config.logging_config import configure_logging
from app.middlewares import install_exception_middleware, install_request_middleware

configure_logging()


def _request_id(request) -> str | None:
    return getattr(request.state, "request_id", None)


async def handle_http_exception(request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail, "request_id": _request_id(request)},
    )


async def handle_validation_exception(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"code": 422, "message": "Request validation failed", "details": jsonable_encoder(exc.errors()), "request_id": _request_id(request)},
    )


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )
    install_request_middleware(application)
    install_exception_middleware(application)
    application.add_exception_handler(StarletteHTTPException, handle_http_exception)
    application.add_exception_handler(RequestValidationError, handle_validation_exception)
    return application


app = create_application()
