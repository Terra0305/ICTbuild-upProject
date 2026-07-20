from datetime import timedelta

from sqlalchemy.orm import Session

from app.ai import scorer
from app.core.config import get_settings
from app.models import FoundItem, LostItem, LostItemStatus, Match

CANDIDATE_WINDOW_DAYS = 180
EARLY_FOUND_GRACE_DAYS = 2


def _candidate_found_items(db: Session, lost_item: LostItem) -> list[FoundItem]:
    earliest = lost_item.lost_date - timedelta(days=EARLY_FOUND_GRACE_DAYS)
    latest = lost_item.lost_date + timedelta(days=CANDIDATE_WINDOW_DAYS)
    query = db.query(FoundItem).filter(
        FoundItem.found_date >= earliest, FoundItem.found_date <= latest
    )
    candidates = []
    for found_item in query.all():
        if (
            lost_item.category_code
            and found_item.category_code
            and lost_item.category_code != found_item.category_code
        ):
            continue
        candidates.append(found_item)
    return candidates


def _score_pair(lost_item: LostItem, found_item: FoundItem) -> dict[str, float | None]:
    lost_text = lost_item.normalized_text or ""
    found_text = found_item.normalized_text or ""
    return {
        "text": scorer.text_score(lost_text, found_text),
        "image": None,
        "category": scorer.category_score(lost_item.category_code, found_item.category_code),
        "color": scorer.color_score(lost_item.color_codes or [], found_item.color_codes or []),
        "location": scorer.location_score(lost_item.region_code, found_item.region_code),
        "date": scorer.date_score(lost_item.lost_date, found_item.found_date),
    }


def run_matching_for_lost_item(db: Session, lost_item: LostItem) -> tuple[list[Match], list[Match]]:
    """Returns (all matches, matches newly crossing the notification threshold)."""
    threshold = get_settings().match_notification_threshold
    matches: list[Match] = []
    newly_qualified: list[Match] = []

    for found_item in _candidate_found_items(db, lost_item):
        scores = _score_pair(lost_item, found_item)
        final_score = scorer.compute_final_score(scores)
        reasons = scorer.build_reasons(scores)

        match = (
            db.query(Match)
            .filter(Match.lost_item_id == lost_item.id, Match.found_item_id == found_item.id)
            .first()
        )
        was_below_threshold = match is None or match.final_score < threshold
        if match is None:
            match = Match(lost_item_id=lost_item.id, found_item_id=found_item.id)
            db.add(match)

        match.text_score = scores["text"]
        match.image_score = scores["image"]
        match.category_score = scores["category"]
        match.color_score = scores["color"]
        match.location_score = scores["location"]
        match.date_score = scores["date"]
        match.final_score = final_score
        match.reason_codes = reasons
        matches.append(match)

        if was_below_threshold and final_score >= threshold:
            newly_qualified.append(match)

    db.commit()
    return matches, newly_qualified


def get_top_matches(db: Session, lost_item_id, limit: int = 5) -> list[Match]:
    threshold = get_settings().match_display_threshold
    return (
        db.query(Match)
        .filter(Match.lost_item_id == lost_item_id, Match.final_score >= threshold)
        .order_by(Match.final_score.desc())
        .limit(limit)
        .all()
    )


def rematch_new_found_item(db: Session, found_item: FoundItem) -> list[Match]:
    """Per spec §9.3: rematch active lost items against one newly ingested found
    item, returning matches that newly crossed the notification threshold."""
    threshold = get_settings().match_notification_threshold
    newly_qualified: list[Match] = []

    active_lost_items = db.query(LostItem).filter(LostItem.status == LostItemStatus.ACTIVE).all()
    for lost_item in active_lost_items:
        if (
            lost_item.category_code
            and found_item.category_code
            and lost_item.category_code != found_item.category_code
        ):
            continue
        earliest = lost_item.lost_date - timedelta(days=EARLY_FOUND_GRACE_DAYS)
        latest = lost_item.lost_date + timedelta(days=CANDIDATE_WINDOW_DAYS)
        if not (earliest <= found_item.found_date <= latest):
            continue

        scores = _score_pair(lost_item, found_item)
        final_score = scorer.compute_final_score(scores)
        reasons = scorer.build_reasons(scores)

        match = (
            db.query(Match)
            .filter(Match.lost_item_id == lost_item.id, Match.found_item_id == found_item.id)
            .first()
        )
        was_below_threshold = match is None or match.final_score < threshold
        if match is None:
            match = Match(lost_item_id=lost_item.id, found_item_id=found_item.id)
            db.add(match)

        match.text_score = scores["text"]
        match.image_score = scores["image"]
        match.category_score = scores["category"]
        match.color_score = scores["color"]
        match.location_score = scores["location"]
        match.date_score = scores["date"]
        match.final_score = final_score
        match.reason_codes = reasons

        if was_below_threshold and final_score >= threshold:
            newly_qualified.append(match)

    db.commit()
    return newly_qualified
