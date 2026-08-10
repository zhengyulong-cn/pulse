from dataclasses import dataclass
from datetime import datetime
from threading import Lock, Thread
from uuid import uuid4

from sqlmodel import Session

from app.config.logging_config import get_logger
from app.db.database import engine
from app.schemas.market_instrument_sync import MarketInstrumentSyncJobRead
from app.services.data_provider import get_data_provider
from app.services.market_data.market_instrument_sync_service import sync_active_futures

logger = get_logger(__name__)


class InstrumentSyncAlreadyRunningError(Exception):
    pass


class InstrumentSyncJobNotFoundError(Exception):
    pass


@dataclass
class _InstrumentSyncJob:
    id: str
    status: str
    stage: str
    total: int | None
    processed: int
    synced_count: int | None
    deactivated_count: int | None
    error: str | None
    started_at: datetime
    finished_at: datetime | None

    def to_read_model(self) -> MarketInstrumentSyncJobRead:
        return MarketInstrumentSyncJobRead(
            id=self.id,
            status=self.status,
            stage=self.stage,
            total=self.total,
            processed=self.processed,
            synced_count=self.synced_count,
            deactivated_count=self.deactivated_count,
            error=self.error,
            started_at=self.started_at,
            finished_at=self.finished_at,
        )


class InstrumentSyncJobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, _InstrumentSyncJob] = {}
        self._running_job_id: str | None = None
        self._lock = Lock()

    def start(self) -> MarketInstrumentSyncJobRead:
        with self._lock:
            if self._running_job_id is not None:
                raise InstrumentSyncAlreadyRunningError("A market instrument sync is already running")

            job = _InstrumentSyncJob(
                id=str(uuid4()),
                status="running",
                stage="fetching",
                total=None,
                processed=0,
                synced_count=None,
                deactivated_count=None,
                error=None,
                started_at=datetime.utcnow(),
                finished_at=None,
            )
            self._jobs[job.id] = job
            self._running_job_id = job.id
        Thread(target=self._run, args=(job.id,), daemon=True, name=f"instrument-sync-{job.id}").start()
        return job.to_read_model()

    def get(self, job_id: str) -> MarketInstrumentSyncJobRead:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise InstrumentSyncJobNotFoundError("Market instrument sync job not found")
            return job.to_read_model()

    def _run(self, job_id: str) -> None:
        try:
            provider = get_data_provider("tqsdk")
            logger.info("Market instrument sync worker started: provider=%s", type(provider).__name__)
            futures = provider.list_active_futures(
                progress_callback=lambda processed, total: self._set_fetch_progress(job_id, processed, total)
            )
            logger.info("Market instrument sync provider returned: %s futures", len(futures))
            self._set_stage(job_id, "persisting")
            with Session(engine) as session:
                result = sync_active_futures(session, futures)
            self._set_succeeded(job_id, result.synced_count, result.deactivated_count)
        except Exception as exc:
            logger.exception("Market instrument sync failed")
            self._set_failed(job_id, str(exc))

    def _set_fetch_progress(self, job_id: str, processed: int, total: int) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.processed = processed
            job.total = total

    def _set_stage(self, job_id: str, stage: str) -> None:
        with self._lock:
            self._jobs[job_id].stage = stage

    def _set_succeeded(self, job_id: str, synced_count: int, deactivated_count: int) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = "succeeded"
            job.stage = "completed"
            job.synced_count = synced_count
            job.deactivated_count = deactivated_count
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


instrument_sync_job_manager = InstrumentSyncJobManager()
