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
