"""Seed demo found_items so matching can be demonstrated before a real
LOST112 API key is obtained. Run with: python -m scripts.seed_found_items
"""

from datetime import date

from app.db.session import SessionLocal
from app.models import FoundItemStatus
from app.services.found_item_service import upsert_found_item

SAMPLE_FOUND_ITEMS = [
    dict(
        source_item_id="DEMO-001",
        title="블랙 카드 케이스",
        category_code="WALLET",
        color_codes=["BLACK"],
        found_date=date(2026, 7, 19),
        region_code="29",
        place_text="광주 동구 서석동",
        storage_place="광주동부경찰서",
        contact_text="062-000-0000",
        description="지갑 앞면에 작은 스크래치가 있고 학생증이 들어있음",
    ),
    dict(
        source_item_id="DEMO-002",
        title="흰색 무선 이어폰 케이스",
        category_code="EARPHONE",
        color_codes=["WHITE"],
        found_date=date(2026, 7, 18),
        region_code="11",
        place_text="서울 강남구 역삼동",
        storage_place="강남경찰서",
        description="충전 케이스만 있고 이어폰은 없음",
    ),
    dict(
        source_item_id="DEMO-003",
        title="회색 백팩",
        category_code="BAG",
        color_codes=["GRAY", "BLACK"],
        found_date=date(2026, 7, 15),
        region_code="29",
        place_text="광주 서구 치평동",
        storage_place="광주서부경찰서",
        description="노트북 파우치가 안에 들어있음",
    ),
    dict(
        source_item_id="DEMO-004",
        title="휴대전화 (갤럭시)",
        category_code="PHONE",
        color_codes=["BLACK"],
        found_date=date(2026, 7, 20),
        region_code="29",
        place_text="광주 동구 조선대학교 인근",
        storage_place="광주동부경찰서",
        description="액정에 필름이 붙어 있고 케이스는 투명 케이스",
    ),
]


def run() -> None:
    db = SessionLocal()
    try:
        for item in SAMPLE_FOUND_ITEMS:
            _, is_new = upsert_found_item(
                db,
                source="INSTITUTION",
                status_value=FoundItemStatus.STORED,
                **item,
            )
            print(f"{'created' if is_new else 'updated'}: {item['title']}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
