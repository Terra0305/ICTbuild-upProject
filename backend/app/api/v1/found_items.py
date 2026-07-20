import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import FoundItem
from app.schemas.schemas import FoundItemResponse
from app.services import found_item_service

router = APIRouter(prefix="/found-items", tags=["found-items"])


@router.get("/{found_item_id}", response_model=FoundItemResponse)
def get_found_item(found_item_id: uuid.UUID, db: Session = Depends(get_db)) -> FoundItem:
    return found_item_service.get_found_item(db, found_item_id)
