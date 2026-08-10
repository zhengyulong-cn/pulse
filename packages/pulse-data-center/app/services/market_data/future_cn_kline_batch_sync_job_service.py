from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock, Thread
from uuid import uuid4

from sqlmodel import Session

from app.config.logging_config import get_logger
from app.db.database import engine
from app.schemas.future_cn_kline import (
    FutureCnKlineBatchSyncItemRead,
    FutureCnKlineBatchSyncJobRead,
    FutureCnKlineSyncRead,
)
from app.services.market_data.future_cn_kline_service import KlineInterval, sync_future_cn_kline

logger = get_logger(__name__)


class FutureCnKlineBatchSyncAlreadyRunningError(Exception):
    pass


class FutureCnKlineBatchSyncJobNotFoundError(Exception):
    pass


@dataclass
class _FutureCnKlineBatchSyncItem:
    symbol: str
    status: str
    result: FutureCnKlineSyncRead | None = None
    error: str | None = None

    def to_read_model(self) -> FutureCnKlineBatchSyncItemRead:
        return FutureCnKlineBatchSyncItemRead(
            symbol=self.symbol,
            status=self.status,
            result=self.result,
            error=self.error,
        )


@dataclass
class _FutureCnKlineBatchSyncJob:
    id: str
    status: str
    stage: str
    interval: KlineInterval
    total: int
    processed: int
    success_count: int
    failed_count: int
    error: str | None
    items: list[_FutureCnKlineBatchSyncItem] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None

    def to_read_model(self) -> FutureCnKlineBatchSyncJobRead:
        return FutureCnKlineBatchSyncJobRead(
            id=self.id,
            status=self.status,
            stage=self.stage,
            interval=self.interval,
            total=self.total,
            processed=self.processed,
            success_count=self.success_count,
            failed_count=self.failed_count,
            error=self.error,
            items=[item.to_read_model() for item in self.items],
            started_at=self.started_at,
            finished_at=self.finished_at,
        )


class FutureCnKlineBatchSyncJobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, _FutureCnKlineBatchSyncJob] = {}
        self._running_job_id: str | None = None
        self._lock = Lock()

    def start(self, symbols: list[str], interval: KlineInterval) -> FutureCnKlineBatchSyncJobRead:
        unique_symbols = list(dict.fromkeys(symbol.strip() for symbol in symbols))
        if not all(unique_symbols):
            raise ValueError("symbols must not contain blank values")

        with self._lock:
            if self._running_job_id is not None:
                raise FutureCnKlineBatchSyncAlreadyRunningError("A futures K-line batch sync is already running")

            job = _FutureCnKlineBatchSyncJob(
                id=str(uuid4()),
                status="running",
                stage="syncing",
                interval=interval,
                total=len(unique_symbols),
                processed=0,
                success_count=0,
                failed_count=0,
                error=None,
                items=[_FutureCnKlineBatchSyncItem(symbol=symbol, status="pending") for symbol in unique_symbols],
            )
            self._jobs[job.id] = job
            self._running_job_id = job.id

        Thread(target=self._run, args=(job.id,), daemon=True, name=f"future-cn-kline-sync-{job.id}").start()
        return job.to_read_model()

    def get(self, job_id: str) -> FutureCnKlineBatchSyncJobRead:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise FutureCnKlineBatchSyncJobNotFoundError("Futures K-line batch sync job not found")
            return job.to_read_model()

    def _run(self, job_id: str) -> None:
        try:
            with Session(engine) as session:
                while (item := self._next_pending_item(job_id)) is not None:
                    try:
                        result = sync_future_cn_kline(session, item.symbol, self._get_interval(job_id))
                    except Exception as exc:
                        session.rollback()
                        logger.exception("Futures K-line batch sync item failed: symbol=%s", item.symbol)
                        self._set_item_failed(job_id, item, str(exc))
                    else:
                        self._set_item_succeeded(job_id, item, result)
            self._set_succeeded(job_id)
        except Exception as exc:
            logger.exception("Futures K-line batch sync failed")
            self._set_failed(job_id, str(exc))

    def _next_pending_item(self, job_id: str) -> _FutureCnKlineBatchSyncItem | None:
        with self._lock:
            job = self._jobs[job_id]
            return next((item for item in job.items if item.status == "pending"), None)

    def _get_interval(self, job_id: str) -> KlineInterval:
        with self._lock:
            return self._jobs[job_id].interval

    def _set_item_succeeded(
        self,
        job_id: str,
        item: _FutureCnKlineBatchSyncItem,
        result,
    ) -> None:
        with self._lock:
            job = self._jobs[job_id]
            item.status = "succeeded"
            item.result = FutureCnKlineSyncRead(
                instrument_id=result.instrument_id,
                symbol=result.symbol,
                interval=result.interval,
                received_count=result.received_count,
                persisted_count=result.persisted_count,
            )
            job.processed += 1
            job.success_count += 1

    def _set_item_failed(self, job_id: str, item: _FutureCnKlineBatchSyncItem, error: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            item.status = "failed"
            item.error = error
            job.processed += 1
            job.failed_count += 1

    def _set_succeeded(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = "succeeded"
            job.stage = "completed"
            job.finished_at = datetime.utcnow()
            self._running_job_id = None

    def _set_failed(self, job_id: str, error: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = "failed"
            job.stage = "failed"
            job.error = error
            job.finished_at = datetime.utcnow()
            self._running_job_id = None


future_cn_kline_batch_sync_job_manager = FutureCnKlineBatchSyncJobManager()
