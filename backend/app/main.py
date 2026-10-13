import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, found_items, lost_items, notifications
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load the ONNX embedding model off the request path so the first lost-item
    # registration does not pay the model-load cost.
    threading.Thread(target=_warm_up_encoder, daemon=True).start()
    yield


def _warm_up_encoder() -> None:
    try:
        from app.ai.text_encoder import encode_text

        encode_text("warm up")
    except Exception:  # noqa: BLE001 - warm-up is best effort
        logging.getLogger(__name__).warning("Text encoder warm-up failed", exc_info=True)


app = FastAPI(title="ReFind API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    # Hosting platforms issue per-deployment/branch URLs in addition to the
    # stable production domain; allow those via a narrowly scoped regex
    # instead of opening CORS to the whole platform domain.
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Cache preflights so each cross-origin JSON call skips an extra OPTIONS round trip.
    max_age=600,
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(lost_items.router, prefix="/api/v1")
app.include_router(found_items.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
