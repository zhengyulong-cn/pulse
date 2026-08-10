from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db import get_session
from app.schemas.future_cn_kline import (
    FutureCnKlineLatestRead,
    FutureCnKlineSyncRead,
    FutureCnKlineSyncRequest,
)
from app.services.market_data.errors import MarketDataNotFoundError
from app.services.market_data.future_cn_kline_service import (
    list_latest_future_cn_klines,
    sync_future_cn_kline,
)

router = APIRouter(prefix="/market_data/kline", tags=["Market Data"])


@router.post("/sync", response_model=FutureCnKlineSyncRead)
def sync_future_cn_kline_route(
    payload: FutureCnKlineSyncRequest,
    session: Session = Depends(get_session),
) -> FutureCnKlineSyncRead:
    try:
        result = sync_future_cn_kline(session, payload.symbol, payload.interval)
    except MarketDataNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return FutureCnKlineSyncRead(
        instrument_id=result.instrument_id,
        symbol=result.symbol,
        interval=result.interval,
        received_count=result.received_count,
        persisted_count=result.persisted_count,
    )


@router.get("/latest", response_model=list[FutureCnKlineLatestRead])
def list_latest_future_cn_klines_route(
    instrument_ids: str = Query(min_length=1),
    session: Session = Depends(get_session),
) -> list[FutureCnKlineLatestRead]:
    try:
        parsed_instrument_ids = [int(instrument_id) for instrument_id in instrument_ids.split(",")]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="instrument_ids must be comma-separated integers") from exc

    return [
        FutureCnKlineLatestRead(
            instrument_id=kline.instrument_id,
            interval=kline.interval,
            date_time=kline.date_time,
            open=kline.open,
            close=kline.close,
            high=kline.high,
            low=kline.low,
            volume=kline.volume,
            hold=kline.hold,
        )
        for kline in list_latest_future_cn_klines(session, parsed_instrument_ids)
    ]
