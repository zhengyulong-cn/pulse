from datetime import datetime
import re
from typing import Any

from sqlmodel import Session, select

from app.models import MarketExchange, MarketInstrument, MarketInstrumentType
from app.schemas.market_instrument import (
    MarketInstrumentCreate,
    MarketInstrumentExchangeNodeRead,
    MarketInstrumentProductNodeRead,
    MarketInstrumentRead,
    MarketInstrumentUpdate,
)
from app.services.market_data.errors import MarketDataConflictError, MarketDataNotFoundError
from app.services.market_data.market_exchange_service import get_exchange


def list_instruments(
    session: Session,
    exchange_id: int | None,
    instrument_type: MarketInstrumentType | None,
    is_active: bool | None,
) -> list[MarketInstrumentExchangeNodeRead]:
    statement = select(MarketInstrument)
    if exchange_id is not None:
        statement = statement.where(MarketInstrument.exchange_id == exchange_id)
    if instrument_type is not None:
        statement = statement.where(MarketInstrument.instrument_type == instrument_type)
    if is_active is not None:
        statement = statement.where(MarketInstrument.is_active == is_active)
    instruments = list(
        session.exec(
            statement.order_by(
                MarketInstrument.exchange_id,
                MarketInstrument.product_code,
                MarketInstrument.expired_at,
                MarketInstrument.symbol,
            )
        )
    )
    return _build_instrument_exchange_tree(session, instruments)


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


def _build_instrument_exchange_tree(
    session: Session,
    instruments: list[MarketInstrument],
) -> list[MarketInstrumentExchangeNodeRead]:
    instruments_by_product: dict[tuple[int, str], list[MarketInstrument]] = {}
    for instrument in instruments:
        product_code = instrument.product_code or instrument.symbol
        instruments_by_product.setdefault((instrument.exchange_id, product_code), []).append(instrument)

    products_by_exchange: dict[int, list[MarketInstrumentProductNodeRead]] = {}
    for (exchange_id, product_code), children in instruments_by_product.items():
        child_models = [MarketInstrumentRead.model_validate(child) for child in children]
        products_by_exchange.setdefault(exchange_id, []).append(
            MarketInstrumentProductNodeRead(
                id=f"{exchange_id}:{product_code}",
                exchange_id=exchange_id,
                product_code=product_code,
                name=_get_product_name(children[0].name, product_code),
                instrument_type=children[0].instrument_type,
                is_active=any(child.is_active for child in children),
                instrument_count=len(child_models),
                children=child_models,
            )
        )

    if not products_by_exchange:
        return []

    exchanges_by_id = {
        exchange.id: exchange
        for exchange in session.exec(
            select(MarketExchange).where(MarketExchange.id.in_(products_by_exchange.keys()))
        )
    }
    nodes: list[MarketInstrumentExchangeNodeRead] = []
    for exchange_id in sorted(products_by_exchange):
        exchange = exchanges_by_id.get(exchange_id)
        if exchange is None:
            continue
        product_nodes = products_by_exchange[exchange_id]
        nodes.append(
            MarketInstrumentExchangeNodeRead(
                **exchange.model_dump(),
                product_count=len(product_nodes),
                instrument_count=sum(product.instrument_count for product in product_nodes),
                children=product_nodes,
            )
        )

    return nodes


def _get_product_name(instrument_name: str, product_code: str) -> str:
    product_name = re.sub(r"\d+$", "", instrument_name).strip()
    return product_name or product_code
