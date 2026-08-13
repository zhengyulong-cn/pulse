import asyncio
from collections.abc import Iterable

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select

from app.db.database import engine
from app.models import MarketExchange, MarketInstrument
from app.services.market_data.realtime_market_service import RealtimeMarketService

router = APIRouter(tags=["Realtime Market"])
realtime_market_service: RealtimeMarketService | None = None


def configure_realtime_market_service(service: RealtimeMarketService) -> None:
    global realtime_market_service
    realtime_market_service = service


def _get_provider_symbols(instrument_ids: Iterable[int]) -> dict[int, str]:
    ids = list(set(instrument_ids))
    if not ids:
        return {}
    with Session(engine) as session:
        rows = session.exec(
            select(MarketInstrument.id, MarketInstrument.symbol, MarketExchange.mic)
            .join(MarketExchange, MarketInstrument.exchange_id == MarketExchange.id)
            .where(MarketInstrument.id.in_(ids))
        ).all()
    mic_to_tqsdk_exchange = {"XSGE": "SHFE", "XDCE": "DCE", "XZCE": "CZCE", "CCFX": "CFFEX", "XINE": "INE", "XGFE": "GFEX"}
    return {instrument_id: f"{mic_to_tqsdk_exchange[mic]}.{symbol}" for instrument_id, symbol, mic in rows if mic in mic_to_tqsdk_exchange}


@router.websocket("/ws/market")
async def market_websocket(websocket: WebSocket) -> None:
    if realtime_market_service is None:
        await websocket.close(code=1011)
        return
    await websocket.accept()
    queue: asyncio.Queue[dict] = asyncio.Queue()
    loop = asyncio.get_running_loop()
    realtime_market_service.add_listener(loop, queue)

    async def send_events() -> None:
        while True:
            await websocket.send_json(await queue.get())

    sender = asyncio.create_task(send_events())
    try:
        while True:
            message = await websocket.receive_json()
            instrument_ids = message.get("instrument_ids", [])
            if message.get("action") == "subscribe" and isinstance(instrument_ids, list):
                symbols = _get_provider_symbols(item for item in instrument_ids if isinstance(item, int))
                realtime_market_service.subscribe(symbols)
                await websocket.send_json({"type": "subscribed", "data": {"instrument_ids": list(symbols)}})
                for bar in realtime_market_service.get_realtime_bars(symbols):
                    await websocket.send_json({"type": "bar", "data": bar})
            elif message.get("action") == "unsubscribe" and isinstance(instrument_ids, list):
                realtime_market_service.unsubscribe(item for item in instrument_ids if isinstance(item, int))
    except WebSocketDisconnect:
        pass
    finally:
        sender.cancel()
        realtime_market_service.remove_listener(loop, queue)
