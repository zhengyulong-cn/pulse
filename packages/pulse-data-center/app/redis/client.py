from redis import Redis

from app.config.settings import settings


def _create_redis_client() -> Redis:
    return Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_database,
        password=settings.redis_password,
        decode_responses=True,
    )


redis_client = _create_redis_client()


def get_redis_client() -> Redis:
    return redis_client


def check_redis_connection() -> None:
    redis_client.ping()


def close_redis_client() -> None:
    redis_client.close()
