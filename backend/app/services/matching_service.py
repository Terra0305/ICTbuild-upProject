from datetime import timedelta

from sqlalchemy.orm import Session, defer

from app.ai import geo, scorer
from app.core.config import get_settings
from app.models import FoundItem, LostItem, LostItemStatus, Match

CANDIDATE_WINDOW_DAYS = 180
EARLY_FOUND_GRACE_DAYS = 2


def _found_region(found_item: FoundItem) -> str:
    """The text is the source of truth; the stored code can predate geo fixes."""
    return geo.region_from_text(found_item.storage_place, found_item.place_text) or (
        found_item.region_code or ""
    )


def _lost_region(lost_item: LostItem) -> str:
    return lost_item.region_code or geo.region_from_text(lost_item.place_text)


def _lost_coordinates(lost_item: LostItem) -> tuple[float, float] | None:
    return geo.coordinates_from_text(lost_item.place_text)


def _distance_km(lost_item: LostItem, found_item: FoundItem) -> float | None:
    lost_xy = _lost_coordinates(lost_item)
    found_xy = geo.coordinates_from_text(found_item.storage_place, found_item.place_text)
    if lost_xy is None or found_xy is None:
        return None
    return geo.distance_km(lost_xy, found_xy)


def _is_plausible(lost_item: LostItem, found_item: FoundItem) -> bool:
    """Hard filters: category, date window, and location.

    A lost report in 광주 must only surface items kept in 광주; when both sides
    resolve to known coordinates (e.g. 조선대 vs a police station), they must
    also be within MAX_CANDIDATE_DISTANCE_KM.
    """
    if (
        lost_item.category_code
        and found_item.category_code
        and lost_item.category_code != found_item.category_code
    ):
        return False
    earliest = lost_item.lost_date - timedelta(days=EARLY_FOUND_GRACE_DAYS)
    latest = lost_item.lost_date + timedelta(days=CANDIDATE_WINDOW_DAYS)
    if not (earliest <= found_item.found_date <= latest):
        return False
    lost_region = _lost_region(lost_item)
    if lost_region and _found_region(found_item) != lost_region:
        return False
    distance = _distance_km(lost_item, found_item)
    return distance is None or distance <= geo.MAX_CANDIDATE_DISTANCE_KM


def _candidate_found_items(db: Session, lost_item: LostItem) -> list[FoundItem]:
    earliest = lost_item.lost_date - timedelta(days=EARLY_FOUND_GRACE_DAYS)
    latest = lost_item.lost_date + timedelta(days=CANDIDATE_WINDOW_DAYS)
    query = (
        db.query(FoundItem)
        .options(defer(FoundItem.raw_payload))
        .filter(FoundItem.found_date >= earliest, FoundItem.found_date <= latest)
    )
    if lost_item.category_code:
        query = query.filter(FoundItem.category_code == lost_item.category_code)
    return [item for item in query.all() if _is_plausible(lost_item, item)]


def _score_pair(lost_item: LostItem, found_item: FoundItem) -> dict[str, float | None]:
    lost_text = lost_item.normalized_text or ""
    found_text = found_item.normalized_text or ""
    return {
        "text": scorer.text_score(
            lost_text,
            found_text,
            lost_item.text_embedding,
            found_item.text_embedding,
        ),
        "image": None,
        "category": scorer.category_score(lost_item.category_code, found_item.category_code),
        "color": scorer.color_score(lost_item.color_codes or [], found_item.color_codes or []),
        "location": scorer.location_score(
            _lost_region(lost_item), _found_region(found_item), _distance_km(lost_item, found_item)
        ),
        "date": scorer.date_score(lost_item.lost_date, found_item.found_date),
    }


def _upsert_match(
    db: Session,
    lost_item: LostItem,
    found_item: FoundItem,
    existing: Match | None,
    threshold: float,
) -> tuple[Match, bool]:
    scores = _score_pair(lost_item, found_item)
    final_score = scorer.compute_final_score(scores)
    was_below_threshold = existing is None or existing.final_score < threshold
    match = existing
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
    match.reason_codes = scorer.build_reasons(scores)
    return match, was_below_threshold and final_score >= threshold


def run_matching_for_lost_item(db: Session, lost_item: LostItem) -> tuple[list[Match], list[Match]]:
    """Returns (all matches, matches newly crossing the notification threshold)."""
    threshold = get_settings().match_notification_threshold
    matches: list[Match] = []
    newly_qualified: list[Match] = []

    candidates = _candidate_found_items(db, lost_item)
    existing_by_found = {
        m.found_item_id: m for m in db.query(Match).filter(Match.lost_item_id == lost_item.id)
    }
    # Matches that no longer pass the location rules are zeroed (not deleted:
    # notifications reference them) so they drop below the display threshold.
    candidate_ids = {item.id for item in candidates}
    for found_id, stale in existing_by_found.items():
        if found_id not in candidate_ids:
            stale.final_score = 0

    for found_item in candidates:
        match, newly = _upsert_match(
            db, lost_item, found_item, existing_by_found.get(found_item.id), threshold
        )
        matches.append(match)
        if newly:
            newly_qualified.append(match)

    db.commit()
    return matches, newly_qualified


def get_top_matches(db: Session, lost_item_id, limit: int = 5) -> list[Match]:
    """Top matches that still satisfy the current plausibility rules.

    Stored matches can predate the region/distance filter (or a later edit), so
    the rules are re-applied at read time instead of trusting stale rows.
    """
    lost_item = db.get(LostItem, lost_item_id)
    if lost_item is None:
        return []
    threshold = get_settings().match_display_threshold
    rows = (
        db.query(Match, FoundItem)
        .join(FoundItem, FoundItem.id == Match.found_item_id)
        .options(defer(FoundItem.raw_payload))
        .filter(Match.lost_item_id == lost_item_id, Match.final_score >= threshold)
        .order_by(Match.final_score.desc())
        .all()
    )
    return [m for m, found in rows if _is_plausible(lost_item, found)][:limit]


def rematch_new_found_item(db: Session, found_item: FoundItem) -> list[Match]:
    """Per spec §9.3: rematch active lost items against one newly ingested found
    item, returning matches that newly crossed the notification threshold."""
    threshold = get_settings().match_notification_threshold
    newly_qualified: list[Match] = []

    active_lost_items = db.query(LostItem).filter(LostItem.status == LostItemStatus.ACTIVE).all()
    for lost_item in active_lost_items:
        if not _is_plausible(lost_item, found_item):
            continue
        existing = (
            db.query(Match)
            .filter(Match.lost_item_id == lost_item.id, Match.found_item_id == found_item.id)
            .first()
        )
        match, newly = _upsert_match(db, lost_item, found_item, existing, threshold)
        if newly:
            newly_qualified.append(match)

    db.commit()
    return newly_qualified
