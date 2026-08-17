from datetime import datetime, timezone
from decimal import Decimal

from app.models.future_cn_kline import FutureCnKline5m
from app.services.data_provider.tqsdk_provider.tqsdk_provider import TqSdkMarketDataProvider
from app.services.market_data.future_cn_kline_service import _aggregate_5m_klines, list_future_cn_kline_bars
from app.services.market_data.realtime_market_service import RealtimeMarketService


def test_tqsdk_provider_uses_kline_closing_time() -> None:
    opening_time = datetime(2026, 8, 17, 1, 0, tzinfo=timezone.utc)
    row = {
        "datetime": int(opening_time.timestamp() * 1_000_000_000),
        "open": "100",
        "close": "101",
        "high": "102",
        "low": "99",
        "volume": "10",
        "close_oi": "20",
    }

    kline = TqSdkMarketDataProvider()._to_kline_data(row, 300)

    assert kline is not None
    assert kline.date_time == datetime(2026, 8, 17, 1, 5)


def test_realtime_kline_uses_kline_closing_time() -> None:
    opening_time = datetime(2026, 8, 17, 1, 0, tzinfo=timezone.utc)
    row = {
        "datetime": int(opening_time.timestamp() * 1_000_000_000),
        "open": 100,
        "close": 101,
        "high": 102,
        "low": 99,
        "volume": 10,
        "close_oi": 20,
    }

    kline = RealtimeMarketService._bar_from_row(row, 300)

    assert kline is not None
    assert kline.time == int(datetime(2026, 8, 17, 1, 5, tzinfo=timezone.utc).timestamp() * 1_000)


def test_aggregate_5m_klines_uses_closing_boundary() -> None:
    def kline(closing_minute: int, close: str) -> FutureCnKline5m:
        return FutureCnKline5m(
            instrument_id=1,
            date_time=datetime(2026, 8, 17, 1, closing_minute),
            open=Decimal("100"),
            close=Decimal(close),
            high=Decimal("102"),
            low=Decimal("99"),
            volume=Decimal("10"),
            hold=Decimal("20"),
        )

    aggregated = _aggregate_5m_klines([kline(5, "101"), kline(10, "102"), kline(15, "103")], 15 * 60)

    assert len(aggregated) == 1
    assert aggregated[0].date_time == datetime(2026, 8, 17, 1, 15)
    assert aggregated[0].close == Decimal("103")


def test_list_kline_bars_returns_closing_time() -> None:
    class SessionStub:
        def exec(self, _statement: object) -> list[FutureCnKline5m]:
            return [
                FutureCnKline5m(
                    instrument_id=1,
                    date_time=datetime(2026, 8, 17, 1, 5),
                    open=Decimal("100"),
                    close=Decimal("101"),
                    high=Decimal("102"),
                    low=Decimal("99"),
                    volume=Decimal("10"),
                    hold=Decimal("20"),
                ),
            ]

    bars = list_future_cn_kline_bars(
        SessionStub(),
        instrument_id=1,
        interval="5m",
        from_timestamp=int(datetime(2026, 8, 17, 1, 0, tzinfo=timezone.utc).timestamp()),
        to_timestamp=int(datetime(2026, 8, 17, 1, 10, tzinfo=timezone.utc).timestamp()),
        limit=100,
    )

    assert [bar.time for bar in bars] == [int(datetime(2026, 8, 17, 1, 5, tzinfo=timezone.utc).timestamp() * 1_000)]
