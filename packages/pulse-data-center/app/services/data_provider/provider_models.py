from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class FutureInstrumentData:
    provider_symbol: str
    exchange_code: str
    symbol: str
    name: str
    product_code: str | None
    listed_at: datetime | None
    expired_at: datetime | None
    price_tick: Decimal | None
    volume_multiple: Decimal | None
    trading_time: dict[str, list[list[str]]] | None


@dataclass(frozen=True)
class KlineData:
    date_time: datetime
    open: Decimal
    close: Decimal
    high: Decimal
    low: Decimal
    volume: Decimal
    hold: Decimal
