from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.models import FutureCnKline1m, FutureCnKline5m, MarketExchange, MarketInstrument, MarketInstrumentType
from app.services.data_provider import get_data_provider
from app.services.market_data.errors import MarketDataNotFoundError
from app.services.market_data.tqsdk_exchange_mapping import TQSDK_EXCHANGE_TO_MIC

KLINE_DATA_LENGTH = 5000
KlineInterval = Literal["1m", "5m"]
KlineQueryInterval = Literal["1m", "5m", "15m", "30m", "1h"]
KLINE_INTERVAL_CONFIG = {
    "1m": (60, FutureCnKline1m),
    "5m": (300, FutureCnKline5m),
}
KLINE_AGGREGATION_CONFIG = {
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
}


@dataclass(frozen=True)
class FutureCnKlineSyncResult:
    instrument_id: int
    symbol: str
    interval: KlineInterval
    received_count: int
    persisted_count: int


@dataclass(frozen=True)
class FutureCnKlineLatest:
    instrument_id: int
    interval: KlineInterval
    date_time: datetime
    open: object
    close: object
    high: object
    low: object
    volume: object
    hold: object


@dataclass(frozen=True)
class FutureCnKlineBar:
    time: int
    open: float
    close: float
    high: float
    low: float
    volume: float
    hold: float


def sync_future_cn_kline(
    session: Session,
    provider_symbol: str,
    interval: KlineInterval,
) -> FutureCnKlineSyncResult:
    exchange_code, instrument = _get_instrument(session, provider_symbol)
    normalized_provider_symbol = f"{exchange_code}.{instrument.symbol}"
    interval_seconds, kline_model = KLINE_INTERVAL_CONFIG[interval]
    klines = get_data_provider("tqsdk").get_kline_data(
        normalized_provider_symbol,
        interval_seconds,
        KLINE_DATA_LENGTH,
    )
    rows = [
        {
            "instrument_id": instrument.id,
            "date_time": kline.date_time,
            "open": kline.open,
            "close": kline.close,
            "high": kline.high,
            "low": kline.low,
            "volume": kline.volume,
            "hold": kline.hold,
        }
        for kline in klines
    ]

    if rows:
        statement = insert(kline_model).values(rows)
        session.exec(
            statement.on_conflict_do_update(
                index_elements=["instrument_id", "date_time"],
                set_={
                    "open": statement.excluded.open,
                    "close": statement.excluded.close,
                    "high": statement.excluded.high,
                    "low": statement.excluded.low,
                    "volume": statement.excluded.volume,
                    "hold": statement.excluded.hold,
                },
            )
        )
        session.commit()

    if instrument.id is None:
        raise RuntimeError("Persisted market instrument is missing an ID")
    return FutureCnKlineSyncResult(
        instrument_id=instrument.id,
        symbol=normalized_provider_symbol,
        interval=interval,
        received_count=len(klines),
        persisted_count=len(rows),
    )


def list_latest_future_cn_klines(session: Session, instrument_ids: list[int]) -> list[FutureCnKlineLatest]:
    unique_instrument_ids = list(dict.fromkeys(instrument_ids))
    if not unique_instrument_ids:
        return []

    latest_klines: list[FutureCnKlineLatest] = []
    for interval, (_, kline_model) in KLINE_INTERVAL_CONFIG.items():
        statement = (
            select(kline_model)
            .where(kline_model.instrument_id.in_(unique_instrument_ids))
            .distinct(kline_model.instrument_id)
            .order_by(kline_model.instrument_id, kline_model.date_time.desc())
        )
        for kline in session.exec(statement):
            latest_klines.append(
                FutureCnKlineLatest(
                    instrument_id=kline.instrument_id,
                    interval=interval,
                    date_time=kline.date_time,
                    open=kline.open,
                    close=kline.close,
                    high=kline.high,
                    low=kline.low,
                    volume=kline.volume,
                    hold=kline.hold,
                )
            )
    return latest_klines


def list_future_cn_kline_bars(
    session: Session,
    instrument_id: int,
    interval: KlineQueryInterval,
    from_timestamp: int,
    to_timestamp: int,
    limit: int,
    count_back: int | None = None,
    realtime_bar: dict[str, object] | None = None,
) -> list[FutureCnKlineBar]:
    if to_timestamp < from_timestamp:
        raise ValueError("to must be greater than or equal to from")

    is_aggregated_interval = interval in KLINE_AGGREGATION_CONFIG
    source_interval = "5m" if is_aggregated_interval else interval
    _, kline_model = KLINE_INTERVAL_CONFIG[source_interval]
    aggregation_seconds = KLINE_AGGREGATION_CONFIG.get(interval)
    source_limit = (
        (count_back if count_back is not None else limit) * (aggregation_seconds // 300)
        if aggregation_seconds
        else count_back
    )
    from_date_time = datetime.fromtimestamp(from_timestamp, timezone.utc).replace(tzinfo=None)
    to_date_time = datetime.fromtimestamp(to_timestamp, timezone.utc).replace(tzinfo=None)
    statement = select(kline_model).where(
        kline_model.instrument_id == instrument_id,
        kline_model.date_time <= to_date_time,
    )
    if source_limit is None:
        statement = statement.where(kline_model.date_time >= from_date_time).limit(limit)
    else:
        statement = statement.limit(source_limit)
    statement = statement.order_by(kline_model.date_time.desc())
    klines = list(session.exec(statement))
    klines.reverse()
    if aggregation_seconds:
        klines = _aggregate_5m_klines(klines, aggregation_seconds)
        if count_back is not None:
            klines = klines[-count_back:]
        elif len(klines) > limit:
            klines = klines[:limit]
    bars = [
        FutureCnKlineBar(
            time=int(kline.date_time.replace(tzinfo=timezone.utc).timestamp() * 1000),
            open=float(kline.open),
            close=float(kline.close),
            high=float(kline.high),
            low=float(kline.low),
            volume=float(kline.volume),
            hold=float(kline.hold),
        )
        for kline in klines
    ]
    if realtime_bar is not None:
        realtime_time = realtime_bar.get("time")
        if isinstance(realtime_time, int) and from_timestamp * 1000 <= realtime_time <= to_timestamp * 1000:
            try:
                current_bar = FutureCnKlineBar(
                    time=realtime_time,
                    open=float(realtime_bar["open"]),
                    close=float(realtime_bar["close"]),
                    high=float(realtime_bar["high"]),
                    low=float(realtime_bar["low"]),
                    volume=float(realtime_bar["volume"]),
                    hold=float(realtime_bar["hold"]),
                )
            except (KeyError, TypeError, ValueError):
                current_bar = None
            if current_bar is not None:
                bars_by_time = {bar.time: bar for bar in bars}
                bars_by_time[current_bar.time] = current_bar
                bars = sorted(bars_by_time.values(), key=lambda bar: bar.time)
                if count_back is not None:
                    bars = bars[-count_back:]
    return bars


def upsert_realtime_kline_bar(instrument_id: int, interval: KlineInterval, bar: dict[str, object]) -> None:
    upsert_realtime_kline_bars(instrument_id, interval, [bar])


def upsert_realtime_kline_bars(instrument_id: int, interval: KlineInterval, bars: list[dict[str, object]]) -> None:
    _, kline_model = KLINE_INTERVAL_CONFIG[interval]
    rows: list[dict[str, object]] = []
    for bar in bars:
        timestamp = bar.get("time")
        if not isinstance(timestamp, int):
            continue
        try:
            rows.append({
                "instrument_id": instrument_id,
                "date_time": datetime.fromtimestamp(timestamp / 1000, timezone.utc).replace(tzinfo=None),
                "open": float(bar["open"]),
                "close": float(bar["close"]),
                "high": float(bar["high"]),
                "low": float(bar["low"]),
                "volume": float(bar["volume"]),
                "hold": float(bar["hold"]),
            })
        except (KeyError, TypeError, ValueError):
            continue
    if not rows:
        return
    statement = insert(kline_model).values(rows)
    from app.db.database import engine

    with Session(engine) as session:
        session.exec(statement.on_conflict_do_update(
            index_elements=["instrument_id", "date_time"],
            set_={field: getattr(statement.excluded, field) for field in ("open", "close", "high", "low", "volume", "hold")},
        ))
        session.commit()


def _aggregate_5m_klines(klines: list[FutureCnKline5m], aggregation_seconds: int) -> list[FutureCnKline5m]:
    aggregated_klines: list[FutureCnKline5m] = []
    current_bucket_start: datetime | None = None
    current_aggregate: FutureCnKline5m | None = None

    for kline in klines:
        bucket_timestamp = int(kline.date_time.replace(tzinfo=timezone.utc).timestamp())
        bucket_start = datetime.fromtimestamp(bucket_timestamp - bucket_timestamp % aggregation_seconds, timezone.utc).replace(tzinfo=None)
        if bucket_start != current_bucket_start:
            current_bucket_start = bucket_start
            current_aggregate = FutureCnKline5m(
                instrument_id=kline.instrument_id,
                date_time=bucket_start,
                open=kline.open,
                close=kline.close,
                high=kline.high,
                low=kline.low,
                volume=kline.volume,
                hold=kline.hold,
            )
            aggregated_klines.append(current_aggregate)
            continue

        if current_aggregate is None:
            continue
        current_aggregate.close = kline.close
        current_aggregate.high = max(current_aggregate.high, kline.high)
        current_aggregate.low = min(current_aggregate.low, kline.low)
        current_aggregate.volume += kline.volume
        current_aggregate.hold = kline.hold

    return aggregated_klines


def _get_instrument(session: Session, provider_symbol: str) -> tuple[str, MarketInstrument]:
    exchange_code, separator, symbol = provider_symbol.strip().partition(".")
    if not separator or not symbol:
        raise ValueError("Symbol must use the TqSdk format EXCHANGE.SYMBOL")
    exchange_code = exchange_code.upper()
    mic = TQSDK_EXCHANGE_TO_MIC.get(exchange_code)
    if mic is None:
        raise ValueError(f"Unsupported domestic futures exchange: {exchange_code}")

    exchange = session.exec(select(MarketExchange).where(MarketExchange.mic == mic)).first()
    if exchange is None:
        raise MarketDataNotFoundError(f"Market exchange not found for MIC: {mic}")
    instrument = session.exec(
        select(MarketInstrument).where(
            MarketInstrument.exchange_id == exchange.id,
            func.lower(MarketInstrument.symbol) == symbol.lower(),
            MarketInstrument.instrument_type == MarketInstrumentType.FUTURE,
        )
    ).first()
    if instrument is None:
        raise MarketDataNotFoundError(f"Market instrument not found: {exchange_code}.{symbol}")
    return exchange_code, instrument
