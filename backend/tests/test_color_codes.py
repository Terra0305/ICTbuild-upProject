import pytest

from app.ai.colors import color_codes_from_text


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("검정", ["BLACK"]),
        ("검정색", ["BLACK"]),
        ("검은색", ["BLACK"]),
        ("까만색", ["BLACK"]),
        ("빨강", ["RED"]),
        ("빨간색", ["RED"]),
        ("파란색", ["BLUE"]),
        ("노란색", ["YELLOW"]),
        ("하얀색", ["WHITE"]),
        ("흰색", ["WHITE"]),
        ("하양", ["WHITE"]),
        ("분홍색", ["PINK"]),
        ("연두색", ["GREEN"]),
        ("은색", ["SILVER"]),
        ("투명", ["TRANSPARENT"]),
        ("검정, 흰색", ["BLACK", "WHITE"]),
        ("빨간색/노란색", ["RED", "YELLOW"]),
        ("검정흰색", ["BLACK", "WHITE"]),
        (" 검 은 색 ", ["BLACK"]),
        ("", []),
        ("알수없음", []),
    ],
)
def test_color_codes_from_text(raw, expected):
    assert color_codes_from_text(raw) == expected


def test_black_is_not_misread_as_silver():
    # "검은색" contains the substring "은색" (silver).
    assert "SILVER" not in color_codes_from_text("검은색")
