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


class FutureCnKlineBatchSyncRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=1000, examples=[["DCE.jm2609", "CZCE.RM609"]])
    interval: Literal["1m", "5m"]


class FutureCnKlineBatchSyncItemRead(BaseModel):
    symbol: str
    status: Literal["pending", "succeeded", "failed"]
    result: FutureCnKlineSyncRead | None
    error: str | None


class FutureCnKlineBatchSyncJobRead(BaseModel):
    id: str
    status: Literal["running", "succeeded", "failed"]
    stage: Literal["syncing", "completed", "failed"]
    interval: Literal["1m", "5m"]
    total: int
    processed: int
    success_count: int
    failed_count: int
    error: str | None
    items: list[FutureCnKlineBatchSyncItemRead]
    started_at: datetime
    finished_at: datetime | None


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
