from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.models import MarketExchange, MarketInstrument, MarketInstrumentType
from app.services.data_provider.provider_models import FutureInstrumentData

TQSDK_EXCHANGE_TO_MIC = {
    "SHFE": "XSGE",
    "DCE": "XDCE",
    "CZCE": "XZCE",
    "CFFEX": "CCFX",
    "INE": "XINE",
    "GFEX": "XGFE",
}


@dataclass(frozen=True)
class InstrumentSyncResult:
    synced_count: int
    deactivated_count: int


def sync_active_futures(
    session: Session,
    futures: list[FutureInstrumentData],
) -> InstrumentSyncResult:
    futures = [future for future in futures if future.exchange_code in TQSDK_EXCHANGE_TO_MIC]
    exchange_ids = _get_exchange_ids(session, futures)
    now = datetime.utcnow()
    rows = [
        {
            "exchange_id": exchange_ids[future.exchange_code],
            "symbol": future.symbol,
            "name": future.name,
            "instrument_type": MarketInstrumentType.FUTURE,
            "product_code": future.product_code,
            "listed_at": future.listed_at,
            "expired_at": future.expired_at,
            "price_tick": future.price_tick,
            "volume_multiple": future.volume_multiple,
            "trading_time": future.trading_time,
            "is_active": True,
            "updated_at": now,
        }
        for future in futures
    ]

    if rows:
        statement = insert(MarketInstrument).values(rows)
        session.exec(
            statement.on_conflict_do_update(
                constraint="market_instrument_exchange_symbol_key",
                set_={
                    "name": statement.excluded.name,
                    "instrument_type": statement.excluded.instrument_type,
                    "product_code": statement.excluded.product_code,
                    "listed_at": statement.excluded.listed_at,
                    "expired_at": statement.excluded.expired_at,
                    "price_tick": statement.excluded.price_tick,
                    "volume_multiple": statement.excluded.volume_multiple,
                    "trading_time": statement.excluded.trading_time,
                    "is_active": True,
                    "updated_at": now,
                },
            )
        )

    deactivated_count = _deactivate_missing_futures(session, futures, exchange_ids, now)
    session.commit()
    return InstrumentSyncResult(synced_count=len(futures), deactivated_count=deactivated_count)


def _get_exchange_ids(session: Session, futures: list[FutureInstrumentData]) -> dict[str, int]:
    exchange_codes = {future.exchange_code for future in futures}
    print("exchange_codes =", exchange_codes)
    unsupported_exchange_codes = exchange_codes - TQSDK_EXCHANGE_TO_MIC.keys()
    if unsupported_exchange_codes:
        exchanges = ", ".join(sorted(unsupported_exchange_codes))
        raise ValueError(f"Unsupported TqSdk exchange codes: {exchanges}")

    expected_mics = {TQSDK_EXCHANGE_TO_MIC[exchange_code] for exchange_code in exchange_codes}
    exchanges_by_mic = {
        exchange.mic: exchange
        for exchange in session.exec(select(MarketExchange).where(MarketExchange.mic.in_(expected_mics)))
    }
    missing_mics = expected_mics - exchanges_by_mic.keys()
    if missing_mics:
        mics = ", ".join(sorted(missing_mics))
        raise ValueError(f"Missing market exchanges for MICs: {mics}")

    return {
        exchange_code: exchanges_by_mic[TQSDK_EXCHANGE_TO_MIC[exchange_code]].id
        for exchange_code in exchange_codes
    }


def _deactivate_missing_futures(
    session: Session,
    futures: list[FutureInstrumentData],
    exchange_ids: dict[str, int],
    now: datetime,
) -> int:
    symbols_by_exchange: dict[int, set[str]] = {}
    for future in futures:
        exchange_id = exchange_ids[future.exchange_code]
        symbols_by_exchange.setdefault(exchange_id, set()).add(future.symbol)

    deactivated_count = 0
    for exchange_id, active_symbols in symbols_by_exchange.items():
        result = session.exec(
            update(MarketInstrument)
            .where(MarketInstrument.exchange_id == exchange_id)
            .where(MarketInstrument.instrument_type == MarketInstrumentType.FUTURE)
            .where(MarketInstrument.is_active.is_(True))
            .where(MarketInstrument.symbol.not_in(active_symbols))
            .values(is_active=False, updated_at=now)
        )
        deactivated_count += result.rowcount or 0
    return deactivated_count
