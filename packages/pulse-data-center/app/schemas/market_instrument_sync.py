from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MarketInstrumentSyncJobRead(BaseModel):
    id: str
    status: Literal["running", "succeeded", "failed"]
    stage: Literal["fetching", "persisting", "completed", "failed"]
    total: int | None
    processed: int
    synced_count: int | None
    deactivated_count: int | None
    error: str | None
    started_at: datetime
    finished_at: datetime | None
