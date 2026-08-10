from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import Column, Enum as SqlEnum, Index, JSON, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.models.constants import MARKET_DATA_SCHEMA


class MarketInstrumentType(str, Enum):
    FUTURE = "FUTURE"
    STOCK = "STOCK"
    ETF = "ETF"
    INDEX = "INDEX"
    OPTION = "OPTION"


class MarketInstrument(SQLModel, table=True):
    __tablename__ = "instrument"
    __table_args__ = (
        UniqueConstraint("exchange_id", "symbol", name="market_instrument_exchange_symbol_key"),
        Index("market_instrument_type_active_idx", "instrument_type", "is_active"),
        Index("market_instrument_product_code_idx", "product_code"),
        Index("market_instrument_expired_at_idx", "expired_at"),
        {"schema": MARKET_DATA_SCHEMA},
    )

    id: int | None = Field(default=None, primary_key=True)
    exchange_id: int = Field(foreign_key="market_data.exchange.id", index=True)
    symbol: str
    name: str
    english_name: str | None = None
    instrument_type: MarketInstrumentType = Field(
        sa_column=Column(SqlEnum(MarketInstrumentType, native_enum=False), nullable=False)
    )
    product_code: str | None = None
    listed_at: datetime | None = None
    expired_at: datetime | None = None
    price_tick: Decimal | None = Field(default=None, sa_column=Column(Numeric))
    volume_multiple: Decimal | None = Field(default=None, sa_column=Column(Numeric))
    trading_time: dict[str, list[list[str]]] | None = Field(default=None, sa_column=Column(JSONB))
    is_active: bool = Field(default=True)
    extra_data: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
