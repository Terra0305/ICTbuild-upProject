export type LostItemStatus = "ACTIVE" | "FOUND" | "CLOSED";
export type LostItemClosureReason =
  | "MATCHED_BY_REFIND"
  | "FOUND_ELSEWHERE"
  | "NOT_FOUND"
  | "INCORRECT_REGISTRATION";
export type FoundItemStatus = "STORED" | "RETURNED" | "DISPOSED" | "UNKNOWN";
export type NotificationChannel = "IN_APP" | "EMAIL";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ";
export type ScoreLabel = "HIGH" | "MEDIUM" | "LOW";

export interface LostItem {
  id: string;
  title: string;
  categoryCode: string;
  customCategory?: string;
  colorCodes: string[];
  customColorText?: string;
  lostDate: string;
  regionCode: string;
  placeText?: string;
  description?: string;
  imageUrl?: string;
  status: LostItemStatus;
  closureReason?: LostItemClosureReason;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoundItem {
  id: string;
  source: "LOST112" | "INSTITUTION";
  title: string;
  categoryCode: string;
  colorCodes: string[];
  foundDate: string;
  regionCode: string;
  placeText?: string;
  storagePlace?: string;
  contactText?: string;
  description?: string;
  imageUrl?: string;
  detailUrl?: string;
  status: FoundItemStatus;
}

export interface MatchScoreBreakdown {
  text: number | null;
  image: number | null;
  category: number | null;
  color: number | null;
  location: number | null;
  date: number | null;
}

export interface MatchResult {
  matchId: string;
  score: number;
  scoreLabel: ScoreLabel;
  reasons: string[];
  scoreBreakdown: MatchScoreBreakdown;
  foundItem: FoundItem;
}

export interface Notification {
  id: string;
  lostItemId: string;
  matchId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}
