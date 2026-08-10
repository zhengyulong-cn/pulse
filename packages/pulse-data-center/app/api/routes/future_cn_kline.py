from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.schemas.future_cn_kline import FutureCnKlineSyncRead, FutureCnKlineSyncRequest
from app.services.market_data.errors import MarketDataNotFoundError
from app.services.market_data.future_cn_kline_service import sync_future_cn_kline

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
