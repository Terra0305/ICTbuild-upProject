"""Recompute derived found_items fields from stored text/raw payloads.

Fixes rows ingested by older logic: 시·도 code (storage text), colour codes
(LOST112 `clrNm`) and dead LOST112 detail links (the portal merged into
경찰민원24 in 2026-01 and has no per-item page). Run scripts/rebuild_text_index.py
afterwards so embeddings pick up the corrected colours.
"""

from sqlalchemy.orm import undefer

from app.ai import geo
from app.ai.colors import color_codes_from_text
from app.db.session import SessionLocal
from app.models import FoundItem


def main() -> None:
    counts = {"region": 0, "color": 0, "detail_url": 0}
    with SessionLocal() as db:
        for item in db.query(FoundItem).options(undefer(FoundItem.raw_payload)):
            region = geo.region_from_text(item.storage_place, item.place_text)
            if region and region != item.region_code:
                item.region_code = region
                counts["region"] += 1
            if item.source != "LOST112":
                continue
            colors = color_codes_from_text((item.raw_payload or {}).get("clrNm"))
            if colors and colors != item.color_codes:
                item.color_codes = colors
                counts["color"] += 1
            if item.detail_url and "lost112.go.kr" in item.detail_url:
                item.detail_url = None
                counts["detail_url"] += 1
        db.commit()
    print(f"updated {counts}")


if __name__ == "__main__":
    main()
