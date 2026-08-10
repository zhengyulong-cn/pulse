from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel

from app.models.constants import MARKET_DATA_SCHEMA


class FutureCnKline1m(SQLModel, table=True):
    __tablename__ = "future_cn_1m"
    __table_args__ = {"schema": MARKET_DATA_SCHEMA}

    instrument_id: int = Field(foreign_key="market_data.instrument.id", primary_key=True)
    date_time: datetime = Field(primary_key=True)
    open: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    close: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    high: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    low: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    volume: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    hold: Decimal = Field(sa_column=Column(Numeric, nullable=False))


class FutureCnKline5m(SQLModel, table=True):
    __tablename__ = "future_cn_5m"
    __table_args__ = {"schema": MARKET_DATA_SCHEMA}

    instrument_id: int = Field(foreign_key="market_data.instrument.id", primary_key=True)
    date_time: datetime = Field(primary_key=True)
    open: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    close: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    high: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    low: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    volume: Decimal = Field(sa_column=Column(Numeric, nullable=False))
    hold: Decimal = Field(sa_column=Column(Numeric, nullable=False))
