"""Build the persisted FAISS index from stored found-item text embeddings."""

from sqlalchemy.orm import Session

from app.ai.faiss_index import FoundItemFaissIndex
from app.core.config import get_settings
from app.models import FoundItem

# Rows are streamed in batches so peak memory stays near the float32 index
# itself instead of every FoundItem row plus its embedding as Python floats.
BATCH_SIZE = 500


def rebuild_found_item_text_index(db: Session) -> int:
    rows = (
        db.query(FoundItem.id, FoundItem.text_embedding)
        .filter(FoundItem.text_embedding.is_not(None))
        .order_by(FoundItem.id)
        .yield_per(BATCH_SIZE)
    )

    index: FoundItemFaissIndex | None = None
    batch: list[tuple[str, list[float]]] = []
    total = 0
    for item_id, embedding in rows:
        if index is None:
            index = FoundItemFaissIndex(len(embedding), get_settings().faiss_index_dir)
        batch.append((str(item_id), embedding))
        if len(batch) >= BATCH_SIZE:
            index.add(batch)
            total += len(batch)
            batch = []

    if index is None:
        return 0
    index.add(batch)
    total += len(batch)
    index.save()
    return total
