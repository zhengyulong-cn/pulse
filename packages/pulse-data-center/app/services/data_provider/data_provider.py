from typing import Callable, Protocol

from app.services.data_provider.provider_models import FutureInstrumentData, KlineData
from app.services.data_provider.tqsdk_provider import TqSdkMarketDataProvider


class MarketDataProvider(Protocol):
    def list_active_futures(
        self,
        progress_callback: Callable[[int, int], None] | None = None,
    ) -> list[FutureInstrumentData]: ...

    def get_kline_data(
        self,
        symbol: str,
        interval_seconds: int,
        data_length: int,
    ) -> list[KlineData]: ...


class DataProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, MarketDataProvider] = {}

    def register(self, name: str, provider: MarketDataProvider) -> None:
        provider_name = self._normalize_name(name)
        if provider_name in self._providers:
            raise ValueError(f"Data provider '{provider_name}' is already registered")
        self._providers[provider_name] = provider

    def get(self, name: str) -> MarketDataProvider:
        provider_name = self._normalize_name(name)
        try:
            return self._providers[provider_name]
        except KeyError as exc:
            raise LookupError(f"Data provider '{provider_name}' is not registered") from exc

    @staticmethod
    def _normalize_name(name: str) -> str:
        provider_name = name.strip().lower()
        if not provider_name:
            raise ValueError("Data provider name cannot be empty")
        return provider_name


data_provider_registry = DataProviderRegistry()
data_provider_registry.register("tqsdk", TqSdkMarketDataProvider())


def get_data_provider(name: str = "tqsdk") -> MarketDataProvider:
    provider = data_provider_registry.get(name)
    return provider
