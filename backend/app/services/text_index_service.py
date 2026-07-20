"""Build the persisted FAISS index from stored found-item text embeddings."""

from sqlalchemy.orm import Session

from app.ai.faiss_index import FoundItemFaissIndex
from app.core.config import get_settings
from app.models import FoundItem


def rebuild_found_item_text_index(db: Session) -> int:
    items = (
        db.query(FoundItem)
        .filter(FoundItem.text_embedding.is_not(None))
        .order_by(FoundItem.id)
        .all()
    )
    if not items:
        return 0

    dimension = len(items[0].text_embedding)
    index = FoundItemFaissIndex(dimension, get_settings().faiss_index_dir)
    index.build([(str(item.id), item.text_embedding) for item in items])
    index.save()
    return len(items)
