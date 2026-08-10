from collections.abc import Generator

from sqlalchemy import text
from sqlalchemy.engine import URL
from sqlmodel import Session, create_engine

from app.config.settings import settings

database_url = URL.create(
    drivername="postgresql+psycopg",
    username=settings.postgres_user,
    password=settings.postgres_password,
    host=settings.postgres_host,
    port=int(settings.postgres_port),
    database=settings.postgres_database,
)

engine = create_engine(
    database_url,
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def check_database_connection() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def initialize_market_data_schema() -> None:
    from app.models import future_cn_kline, market_exchange, market_instrument

    with engine.begin() as connection:
        connection.execute(text("CREATE SCHEMA IF NOT EXISTS market_data"))
    market_exchange.SQLModel.metadata.create_all(engine)


def dispose_database_engine() -> None:
    engine.dispose()
