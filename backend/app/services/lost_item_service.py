import logging
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.normalizer import build_normalized_text, normalize_whitespace
from app.ai.text_encoder import encode_text
from app.core.config import get_settings
from app.models import LostItem, LostItemStatus, User

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024


def _upload_image(file: UploadFile, content: bytes) -> str | None:
    """Upload to S3-compatible storage if configured; otherwise skip (no
    credentials available yet) so text-only matching still proceeds, matching
    the "이미지 URL 오류 -> 텍스트만 진행" fallback policy in spec §14."""
    settings = get_settings()
    if not settings.storage_bucket or not settings.storage_endpoint:
        logger.info("Object storage not configured; skipping image upload")
        return None

    extension = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else "bin"
    key = f"lost-items/{uuid.uuid4()}.{extension}"

    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.storage_endpoint,
            aws_access_key_id=settings.storage_access_key,
            aws_secret_access_key=settings.storage_secret_key,
        )
        client.put_object(
            Bucket=settings.storage_bucket, Key=key, Body=content, ContentType=file.content_type
        )
        return f"{settings.storage_endpoint.rstrip('/')}/{settings.storage_bucket}/{key}"
    except (BotoCoreError, ClientError):
        logger.exception("Image upload failed; continuing without image")
        return None


async def create_lost_item(
    db: Session,
    user: User,
    title: str,
    category_code: str,
    custom_category: str | None,
    color_codes: list[str],
    custom_color_text: str | None,
    lost_date,
    region_code: str,
    place_text: str | None,
    description: str | None,
    image: UploadFile | None,
) -> LostItem:
    image_url: str | None = None
    if image is not None and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "JPG, PNG, WEBP 형식만 업로드할 수 있습니다."
            )
        content = await image.read()
        if len(content) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "이미지 파일은 최대 10MB까지 업로드할 수 있습니다."
            )
        image_url = _upload_image(image, content)

    normalized_custom_category = None
    if category_code == "ETC" and custom_category:
        normalized_custom_category = normalize_whitespace(custom_category)
    normalized_custom_color = normalize_whitespace(custom_color_text) if custom_color_text else None
    normalized_text = build_normalized_text(
        category_code,
        title,
        color_codes,
        description,
        normalized_custom_category,
        normalized_custom_color,
    )
    try:
        text_embedding = encode_text(normalized_text)
    except Exception:  # noqa: BLE001 - model download/inference must not block registration
        logger.exception("Text embedding creation failed; continuing without an embedding")
        text_embedding = None

    lost_item = LostItem(
        user_id=user.id,
        title=normalize_whitespace(title),
        category_code=category_code,
        custom_category=normalized_custom_category,
        color_codes=color_codes,
        custom_color_text=normalized_custom_color,
        lost_date=lost_date,
        region_code=region_code,
        place_text=place_text,
        description=description,
        image_url=image_url,
        normalized_text=normalized_text,
        text_embedding=text_embedding,
        status=LostItemStatus.ACTIVE,
    )
    db.add(lost_item)
    db.commit()
    db.refresh(lost_item)
    return lost_item


def list_lost_items(db: Session, user: User) -> list[LostItem]:
    return (
        db.query(LostItem)
        .filter(LostItem.user_id == user.id)
        .order_by(LostItem.created_at.desc())
        .all()
    )


def get_owned_lost_item(db: Session, user: User, lost_item_id: uuid.UUID) -> LostItem:
    lost_item = db.get(LostItem, lost_item_id)
    if lost_item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "분실물을 찾을 수 없습니다.")
    if lost_item.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "본인의 분실물만 조회할 수 있습니다.")
    return lost_item


def update_lost_item(db: Session, lost_item: LostItem, **fields) -> LostItem:
    changed_text_inputs = False
    for key, value in fields.items():
        if value is None:
            continue
        setattr(lost_item, key, value)
        if key in {
            "title",
            "category_code",
            "custom_category",
            "color_codes",
            "custom_color_text",
            "description",
        }:
            changed_text_inputs = True

    if changed_text_inputs:
        lost_item.normalized_text = build_normalized_text(
            lost_item.category_code,
            lost_item.title,
            lost_item.color_codes,
            lost_item.description,
            lost_item.custom_category,
            lost_item.custom_color_text,
        )
        try:
            lost_item.text_embedding = encode_text(lost_item.normalized_text)
        except Exception:  # noqa: BLE001 - preserve the updated item for later reprocessing
            logger.exception("Text embedding update failed; continuing without a new embedding")
            lost_item.text_embedding = None

    db.commit()
    db.refresh(lost_item)
    return lost_item


def close_lost_item(db: Session, lost_item: LostItem) -> LostItem:
    lost_item.status = LostItemStatus.CLOSED
    db.commit()
    db.refresh(lost_item)
    return lost_item
