export function validateLostItemTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return "물품명은 2~100자로 입력해주세요.";
  }
  return null;
}

export function validatePlaceText(placeText: string): string | null {
  if (placeText.length > 200) {
    return "상세 장소는 200자 이하로 입력해주세요.";
  }
  return null;
}

export function validateDescription(description: string): string | null {
  if (description.length > 1000) {
    return "특징 설명은 1,000자 이하로 입력해주세요.";
  }
  return null;
}

export function validateLostDate(lostDate: string): string | null {
  const parsed = new Date(lostDate);
  if (Number.isNaN(parsed.getTime())) {
    return "분실 날짜를 올바르게 입력해주세요.";
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed > today) {
    return "분실 날짜는 미래일 수 없습니다.";
  }
  return null;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "이미지 파일은 최대 10MB까지 업로드할 수 있습니다.";
  }
  return null;
}
