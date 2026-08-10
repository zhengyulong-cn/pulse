from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class FutureCnKlineSyncRequest(BaseModel):
    symbol: str = Field(min_length=3, examples=["CZCE.OI609"])
    interval: Literal["1m", "5m"]


class FutureCnKlineSyncRead(BaseModel):
    instrument_id: int
    symbol: str
    interval: Literal["1m", "5m"]
    received_count: int
    persisted_count: int


class FutureCnKlineLatestRead(BaseModel):
    instrument_id: int
    interval: Literal["1m", "5m"]
    date_time: datetime
    open: Decimal
    close: Decimal
    high: Decimal
    low: Decimal
    volume: Decimal
    hold: Decimal
