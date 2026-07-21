"""Adapter for the police LOST112 found-item XML API."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings


class Lost112ProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class FoundItemDTO:
    source_item_id: str
    title: str
    category_raw: str
    color_raw: str
    found_date: date
    storage_place: str | None
    description: str | None
    image_url: str | None
    detail_url: str | None
    raw_payload: dict[str, str]


@dataclass(frozen=True)
class FoundItemPage:
    items: list[FoundItemDTO]
    total_count: int


class Lost112Provider:
    endpoint_name = "getLosfundInfoAccToClAreaPd"
    # The mobile subdomain is no longer consistently reachable. Use the
    # official primary domain so the link works on both desktop and mobile.
    detail_base_url = "https://www.lost112.go.kr/"

    def fetch_page(
        self, start_date: date, end_date: date, page_no: int = 1, num_of_rows: int = 100
    ) -> FoundItemPage:
        settings = get_settings()
        if not settings.lost112_service_key or not settings.lost112_base_url:
            raise Lost112ProviderError("LOST112 API configuration is missing.")

        response = httpx.get(
            f"{settings.lost112_base_url.rstrip('/')}/{self.endpoint_name}",
            params={
                "serviceKey": settings.lost112_service_key,
                "START_YMD": start_date.strftime("%Y%m%d"),
                "END_YMD": end_date.strftime("%Y%m%d"),
                "pageNo": page_no,
                "numOfRows": num_of_rows,
            },
            timeout=30,
        )
        response.raise_for_status()
        return self.parse_xml(response.text)

    @staticmethod
    def parse_xml(payload: str) -> FoundItemPage:
        root = ET.fromstring(payload)
        result_code = root.findtext("./header/resultCode")
        if result_code != "00":
            message = root.findtext("./header/resultMsg") or "LOST112 request failed."
            raise Lost112ProviderError(message)

        items: list[FoundItemDTO] = []
        for item in root.findall("./body/items/item"):
            raw = {child.tag: (child.text or "").strip() for child in item}
            atc_id = raw.get("atcId")
            found_sequence = raw.get("fdSn")
            found_date = raw.get("fdYmd")
            title = raw.get("fdPrdtNm")
            if not atc_id or not found_date or not title:
                continue
            image_url = raw.get("fdFilePathImg") or None
            if image_url and image_url.endswith("img02_no_img.gif"):
                image_url = None
            detail_url = None
            if found_sequence:
                detail_url = (
                    f"{Lost112Provider.detail_base_url}?"
                    f"{urlencode({'ATC_ID': atc_id, 'FD_SN': found_sequence})}"
                )
            items.append(
                FoundItemDTO(
                    source_item_id=atc_id,
                    title=title,
                    category_raw=raw.get("prdtClNm", ""),
                    color_raw=raw.get("clrNm", ""),
                    found_date=date.fromisoformat(found_date),
                    storage_place=raw.get("depPlace") or None,
                    description=raw.get("fdSbjt") or None,
                    image_url=image_url,
                    detail_url=detail_url,
                    raw_payload=raw,
                )
            )
        return FoundItemPage(items=items, total_count=int(root.findtext("./body/totalCount") or 0))
