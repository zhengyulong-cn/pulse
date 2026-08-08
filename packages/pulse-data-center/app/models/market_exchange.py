from datetime import datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.constants import MARKET_DATA_SCHEMA


class MarketExchange(SQLModel, table=True):
    __tablename__ = "exchange"
    __table_args__ = (
        UniqueConstraint("mic", name="market_exchange_mic_key"),
        {"schema": MARKET_DATA_SCHEMA},
    )

    id: int | None = Field(default=None, primary_key=True)
    name: str
    english_name: str
    mic: str = Field(index=True)
    country_code: str
    city: str
    timezone: str
    currency: str
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
