from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MarketExchangeCreate(BaseModel):
    name: str = Field(min_length=1)
    english_name: str = Field(min_length=1)
    mic: str = Field(min_length=1)
    country_code: str = Field(min_length=2, max_length=2)
    city: str = Field(min_length=1)
    timezone: str = Field(min_length=1)
    currency: str = Field(min_length=1)
    is_active: bool = True


class MarketExchangeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    english_name: str | None = Field(default=None, min_length=1)
    mic: str | None = Field(default=None, min_length=1)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    city: str | None = Field(default=None, min_length=1)
    timezone: str | None = Field(default=None, min_length=1)
    currency: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None


class MarketExchangeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    english_name: str
    mic: str
    country_code: str
    city: str
    timezone: str
    currency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
