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


def test_get_top_matches_hides_stale_out_of_region_rows():
    from uuid import uuid4

    lost = _lost(place="조선대학교")
    lost.id = uuid4()
    good = (SimpleNamespace(final_score=0.6), _found("광주동부경찰서"))
    stale = (SimpleNamespace(final_score=0.9), _found("대전둔산경찰서"))

    class _Query:
        def join(self, *_a, **_k):
            return self

        def options(self, *_a, **_k):
            return self

        def filter(self, *_a, **_k):
            return self

        def order_by(self, *_a, **_k):
            return self

        def all(self):
            return [stale, good]

    class _Db:
        def get(self, *_a):
            return lost

        def query(self, *_a):
            return _Query()

    result = matching_service.get_top_matches(_Db(), lost.id)
    assert result == [good[0]]


def test_generic_station_names_do_not_resolve_to_gwangju():
    for name in ("제주동부경찰서", "대전서부경찰서", "부산남부경찰서", "서울북부경찰서"):
        assert geo.region_from_text(name) != "29", name
        assert geo.coordinates_from_text(name) is None, name
    assert geo.region_from_text("제주동부경찰서") == "50"
    assert geo.region_from_text("대전서부경찰서") == "30"
    assert geo.region_from_text("부산남부경찰서") == "26"
    lost = _lost(place="조선대학교")
    for name in ("제주동부경찰서", "대전서부경찰서", "부산남부경찰서"):
        assert not matching_service._is_plausible(lost, _found(name))


def test_earliest_region_mention_wins():
    assert geo.region_from_text("경기도광주경찰서") == "41"
    assert geo.region_from_text("광주광역시 동구") == "29"
    assert geo.region_from_text("전라남도 광주") == "46"


def test_stale_stored_region_does_not_leak_other_city():
    # Rows ingested before the region fix may carry a wrong stored code.
    lost = _lost(place="조선대학교")
    assert not matching_service._is_plausible(lost, _found("대전둔산경찰서", region="29"))
    assert matching_service._is_plausible(lost, _found("광주동부경찰서", region="11"))


def test_lost_region_falls_back_to_place_text():
    lost = _lost(region="", place="광주 충장로")
    assert not matching_service._is_plausible(lost, _found("대전둔산경찰서"))
    assert matching_service._is_plausible(lost, _found("광주동부경찰서"))
