from datetime import date

from app.providers.lost112 import Lost112Provider


def test_parse_xml_maps_lost112_fields_and_ignores_placeholder_image() -> None:
    payload = """
    <response>
      <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
      <body>
        <items><item>
          <atcId>F202607200001</atcId><fdYmd>20260720</fdYmd>
          <fdPrdtNm>검정 지갑</fdPrdtNm><prdtClNm>지갑</prdtClNm>
          <clrNm>검정</clrNm><depPlace>서울경찰서</depPlace>
          <fdSbjt>카드가 든 지갑</fdSbjt>
          <fdFilePathImg>https://lost112.go.kr/img02_no_img.gif</fdFilePathImg>
        </item></items>
        <totalCount>1</totalCount>
      </body>
    </response>
    """

    page = Lost112Provider.parse_xml(payload)

    assert page.total_count == 1
    assert len(page.items) == 1
    item = page.items[0]
    assert item.source_item_id == "F202607200001"
    assert item.found_date == date(2026, 7, 20)
    assert item.title == "검정 지갑"
    assert item.image_url is None
