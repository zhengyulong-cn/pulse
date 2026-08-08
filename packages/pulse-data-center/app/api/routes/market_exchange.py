from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from app.db import get_session
from app.schemas.market_exchange import MarketExchangeCreate, MarketExchangeRead, MarketExchangeUpdate
from app.services.market_data import market_exchange_service
from app.services.market_data.errors import MarketDataConflictError, MarketDataNotFoundError

router = APIRouter(prefix="/api/v1/market-exchanges", tags=["Market Exchanges"])


@router.get("", response_model=list[MarketExchangeRead])
def list_market_exchanges(session: Session = Depends(get_session)):
    return market_exchange_service.list_exchanges(session)


@router.get("/{exchange_id}", response_model=MarketExchangeRead)
def get_market_exchange(exchange_id: int, session: Session = Depends(get_session)):
    return _execute(lambda: market_exchange_service.get_exchange(session, exchange_id))


@router.post("", response_model=MarketExchangeRead, status_code=status.HTTP_201_CREATED)
def create_market_exchange(payload: MarketExchangeCreate, session: Session = Depends(get_session)):
    return _execute(lambda: market_exchange_service.create_exchange(session, payload))


@router.patch("/{exchange_id}", response_model=MarketExchangeRead)
def update_market_exchange(
    exchange_id: int,
    payload: MarketExchangeUpdate,
    session: Session = Depends(get_session),
):
    return _execute(lambda: market_exchange_service.update_exchange(session, exchange_id, payload))


@router.delete("/{exchange_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_market_exchange(exchange_id: int, session: Session = Depends(get_session)) -> Response:
    _execute(lambda: market_exchange_service.delete_exchange(session, exchange_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _execute(operation):
    try:
        return operation()
    except MarketDataNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except MarketDataConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
