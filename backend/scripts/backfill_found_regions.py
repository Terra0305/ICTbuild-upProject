"""Recompute found_items.region_code from storage text (fixes rows stored by older geo logic)."""

from sqlalchemy.orm import defer

from app.ai import geo
from app.db.session import SessionLocal
from app.models import FoundItem


def main() -> None:
    with SessionLocal() as db:
        fixed = 0
        for item in db.query(FoundItem).options(defer(FoundItem.raw_payload)):
            region = geo.region_from_text(item.storage_place, item.place_text)
            if region and region != item.region_code:
                item.region_code = region
                fixed += 1
        db.commit()
        print(f"updated {fixed} found items")


if __name__ == "__main__":
    main()
