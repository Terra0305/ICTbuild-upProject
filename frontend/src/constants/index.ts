export const CATEGORY_OPTIONS = [
  { code: "WALLET", label: "지갑·카드지갑" },
  { code: "PHONE", label: "휴대전화" },
  { code: "EARPHONE", label: "이어폰·헤드폰" },
  { code: "BAG", label: "가방·파우치" },
  { code: "ID_CARD", label: "신분증·카드" },
  { code: "ELECTRONICS", label: "전자기기" },
  { code: "CLOTHING", label: "의류" },
  { code: "JEWELRY", label: "귀금속·시계" },
  { code: "KEY", label: "열쇠" },
  { code: "ETC", label: "기타" },
] as const;

export const COLOR_OPTIONS = [
  { code: "BLACK", label: "검정" },
  { code: "WHITE", label: "흰색" },
  { code: "NAVY", label: "남색" },
  { code: "BEIGE", label: "베이지" },
  { code: "GRAY", label: "회색" },
] as const;

export const MATCH_DISPLAY_THRESHOLD = 0.5;
export const MATCH_NOTIFICATION_THRESHOLD = 0.78;

// 시·도 단위 행정구역 코드(통계청 기준 앞 2자리). 시·군·구 세분화는 이후 스프린트에서 추가한다.
export const REGION_OPTIONS = [
  { code: "11", label: "서울특별시" },
  { code: "26", label: "부산광역시" },
  { code: "27", label: "대구광역시" },
  { code: "28", label: "인천광역시" },
  { code: "29", label: "광주광역시" },
  { code: "30", label: "대전광역시" },
  { code: "31", label: "울산광역시" },
  { code: "36", label: "세종특별자치시" },
  { code: "41", label: "경기도" },
  { code: "42", label: "강원특별자치도" },
  { code: "43", label: "충청북도" },
  { code: "44", label: "충청남도" },
  { code: "45", label: "전북특별자치도" },
  { code: "46", label: "전라남도" },
  { code: "47", label: "경상북도" },
  { code: "48", label: "경상남도" },
  { code: "50", label: "제주특별자치도" },
] as const;
