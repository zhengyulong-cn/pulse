from fastapi import APIRouter, HTTPException, status

from app.schemas.market_instrument_sync import MarketInstrumentSyncJobRead
from app.services.market_data.market_instrument_sync_job_service import (
    InstrumentSyncAlreadyRunningError,
    InstrumentSyncJobNotFoundError,
    instrument_sync_job_manager,
)

router = APIRouter(prefix="/market_data/instrument", tags=["Market Data"])


@router.post(
    "/sync",
    response_model=MarketInstrumentSyncJobRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="启动期货合约同步",
)
def start_market_instrument_sync() -> MarketInstrumentSyncJobRead:
    try:
        return instrument_sync_job_manager.start()
    except InstrumentSyncAlreadyRunningError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get(
    "/sync/{job_id}",
    response_model=MarketInstrumentSyncJobRead,
    summary="查询期货合约同步任务",
)
def get_market_instrument_sync_job(job_id: str) -> MarketInstrumentSyncJobRead:
    try:
        return instrument_sync_job_manager.get(job_id)
    except InstrumentSyncJobNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
