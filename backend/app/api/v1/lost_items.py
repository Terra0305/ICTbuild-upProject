import json
import uuid
from datetime import UTC, date, datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.ai.scorer import score_label
from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import LostItem, User
from app.schemas.schemas import (
    LostItemCreateResponse,
    LostItemResponse,
    LostItemUpdateRequest,
    MatchListResponse,
    MatchResultItem,
    MatchScoreBreakdown,
)
from app.services import (
    found_item_service,
    lost112_sync_service,
    lost_item_service,
    matching_service,
    notification_service,
)

router = APIRouter(prefix="/lost-items", tags=["lost-items"])


@router.post("", response_model=LostItemCreateResponse, status_code=201)
async def create_lost_item(
    background_tasks: BackgroundTasks,
    title: str = Form(..., min_length=2, max_length=100),
    category_code: str = Form(...),
    custom_category: str | None = Form(None, max_length=50),
    color_codes: str = Form("[]"),
    custom_color_text: str | None = Form(None, max_length=50),
    lost_date: date = Form(...),
    region_code: str = Form(...),
    place_text: str | None = Form(None, max_length=200),
    description: str | None = Form(None, max_length=1000),
    image: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItemCreateResponse:
    if lost_date > datetime.now(UTC).date():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "분실 날짜는 미래일 수 없습니다.")
    if category_code == "ETC" and (custom_category is None or len(custom_category.strip()) < 2):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "기타 분류는 2~50자로 입력해주세요.")
    if custom_color_text is not None and not custom_color_text.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "기타 색상을 입력해주세요.")
    try:
        parsed_colors = json.loads(color_codes)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "color_codes 형식이 올바르지 않습니다."
        ) from exc

    lost_item = await lost_item_service.create_lost_item(
        db,
        user,
        title=title,
        category_code=category_code,
        custom_category=custom_category,
        color_codes=parsed_colors,
        custom_color_text=custom_color_text,
        lost_date=lost_date,
        region_code=region_code,
        place_text=place_text,
        description=description,
        image=image,
    )
    _, newly_qualified = matching_service.run_matching_for_lost_item(db, lost_item)
    notification_service.notify_matches(db, newly_qualified)
    background_tasks.add_task(lost112_sync_service.backfill_lost_item_by_id, lost_item.id)

    return LostItemCreateResponse(
        id=lost_item.id,
        status=lost_item.status,
        matching_status="PROCESSING",
        created_at=lost_item.created_at,
    )


@router.get("", response_model=list[LostItemResponse])
def list_lost_items(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[LostItem]:
    return lost_item_service.list_lost_items(db, user)


@router.get("/{lost_item_id}", response_model=LostItemResponse)
def get_lost_item(
    lost_item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItem:
    return lost_item_service.get_owned_lost_item(db, user, lost_item_id)


@router.patch("/{lost_item_id}", response_model=LostItemResponse)
def update_lost_item(
    lost_item_id: uuid.UUID,
    data: LostItemUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItem:
    lost_item = lost_item_service.get_owned_lost_item(db, user, lost_item_id)
    return lost_item_service.update_lost_item(db, lost_item, **data.model_dump(exclude_unset=True))


@router.delete("/{lost_item_id}", status_code=204)
def close_lost_item(
    lost_item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    lost_item = lost_item_service.get_owned_lost_item(db, user, lost_item_id)
    lost_item_service.close_lost_item(db, lost_item)


@router.post("/{lost_item_id}/rematch", response_model=list[LostItemResponse])
def rematch_lost_item(
    lost_item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LostItem]:
    lost_item = lost_item_service.get_owned_lost_item(db, user, lost_item_id)
    _, newly_qualified = matching_service.run_matching_for_lost_item(db, lost_item)
    notification_service.notify_matches(db, newly_qualified)
    return [lost_item]


@router.get("/{lost_item_id}/matches", response_model=MatchListResponse)
def get_matches(
    lost_item_id: uuid.UUID,
    limit: int = 5,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchListResponse:
    lost_item_service.get_owned_lost_item(db, user, lost_item_id)
    matches = matching_service.get_top_matches(db, lost_item_id, limit=limit)

    items = []
    for match in matches:
        found_item = found_item_service.get_found_item(db, match.found_item_id)
        items.append(
            MatchResultItem(
                match_id=match.id,
                score=float(match.final_score),
                score_label=score_label(float(match.final_score)),
                reasons=match.reason_codes,
                score_breakdown=MatchScoreBreakdown(
                    text=_to_float(match.text_score),
                    image=_to_float(match.image_score),
                    category=_to_float(match.category_score),
                    color=_to_float(match.color_score),
                    location=_to_float(match.location_score),
                    date=_to_float(match.date_score),
                ),
                found_item=found_item,
            )
        )

    return MatchListResponse(lost_item_id=lost_item_id, generated_at=datetime.now(UTC), items=items)


def _to_float(value) -> float | None:
    return float(value) if value is not None else None
