import asyncio
import json
import time
from collections.abc import Iterable
from dataclasses import asdict, dataclass
from datetime import datetime
from threading import Event, RLock, Thread
from zoneinfo import ZoneInfo

from redis import Redis
from tqsdk import TqApi, TqAuth

from app.config.settings import settings

KLINE_INTERVAL_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600}
REALTIME_BACKFILL_BAR_COUNT = 500
SHANGHAI_TIMEZONE = ZoneInfo("Asia/Shanghai")


def _to_timestamp_nanoseconds(value: object) -> int | None:
    if isinstance(value, int):
        return value
    if not isinstance(value, str):
        return None
    try:
        return int(datetime.fromisoformat(value).replace(tzinfo=SHANGHAI_TIMEZONE).timestamp() * 1_000_000_000)
    except ValueError:
        return None


@dataclass
class RealtimeBar:
    close: float
    high: float
    hold: float
    low: float
    open: float
    time: int
    volume: float


class RealtimeMarketService:
    def __init__(self, redis_client: Redis):
        self._bars: dict[tuple[int, str], RealtimeBar] = {}
        self._listeners: set[tuple[asyncio.AbstractEventLoop, asyncio.Queue[dict]]] = set()
        self._lock = RLock()
        self._redis = redis_client
        self._stop_event = Event()
        self._subscriptions: dict[int, str] = {}
        self._thread: Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = Thread(target=self._run, name="realtime-market", daemon=True)
        self._thread.start()

    def close(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._thread = None

    def subscribe(self, instrument_symbols: dict[int, str]) -> None:
        with self._lock:
            self._subscriptions.update(instrument_symbols)

    def unsubscribe(self, instrument_ids: Iterable[int]) -> None:
        with self._lock:
            for instrument_id in instrument_ids:
                self._subscriptions.pop(instrument_id, None)

    def add_listener(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue[dict]) -> None:
        with self._lock:
            self._listeners.add((loop, queue))

    def remove_listener(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue[dict]) -> None:
        with self._lock:
            self._listeners.discard((loop, queue))

    def get_realtime_bars(self, instrument_ids: Iterable[int]) -> list[dict]:
        bars: list[dict] = []
        for instrument_id in set(instrument_ids):
            for interval in KLINE_INTERVAL_SECONDS:
                entries = self._redis.hvals(f"market:bars:{instrument_id}:{interval}")
                for entry in entries:
                    bars.append(json.loads(entry))
        return sorted(bars, key=lambda bar: (bar["instrument_id"], bar["interval"], bar["time"]))

    def _run(self) -> None:
        api: TqApi | None = None
        quotes: dict[int, object] = {}
        subscribed_symbols: dict[int, str] = {}
        try:
            api = TqApi(web_gui=False, auth=TqAuth(settings.tqsdk_username, settings.tqsdk_password))
            while not self._stop_event.is_set():
                with self._lock:
                    requested_symbols = dict(self._subscriptions)
                if requested_symbols != subscribed_symbols:
                    added_symbols = {
                        instrument_id: symbol
                        for instrument_id, symbol in requested_symbols.items()
                        if subscribed_symbols.get(instrument_id) != symbol
                    }
                    subscribed_symbols = requested_symbols
                    quotes = {
                        instrument_id: api.get_quote(symbol)
                        for instrument_id, symbol in subscribed_symbols.items()
                    }
                    for instrument_id, symbol in added_symbols.items():
                        self._backfill_bars(api, instrument_id, symbol)
                if not quotes:
                    self._stop_event.wait(0.2)
                    continue
                api.wait_update(deadline=time.time() + 0.5)
                for instrument_id, quote in quotes.items():
                    if api.is_changing(quote):
                        self._handle_quote(instrument_id, quote)
        finally:
            if api:
                api.close()

    def _handle_quote(self, instrument_id: int, quote: object) -> None:
        price = getattr(quote, "last_price", None)
        timestamp = _to_timestamp_nanoseconds(getattr(quote, "datetime", None))
        if not isinstance(price, (int, float)) or timestamp is None or price != price:
            return
        hold = float(getattr(quote, "open_interest", 0) or 0)
        volume = float(getattr(quote, "volume", 0) or 0)
        tick = {"instrument_id": instrument_id, "price": float(price), "time": timestamp, "volume": volume, "hold": hold}
        self._redis.set(f"market:tick:{instrument_id}", json.dumps(tick))
        self._publish({"type": "tick", "data": tick})
        for interval, seconds in KLINE_INTERVAL_SECONDS.items():
            bar_time = timestamp // 1_000_000_000 // seconds * seconds * 1_000
            key = (instrument_id, interval)
            bar = self._bars.get(key)
            if bar is None or bar.time != bar_time:
                bar = RealtimeBar(float(price), float(price), hold, float(price), float(price), bar_time, volume)
                self._bars[key] = bar
            else:
                bar.close = float(price)
                bar.high = max(bar.high, float(price))
                bar.low = min(bar.low, float(price))
                bar.hold = hold
                bar.volume = volume
            event = {"type": "bar", "data": {"instrument_id": instrument_id, "interval": interval, **asdict(bar)}}
            self._save_and_publish_bar(event)

    def _backfill_bars(self, api: TqApi, instrument_id: int, symbol: str) -> None:
        for interval, seconds in KLINE_INTERVAL_SECONDS.items():
            serial = api.get_kline_serial(symbol, seconds, REALTIME_BACKFILL_BAR_COUNT)
            for _, row in serial.iterrows():
                timestamp = _to_timestamp_nanoseconds(row.get("datetime"))
                open_price = row.get("open")
                high_price = row.get("high")
                low_price = row.get("low")
                close_price = row.get("close")
                if timestamp is None or not all(isinstance(price, (int, float)) and price == price for price in (open_price, high_price, low_price, close_price)):
                    continue
                bar = RealtimeBar(
                    close=float(close_price),
                    high=float(high_price),
                    hold=float(row.get("close_oi", 0) or 0),
                    low=float(low_price),
                    open=float(open_price),
                    time=timestamp // 1_000_000_000 * 1_000,
                    volume=float(row.get("volume", 0) or 0),
                )
                self._bars[(instrument_id, interval)] = bar
                event = {"type": "bar", "data": {"instrument_id": instrument_id, "interval": interval, **asdict(bar)}}
                self._save_and_publish_bar(event)

    def _save_and_publish_bar(self, event: dict) -> None:
        bar = event["data"]
        bar_key = f"market:bars:{bar['instrument_id']}:{bar['interval']}"
        self._redis.hset(bar_key, str(bar["time"]), json.dumps(bar))
        self._redis.expire(bar_key, 172_800)
        self._redis.publish("market:bars", json.dumps(event))
        self._publish(event)

    def _publish(self, event: dict) -> None:
        with self._lock:
            listeners = list(self._listeners)
        for loop, queue in listeners:
            loop.call_soon_threadsafe(queue.put_nowait, event)
