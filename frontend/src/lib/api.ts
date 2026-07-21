import { getAccessToken } from "@/lib/auth";
import type {
  FoundItem,
  LostItem,
  LostItemClosureReason,
  MatchResult,
  Notification,
  User,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const finalHeaders: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      (finalHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Auth ---
interface TokenResponseRaw {
  access_token: string;
  refresh_token: string;
}

interface UserResponseRaw {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export function signup(email: string, password: string, name: string): Promise<UserResponseRaw> {
  return apiFetch<UserResponseRaw>("/auth/signup", {
    method: "POST",
    auth: false,
    body: { email, password, name },
  });
}

export function login(email: string, password: string): Promise<TokenResponseRaw> {
  return apiFetch<TokenResponseRaw>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

export async function fetchMe(): Promise<User> {
  const raw = await apiFetch<UserResponseRaw>("/auth/me");
  return { id: raw.id, email: raw.email, name: raw.name, role: raw.role };
}

// --- Lost items ---
interface LostItemResponseRaw {
  id: string;
  title: string;
  category_code: string;
  custom_category: string | null;
  color_codes: string[];
  custom_color_text: string | null;
  lost_date: string;
  region_code: string;
  place_text: string | null;
  description: string | null;
  image_url: string | null;
  status: "ACTIVE" | "FOUND" | "CLOSED";
  closure_reason: LostItemClosureReason | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapLostItem(raw: LostItemResponseRaw): LostItem {
  return {
    id: raw.id,
    title: raw.title,
    categoryCode: raw.category_code,
    customCategory: raw.custom_category ?? undefined,
    colorCodes: raw.color_codes,
    customColorText: raw.custom_color_text ?? undefined,
    lostDate: raw.lost_date,
    regionCode: raw.region_code,
    placeText: raw.place_text ?? undefined,
    description: raw.description ?? undefined,
    imageUrl: raw.image_url ?? undefined,
    status: raw.status,
    closureReason: raw.closure_reason ?? undefined,
    closedAt: raw.closed_at ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function listLostItems(): Promise<LostItem[]> {
  const raw = await apiFetch<LostItemResponseRaw[]>("/lost-items");
  return raw.map(mapLostItem);
}

export async function getLostItem(id: string): Promise<LostItem> {
  const raw = await apiFetch<LostItemResponseRaw>(`/lost-items/${id}`);
  return mapLostItem(raw);
}

export async function closeLostItem(
  id: string,
  reason: LostItemClosureReason,
): Promise<LostItem> {
  const raw = await apiFetch<LostItemResponseRaw>(`/lost-items/${id}/close`, {
    method: "POST",
    body: { reason },
  });
  return mapLostItem(raw);
}

// --- Matches ---
interface FoundItemResponseRaw {
  id: string;
  source: "LOST112" | "INSTITUTION";
  title: string;
  category_code: string;
  color_codes: string[];
  found_date: string;
  region_code: string;
  place_text: string | null;
  storage_place: string | null;
  contact_text: string | null;
  description: string | null;
  image_url: string | null;
  detail_url: string | null;
  status: "STORED" | "RETURNED" | "DISPOSED" | "UNKNOWN";
}

interface MatchResultItemRaw {
  match_id: string;
  score: number;
  score_label: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  score_breakdown: {
    text: number | null;
    image: number | null;
    category: number | null;
    color: number | null;
    location: number | null;
    date: number | null;
  };
  found_item: FoundItemResponseRaw;
}

function mapFoundItem(raw: FoundItemResponseRaw): FoundItem {
  return {
    id: raw.id,
    source: raw.source,
    title: raw.title,
    categoryCode: raw.category_code,
    colorCodes: raw.color_codes,
    foundDate: raw.found_date,
    regionCode: raw.region_code,
    placeText: raw.place_text ?? undefined,
    storagePlace: raw.storage_place ?? undefined,
    contactText: raw.contact_text ?? undefined,
    description: raw.description ?? undefined,
    imageUrl: raw.image_url ?? undefined,
    // Older collected rows used LOST112's retired mobile subdomain.
    detailUrl: raw.detail_url
      ?.replace("https://m.lost112.go.kr/", "https://www.lost112.go.kr/")
      ?? undefined,
    status: raw.status,
  };
}

export async function getFoundItem(id: string): Promise<FoundItem> {
  const raw = await apiFetch<FoundItemResponseRaw>(`/found-items/${id}`, { auth: false });
  return mapFoundItem(raw);
}

export async function getLostItemMatches(id: string): Promise<MatchResult[]> {
  const raw = await apiFetch<{ items: MatchResultItemRaw[] }>(`/lost-items/${id}/matches`);
  return raw.items.map((item) => ({
    matchId: item.match_id,
    score: item.score,
    scoreLabel: item.score_label,
    reasons: item.reasons,
    scoreBreakdown: item.score_breakdown,
    foundItem: mapFoundItem(item.found_item),
  }));
}

// --- Notifications ---
interface NotificationResponseRaw {
  id: string;
  lost_item_id: string;
  match_id: string;
  channel: "IN_APP" | "EMAIL";
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(): Promise<Notification[]> {
  const raw = await apiFetch<NotificationResponseRaw[]>("/notifications");
  return raw.map((item) => ({
    id: item.id,
    lostItemId: item.lost_item_id,
    matchId: item.match_id,
    channel: item.channel,
    status: item.status,
    sentAt: item.sent_at ?? undefined,
    readAt: item.read_at ?? undefined,
    createdAt: item.created_at,
  }));
}

export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
}
