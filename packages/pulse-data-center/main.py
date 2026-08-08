import uvicorn
from app.config.settings import settings

def run() -> None:
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_reload,
    )

if __name__ == "__main__":
    run()
