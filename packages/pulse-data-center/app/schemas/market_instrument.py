from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models import MarketInstrumentType
from app.schemas.market_exchange import MarketExchangeRead


class MarketInstrumentCreate(BaseModel):
    exchange_id: int = Field(gt=0)
    symbol: str = Field(min_length=1)
    name: str = Field(min_length=1)
    english_name: str | None = Field(default=None, min_length=1)
    instrument_type: MarketInstrumentType
    product_code: str | None = Field(default=None, min_length=1)
    listed_at: datetime | None = None
    expired_at: datetime | None = None
    price_tick: Decimal | None = Field(default=None, gt=0)
    volume_multiple: Decimal | None = Field(default=None, gt=0)
    trading_time: dict[str, list[list[str]]] | None = None
    is_active: bool = True
    extra_data: dict[str, Any] | None = None


class MarketInstrumentUpdate(BaseModel):
    exchange_id: int | None = Field(default=None, gt=0)
    symbol: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    english_name: str | None = Field(default=None, min_length=1)
    instrument_type: MarketInstrumentType | None = None
    product_code: str | None = Field(default=None, min_length=1)
    listed_at: datetime | None = None
    expired_at: datetime | None = None
    price_tick: Decimal | None = Field(default=None, gt=0)
    volume_multiple: Decimal | None = Field(default=None, gt=0)
    trading_time: dict[str, list[list[str]]] | None = None
    is_active: bool | None = None
    extra_data: dict[str, Any] | None = None


class MarketInstrumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exchange_id: int
    symbol: str
    name: str
    english_name: str | None
    instrument_type: MarketInstrumentType
    product_code: str | None
    listed_at: datetime | None
    expired_at: datetime | None
    price_tick: Decimal | None
    volume_multiple: Decimal | None
    trading_time: dict[str, list[list[str]]] | None
    is_active: bool
    extra_data: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class MarketInstrumentSearchRead(BaseModel):
    id: int
    symbol: str
    name: str
    english_name: str | None
    instrument_type: MarketInstrumentType
    exchange_mic: str
    exchange_name: str
    is_active: bool


class MarketInstrumentProductNodeRead(BaseModel):
    id: str
    exchange_id: int
    product_code: str
    name: str
    instrument_type: MarketInstrumentType
    is_active: bool
    instrument_count: int
    children: list[MarketInstrumentRead]


class MarketInstrumentExchangeNodeRead(MarketExchangeRead):
    product_count: int
    instrument_count: int
    children: list[MarketInstrumentProductNodeRead]
