from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.models import MarketInstrument, MarketInstrumentType
from app.schemas.market_instrument import MarketInstrumentCreate, MarketInstrumentUpdate
from app.services.market_data.errors import MarketDataConflictError, MarketDataNotFoundError
from app.services.market_data.market_exchange_service import get_exchange


def list_instruments(
    session: Session,
    exchange_id: int | None,
    instrument_type: MarketInstrumentType | None,
    is_active: bool | None,
) -> list[MarketInstrument]:
    statement = select(MarketInstrument)
    if exchange_id is not None:
        statement = statement.where(MarketInstrument.exchange_id == exchange_id)
    if instrument_type is not None:
        statement = statement.where(MarketInstrument.instrument_type == instrument_type)
    if is_active is not None:
        statement = statement.where(MarketInstrument.is_active == is_active)
    return list(session.exec(statement.order_by(MarketInstrument.symbol)))


def get_instrument(session: Session, instrument_id: int) -> MarketInstrument:
    instrument = session.get(MarketInstrument, instrument_id)
    if instrument is None:
        raise MarketDataNotFoundError("Market instrument not found")
    return instrument


def create_instrument(session: Session, payload: MarketInstrumentCreate) -> MarketInstrument:
    data = _normalize_instrument_data(payload.model_dump())
    get_exchange(session, data["exchange_id"])
    _raise_if_duplicate(session, data["exchange_id"], data["symbol"])

    instrument = MarketInstrument(**data)
    session.add(instrument)
    session.commit()
    session.refresh(instrument)
    return instrument


def update_instrument(session: Session, instrument_id: int, payload: MarketInstrumentUpdate) -> MarketInstrument:
    instrument = get_instrument(session, instrument_id)
    data = _normalize_instrument_data(payload.model_dump(exclude_unset=True))
    target_exchange_id = data.get("exchange_id", instrument.exchange_id)
    target_symbol = data.get("symbol", instrument.symbol)

    if "exchange_id" in data:
        get_exchange(session, data["exchange_id"])
    if target_exchange_id != instrument.exchange_id or target_symbol != instrument.symbol:
        _raise_if_duplicate(session, target_exchange_id, target_symbol, instrument.id)

    for field, value in data.items():
        setattr(instrument, field, value)
    instrument.updated_at = datetime.utcnow()
    session.add(instrument)
    session.commit()
    session.refresh(instrument)
    return instrument


def delete_instrument(session: Session, instrument_id: int) -> None:
    instrument = get_instrument(session, instrument_id)
    session.delete(instrument)
    session.commit()


def _raise_if_duplicate(
    session: Session,
    exchange_id: int,
    symbol: str,
    excluded_instrument_id: int | None = None,
) -> None:
    duplicate = session.exec(
        select(MarketInstrument).where(
            MarketInstrument.exchange_id == exchange_id,
            MarketInstrument.symbol == symbol,
        )
    ).first()
    if duplicate and duplicate.id != excluded_instrument_id:
        raise MarketDataConflictError("Market instrument symbol already exists for this exchange")


def _normalize_instrument_data(data: dict[str, Any]) -> dict[str, Any]:
    for field in ("symbol", "product_code"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip().upper()
    for field in ("name", "english_name"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip()
    return data
