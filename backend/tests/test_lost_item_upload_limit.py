import pytest
from fastapi import HTTPException

from app.services.lost_item_service import MAX_IMAGE_SIZE_BYTES, _read_upload_within_limit


class _FakeUpload:
    """Minimal stand-in for FastAPI's UploadFile: chunked async .read(size)."""

    def __init__(self, total_size: int) -> None:
        self.remaining = total_size

    async def read(self, size: int = -1) -> bytes:
        if self.remaining <= 0:
            return b""
        take = min(size, self.remaining) if size > 0 else self.remaining
        self.remaining -= take
        return b"x" * take


async def test_read_upload_within_limit_accepts_small_file() -> None:
    content = await _read_upload_within_limit(_FakeUpload(1024), MAX_IMAGE_SIZE_BYTES)
    assert len(content) == 1024


async def test_read_upload_within_limit_rejects_oversized_file_before_buffering_it_all() -> None:
    upload = _FakeUpload(MAX_IMAGE_SIZE_BYTES * 50)

    with pytest.raises(HTTPException) as exc_info:
        await _read_upload_within_limit(upload, MAX_IMAGE_SIZE_BYTES)

    assert exc_info.value.status_code == 400
    # Reading stops within a chunk of the limit rather than draining the
    # whole (simulated) 500MB body into memory first.
    assert upload.remaining > MAX_IMAGE_SIZE_BYTES * 40
