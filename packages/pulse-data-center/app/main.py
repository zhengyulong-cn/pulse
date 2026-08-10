from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.settings import settings
from app.config.logging_config import configure_logging, get_logger
from app.db import check_database_connection, dispose_database_engine, initialize_market_data_schema
from app.middlewares import install_exception_middleware, install_request_middleware
from app.services.data_provider.tqsdk_provider import tqsdk_client_manager
from app.api.routes.market_exchange import router as market_exchange_router
from app.api.routes.market_instrument import router as market_instrument_router
from app.api.routes.market_instrument_sync import router as market_instrument_sync_router

configure_logging()
logger = get_logger(__name__)

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

@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting %s", settings.app_name)
    check_database_connection()
    initialize_market_data_schema()
    try:
        tqsdk_client_manager.start()
    except Exception as exc:
        logger.warning("TqSdk client unavailable during startup: %s", exc)
    try:
        yield
    finally:
        tqsdk_client_manager.close()
        dispose_database_engine()
        logger.info("Stopping %s", settings.app_name)

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan
    )
    install_request_middleware(application)
    install_exception_middleware(application)
    application.add_exception_handler(StarletteHTTPException, handle_http_exception)
    application.add_exception_handler(RequestValidationError, handle_validation_exception)
    application.include_router(market_exchange_router)
    application.include_router(market_instrument_router)
    application.include_router(market_instrument_sync_router)

    @application.get("/health/database", tags=["Health"])
    def database_health() -> dict[str, str]:
        try:
            check_database_connection()
        except Exception as exc:
            logger.exception("Database health check failed")
            raise HTTPException(status_code=503, detail="Database unavailable") from exc
        return {"status": "ok"}

    return application


app = create_application()
