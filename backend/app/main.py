from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, found_items, lost_items, notifications
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging()

app = FastAPI(title="ReFind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(lost_items.router, prefix="/api/v1")
app.include_router(found_items.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
