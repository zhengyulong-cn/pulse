from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from app.db import get_session
from app.models import MarketInstrumentType
from app.schemas.market_instrument import (
    MarketInstrumentCreate,
    MarketInstrumentExchangeNodeRead,
    MarketInstrumentRead,
    MarketInstrumentSearchRead,
    MarketInstrumentUpdate,
)
from app.services.market_data import market_instrument_service
from app.services.market_data.errors import MarketDataConflictError, MarketDataNotFoundError

router = APIRouter(prefix="/api/v1/market-instruments", tags=["Market Instruments"])


@router.get(
    "/tree",
    response_model=list[MarketInstrumentExchangeNodeRead],
    summary="查询金融标的树",
)
def list_market_instruments(
    exchange_id: int | None = None,
    instrument_type: MarketInstrumentType | None = None,
    is_active: bool | None = None,
    session: Session = Depends(get_session),
):
    return market_instrument_service.list_instruments(session, exchange_id, instrument_type, is_active)


@router.get(
    "/search",
    response_model=list[MarketInstrumentSearchRead],
    summary="搜索金融标的",
)
def search_market_instruments(
    query: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> list[MarketInstrumentSearchRead]:
    return market_instrument_service.search_instruments(session, query, limit)


@router.get(
    "",
    response_model=MarketInstrumentRead,
    summary="查询金融标的详情",
)
def get_market_instrument(
    instrument_id: int = Query(gt=0, alias="instrumentId"),
    session: Session = Depends(get_session)
):
    return _execute(lambda: market_instrument_service.get_instrument(session, instrument_id))


@router.post(
    "",
    response_model=MarketInstrumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="创建金融标的",
)
def create_market_instrument(payload: MarketInstrumentCreate, session: Session = Depends(get_session)):
    return _execute(lambda: market_instrument_service.create_instrument(session, payload))


@router.patch(
    "/{instrument_id}",
    response_model=MarketInstrumentRead,
    summary="更新金融标的",
)
def update_market_instrument(
    instrument_id: int,
    payload: MarketInstrumentUpdate,
    session: Session = Depends(get_session),
):
    return _execute(lambda: market_instrument_service.update_instrument(session, instrument_id, payload))


@router.delete(
    "/{instrument_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除金融标的",
)
def delete_market_instrument(instrument_id: int, session: Session = Depends(get_session)) -> Response:
    _execute(lambda: market_instrument_service.delete_instrument(session, instrument_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _execute(operation):
    try:
        return operation()
    except MarketDataNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except MarketDataConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
