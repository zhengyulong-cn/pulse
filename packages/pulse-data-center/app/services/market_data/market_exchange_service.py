from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.models import MarketExchange, MarketInstrument
from app.schemas.market_exchange import MarketExchangeCreate, MarketExchangeUpdate
from app.services.market_data.errors import MarketDataConflictError, MarketDataNotFoundError


def list_exchanges(session: Session) -> list[MarketExchange]:
    return list(session.exec(select(MarketExchange).order_by(MarketExchange.name)))


def get_exchange(session: Session, exchange_id: int) -> MarketExchange:
    exchange = session.get(MarketExchange, exchange_id)
    if exchange is None:
        raise MarketDataNotFoundError("Market exchange not found")
    return exchange


def create_exchange(session: Session, payload: MarketExchangeCreate) -> MarketExchange:
    data = _normalize_exchange_data(payload.model_dump())
    duplicate = session.exec(select(MarketExchange).where(MarketExchange.mic == data["mic"])).first()
    if duplicate:
        raise MarketDataConflictError("Market exchange MIC already exists")

    exchange = MarketExchange(**data)
    session.add(exchange)
    session.commit()
    session.refresh(exchange)
    return exchange


def update_exchange(session: Session, exchange_id: int, payload: MarketExchangeUpdate) -> MarketExchange:
    exchange = get_exchange(session, exchange_id)
    data = _normalize_exchange_data(payload.model_dump(exclude_unset=True))
    if "mic" in data:
        duplicate = session.exec(select(MarketExchange).where(MarketExchange.mic == data["mic"])).first()
        if duplicate and duplicate.id != exchange.id:
            raise MarketDataConflictError("Market exchange MIC already exists")

    for field, value in data.items():
        setattr(exchange, field, value)
    exchange.updated_at = datetime.utcnow()
    session.add(exchange)
    session.commit()
    session.refresh(exchange)
    return exchange


def delete_exchange(session: Session, exchange_id: int) -> None:
    exchange = get_exchange(session, exchange_id)
    instrument_id = session.exec(
        select(MarketInstrument.id).where(MarketInstrument.exchange_id == exchange.id)
    ).first()
    if instrument_id is not None:
        raise MarketDataConflictError("Market exchange still has instruments")

    session.delete(exchange)
    session.commit()


def _normalize_exchange_data(data: dict[str, Any]) -> dict[str, Any]:
    for field in ("name", "english_name", "city", "timezone"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip()
    for field in ("mic", "country_code", "currency"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip().upper()
    return data
