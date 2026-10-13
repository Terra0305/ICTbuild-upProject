from datetime import date
from types import SimpleNamespace

from app.ai import geo, scorer
from app.services import matching_service


def _lost(region="29", place=None):
    return SimpleNamespace(
        category_code="WALLET", lost_date=date(2026, 10, 1), region_code=region, place_text=place
    )


def _found(storage, region="", found=date(2026, 10, 2)):
    return SimpleNamespace(
        category_code="WALLET",
        found_date=found,
        region_code=region,
        storage_place=storage,
        place_text=None,
    )


def test_region_from_storage_place():
    assert geo.region_from_text("광주서부경찰서") == "29"
    assert geo.region_from_text("서울강남경찰서") == "11"
    assert geo.region_from_text("알수없음") == ""


def test_gwangju_report_excludes_other_regions_and_unknown():
    lost = _lost()
    assert matching_service._is_plausible(lost, _found("광주동부경찰서"))
    assert not matching_service._is_plausible(lost, _found("서울강남경찰서"))
    assert not matching_service._is_plausible(lost, _found("알수없음"))


def test_chosun_radius():
    lost = _lost(place="조선대학교 도서관")
    near = _found("광주동부경찰서")
    far = _found("광주광산경찰서")
    assert matching_service._distance_km(lost, near) < 3
    assert matching_service._is_plausible(lost, near)
    assert not matching_service._is_plausible(lost, far)


def test_location_score_prefers_proximity():
    assert scorer.location_score("29", "29", 0.5) == 1.0
    assert scorer.location_score("29", "29", 2.0) == 0.85
    assert scorer.location_score("29", "29") == 0.7
    assert scorer.location_score("29", "11") == 0.0
    assert scorer.location_score("29", "") is None
