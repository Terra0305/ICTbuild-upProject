"""Collect a bounded recent LOST112 window for a scheduler or manual run."""

from __future__ import annotations

import argparse
from datetime import UTC, datetime, timedelta

from app.db.session import SessionLocal
from app.services.lost112_sync_service import sync_range
from app.services.text_index_service import rebuild_found_item_text_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync recent LOST112 found items")
    parser.add_argument(
        "--days", type=int, default=1, help="Number of most recent days (default: 1)"
    )
    args = parser.parse_args()
    if args.days < 1 or args.days > 30:
        parser.error("--days must be between 1 and 30")

    end_date = datetime.now(UTC).date()
    start_date = end_date - timedelta(days=args.days - 1)
    db = SessionLocal()
    try:
        upserted = sync_range(db, start_date, end_date, rematch_new_items=True)
        indexed = rebuild_found_item_text_index(db)
    finally:
        db.close()
    print(f"LOST112 sync complete: {upserted} new items, {indexed} indexed items.")


if __name__ == "__main__":
    main()
