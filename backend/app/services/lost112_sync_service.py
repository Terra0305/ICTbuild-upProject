"""Bounded LOST112 ingestion for initial backfill and incremental sync."""

import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.ai import geo
from app.ai.colors import color_codes_from_text
from app.db.session import SessionLocal
from app.models import FoundItem, FoundItemStatus, LostItem, LostItemStatus, SyncRun, SyncRunStatus
from app.providers.lost112 import FoundItemDTO, Lost112Provider
from app.services import found_item_service, matching_service, notification_service

INITIAL_BACKFILL_DAYS = 30
MAX_MATCH_DAYS = 180
SOURCE = "LOST112"
logger = logging.getLogger(__name__)


def _category_code(category_raw: str) -> str:
    value = category_raw.replace(" ", "")
    mappings = (
        ("지갑", "WALLET"),
        ("휴대폰", "PHONE"),
        ("휴대전화", "PHONE"),
        ("이어폰", "EARPHONE"),
        ("헤드폰", "EARPHONE"),
        ("가방", "BAG"),
        ("신분증", "ID_CARD"),
        ("카드", "ID_CARD"),
        ("전자", "ELECTRONICS"),
        ("의류", "CLOTHING"),
        ("신발", "CLOTHING"),
        ("귀금속", "JEWELRY"),
        ("시계", "JEWELRY"),
        ("열쇠", "KEY"),
        ("도서", "BOOK"),
        ("문구", "BOOK"),
        ("우산", "UMBRELLA"),
        ("스포츠", "SPORTS"),
    )
    return next((code for keyword, code in mappings if keyword in value), "ETC")


def _save_dto(db: Session, dto: FoundItemDTO) -> tuple[FoundItem, bool]:
    found_item, is_new = found_item_service.upsert_found_item(
        db,
        source=SOURCE,
        source_item_id=dto.source_item_id,
        title=dto.title,
        category_code=_category_code(dto.category_raw),
        color_codes=color_codes_from_text(dto.color_raw),
        found_date=dto.found_date,
        # LOST112 gives no region code; derive the 시·도 from the storage place text.
        region_code=geo.region_from_text(dto.storage_place),
        storage_place=dto.storage_place,
        description=dto.description,
        image_url=dto.image_url,
        status_value=FoundItemStatus.STORED,
        raw_payload=dto.raw_payload,
    )
    return found_item, is_new


def sync_range(
    db: Session, start_date: date, end_date: date, rematch_new_items: bool = False
) -> int:
    """Upsert one bounded date range and record its sync result."""
    sync_run = SyncRun(source=SOURCE, started_at=datetime.now(UTC), status=SyncRunStatus.RUNNING)
    db.add(sync_run)
    db.commit()

    provider = Lost112Provider()
    fetched = upserted = 0
    newly_qualified = []
    try:
        page_no = 1
        while True:
            page = provider.fetch_page(start_date, end_date, page_no=page_no)
            fetched += len(page.items)
            for dto in page.items:
                found_item, is_new = _save_dto(db, dto)
                if not is_new:
                    continue
                upserted += 1
                if rematch_new_items:
                    newly_qualified.extend(matching_service.rematch_new_found_item(db, found_item))
            if fetched >= page.total_count or not page.items:
                break
            page_no += 1

        if newly_qualified:
            notification_service.notify_matches(db, newly_qualified)
        sync_run.status = SyncRunStatus.SUCCESS
        sync_run.fetched_count = fetched
        sync_run.upserted_count = upserted
        sync_run.last_cursor = str(page_no)
        sync_run.finished_at = datetime.now(UTC)
        db.commit()
        return upserted
    except Exception as exc:
        db.rollback()
        sync_run = db.get(SyncRun, sync_run.id)
        if sync_run is not None:
            sync_run.status = SyncRunStatus.FAILED
            sync_run.error_message = str(exc)[:500]
            sync_run.finished_at = datetime.now(UTC)
            db.commit()
        raise


def backfill_lost_item(db: Session, lost_item: LostItem) -> int:
    today = datetime.now(UTC).date()
    if (today - lost_item.lost_date).days > MAX_MATCH_DAYS:
        return 0
    start_date = max(
        lost_item.lost_date - timedelta(days=2), today - timedelta(days=MAX_MATCH_DAYS)
    )
    end_date = min(today, lost_item.lost_date + timedelta(days=INITIAL_BACKFILL_DAYS))
    upserted = sync_range(db, start_date, end_date, rematch_new_items=False)
    _, newly_qualified = matching_service.run_matching_for_lost_item(db, lost_item)
    notification_service.notify_matches(db, newly_qualified)
    return upserted


def process_new_lost_item_by_id(lost_item_id) -> None:
    """Background-task entrypoint; it owns a separate SQLAlchemy session.

    Matches against already-collected found items first so results appear fast,
    then pulls fresh LOST112 data and matches again.
    """
    db = SessionLocal()
    try:
        lost_item = db.get(LostItem, lost_item_id)
        if lost_item is None:
            return
        _, newly_qualified = matching_service.run_matching_for_lost_item(db, lost_item)
        notification_service.notify_matches(db, newly_qualified)
        try:
            backfill_lost_item(db, lost_item)
        except Exception:
            logger.exception("LOST112 backfill failed for lost item %s", lost_item_id)
    finally:
        db.close()


def rematch_lost_item_by_id(lost_item_id) -> None:
    """Re-run matching only (no LOST112 fetch) after a lost item was edited."""
    db = SessionLocal()
    try:
        lost_item = db.get(LostItem, lost_item_id)
        if lost_item is None or lost_item.status != LostItemStatus.ACTIVE:
            return
        _, newly_qualified = matching_service.run_matching_for_lost_item(db, lost_item)
        notification_service.notify_matches(db, newly_qualified)
    finally:
        db.close()


backfill_lost_item_by_id = process_new_lost_item_by_id
