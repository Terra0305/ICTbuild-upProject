"""Rebuild the found-item FAISS text index.

Run with: python -m scripts.rebuild_text_index
"""

from app.db.session import SessionLocal
from app.services.text_index_service import rebuild_found_item_text_index


def run() -> None:
    db = SessionLocal()
    try:
        count = rebuild_found_item_text_index(db)
        print(f"Indexed {count} found items.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
