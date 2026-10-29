"""List the colour spellings LOST112 actually sent and which ones we fail to map.

Answers "what does LOST112 really return for 색상?" from collected rows:
    cd backend && .venv/bin/python scripts/audit_found_colors.py
"""

from collections import Counter

from sqlalchemy.orm import undefer

from app.ai.colors import color_codes_from_text
from app.db.session import SessionLocal
from app.models import FoundItem


def main() -> None:
    seen: Counter[str] = Counter()
    unmapped: Counter[str] = Counter()
    with SessionLocal() as db:
        for item in (
            db.query(FoundItem)
            .filter(FoundItem.source == "LOST112")
            .options(undefer(FoundItem.raw_payload))
        ):
            raw = ((item.raw_payload or {}).get("clrNm") or "").strip()
            seen[raw or "(비어 있음)"] += 1
            if raw and not color_codes_from_text(raw):
                unmapped[raw] += 1
    total = sum(seen.values())
    print(f"LOST112 습득물 {total}건, 색상 표기 {len(seen)}종")
    for raw, n in seen.most_common(40):
        print(f"  {n:6d}  {raw}")
    print(f"\n미인식 표기 {len(unmapped)}종 ({sum(unmapped.values())}건)")
    for raw, n in unmapped.most_common(40):
        print(f"  {n:6d}  {raw}")


if __name__ == "__main__":
    main()
