from app.services.data_provider.tqsdk_provider.tqsdk_client import tqsdk_client_manager

class TqSdkMarketDataProvider:
    def _split_provider_symbol(self, provider_symbol: str) -> tuple[str, str]:
        if "." not in provider_symbol:
            return "", provider_symbol
        exchange, symbol = provider_symbol.split(".", 1)
        return exchange.upper(), symbol