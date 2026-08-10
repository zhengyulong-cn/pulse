from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from math import isnan
from typing import Any, Callable

from app.services.data_provider.provider_models import FutureInstrumentData
from app.services.data_provider.tqsdk_provider.tqsdk_client import tqsdk_client_manager

DOMESTIC_FUTURE_EXCHANGE_CODES = ("SHFE", "DCE", "CZCE", "CFFEX", "INE", "GFEX")


class TqSdkMarketDataProvider:
    def __init__(self, quote_batch_size: int = 50) -> None:
        if quote_batch_size <= 0:
            raise ValueError("Quote batch size must be greater than zero")
        self._quote_batch_size = quote_batch_size

    def list_active_futures(
        self,
        progress_callback: Callable[[int, int], None] | None = None,
    ) -> list[FutureInstrumentData]:
        with tqsdk_client_manager.session() as api:
            provider_symbols = list(
                api.query_quotes(
                    ins_class=["FUTURE"],
                    exchange_id=list(DOMESTIC_FUTURE_EXCHANGE_CODES),
                    expired=False,
                )
            )
            provider_symbols = [
                provider_symbol
                for provider_symbol in provider_symbols
                if self._split_provider_symbol(provider_symbol)[0] in DOMESTIC_FUTURE_EXCHANGE_CODES
            ]

            futures: list[FutureInstrumentData] = []
            total = len(provider_symbols)
            for start_index in range(0, total, self._quote_batch_size):
                provider_symbol_batch = provider_symbols[start_index : start_index + self._quote_batch_size]
                symbol_info = api.query_symbol_info(provider_symbol_batch)
                futures.extend(self._to_future_instrument(row) for _, row in symbol_info.iterrows())
                if progress_callback is not None:
                    progress_callback(len(futures), total)

        return futures

    def _split_provider_symbol(self, provider_symbol: str) -> tuple[str, str]:
        if "." not in provider_symbol:
            return "", provider_symbol
        exchange, symbol = provider_symbol.split(".", 1)
        return exchange.upper(), symbol

    def _to_future_instrument(self, quote: Any) -> FutureInstrumentData:
        provider_symbol = str(self._get_value(quote, "instrument_id"))
        exchange_code, symbol = self._split_provider_symbol(provider_symbol)

        return FutureInstrumentData(
            provider_symbol=provider_symbol,
            exchange_code=exchange_code,
            symbol=symbol,
            name=str(self._get_value(quote, "instrument_name")),
            product_code=self._to_optional_text(self._get_value(quote, "product_id")),
            listed_at=None,
            expired_at=self._to_datetime(self._get_value(quote, "expire_datetime")),
            price_tick=self._to_decimal(self._get_value(quote, "price_tick")),
            volume_multiple=self._to_decimal(self._get_value(quote, "volume_multiple")),
            trading_time=self._to_trading_time(
                self._get_value(quote, "trading_time_day"),
                self._get_value(quote, "trading_time_night"),
            ),
        )

    @staticmethod
    def _get_value(row: Any, field: str) -> Any:
        if hasattr(row, "get"):
            return row.get(field)
        return getattr(row, field, None)

    @staticmethod
    def _to_optional_text(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _to_datetime(value: Any) -> datetime | None:
        if value is None:
            return None
        try:
            timestamp = float(value)
        except (TypeError, ValueError):
            return None
        if isnan(timestamp) or timestamp <= 0:
            return None
        return datetime.fromtimestamp(timestamp, timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _to_decimal(value: Any) -> Decimal | None:
        if value is None:
            return None
        try:
            result = Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None
        return result if result.is_finite() and result > 0 else None

    @staticmethod
    def _to_trading_time(day: Any, night: Any) -> dict[str, list[list[str]]] | None:
        trading_time: dict[str, list[list[str]]] = {}
        for session_type, periods in (("day", day), ("night", night)):
            normalized_periods = TqSdkMarketDataProvider._normalize_trading_periods(periods)
            if normalized_periods:
                trading_time[session_type] = normalized_periods

        return trading_time or None

    @staticmethod
    def _normalize_trading_periods(value: Any) -> list[list[str]]:
        if not isinstance(value, (list, tuple)):
            return []
        return [
            [str(period[0]), str(period[1])]
            for period in value
            if isinstance(period, (list, tuple)) and len(period) == 2
        ]
