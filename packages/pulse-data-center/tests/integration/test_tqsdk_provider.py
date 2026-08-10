from dataclasses import asdict
import os
from pprint import pprint

import pytest

from app.services.data_provider import get_data_provider
from app.services.data_provider.tqsdk_provider import tqsdk_client_manager


@pytest.mark.integration
def test_list_active_futures_prints_samples() -> None:
    if os.getenv("RUN_TQSDK_INTEGRATION") != "true":
        pytest.skip("Set RUN_TQSDK_INTEGRATION=true to call the live TqSdk service")

    provider = get_data_provider("tqsdk")

    try:
        instruments = provider.list_active_futures()
    finally:
        tqsdk_client_manager.close()

    assert instruments

    print(f"Retrieved {len(instruments)} active futures")
    pprint([asdict(instrument) for instrument in instruments[:10]], sort_dicts=False)
