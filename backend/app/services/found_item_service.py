import uuid
from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.normalizer import build_normalized_text
from app.ai.text_encoder import encode_text
from app.models import FoundItem, FoundItemStatus


def get_found_item(db: Session, found_item_id: uuid.UUID) -> FoundItem:
    found_item = db.get(FoundItem, found_item_id)
    if found_item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "습득물을 찾을 수 없습니다.")
    return found_item


def upsert_found_item(
    db: Session,
    source: str,
    source_item_id: str,
    title: str,
    category_code: str,
    color_codes: list[str],
    found_date: date,
    region_code: str,
    place_text: str | None = None,
    storage_place: str | None = None,
    contact_text: str | None = None,
    description: str | None = None,
    image_url: str | None = None,
    detail_url: str | None = None,
    status_value: FoundItemStatus = FoundItemStatus.STORED,
    raw_payload: dict | None = None,
) -> tuple[FoundItem, bool]:
    """Upsert on (source, source_item_id) per spec §9.2. Returns (item, is_new)."""
    existing = (
        db.query(FoundItem)
        .filter(FoundItem.source == source, FoundItem.source_item_id == source_item_id)
        .first()
    )
    normalized_text = build_normalized_text(category_code, title, color_codes, description)

    if existing is not None:
        text_changed = existing.normalized_text != normalized_text
        existing.title = title
        existing.category_code = category_code
        existing.color_codes = color_codes
        existing.found_date = found_date
        existing.region_code = region_code
        existing.place_text = place_text
        existing.storage_place = storage_place
        existing.contact_text = contact_text
        existing.description = description
        existing.image_url = image_url
        existing.detail_url = detail_url
        existing.status = status_value
        if text_changed:
            existing.normalized_text = normalized_text
            try:
                existing.text_embedding = encode_text(normalized_text)
            except Exception:  # noqa: BLE001 - public-data ingestion continues without an embedding
                existing.text_embedding = None
        if raw_payload is not None:
            existing.raw_payload = raw_payload
        db.commit()
        db.refresh(existing)
        return existing, False

    try:
        text_embedding = encode_text(normalized_text)
    except Exception:  # noqa: BLE001 - public-data ingestion continues without an embedding
        text_embedding = None

    found_item = FoundItem(
        source=source,
        source_item_id=source_item_id,
        title=title,
        category_code=category_code,
        color_codes=color_codes,
        found_date=found_date,
        region_code=region_code,
        place_text=place_text,
        storage_place=storage_place,
        contact_text=contact_text,
        description=description,
        image_url=image_url,
        detail_url=detail_url,
        status=status_value,
        normalized_text=normalized_text,
        text_embedding=text_embedding,
        raw_payload=raw_payload,
        collected_at=datetime.now(UTC),
    )
    db.add(found_item)
    db.commit()
    db.refresh(found_item)
    return found_item, True
