import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# --- Auth ---
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    name: str = Field(min_length=1, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str

    model_config = {"from_attributes": True}


# --- Lost items ---
class LostItemCreateResponse(BaseModel):
    id: uuid.UUID
    status: str
    matching_status: str
    created_at: datetime


class LostItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    category_code: str
    custom_category: str | None
    color_codes: list[str]
    custom_color_text: str | None
    lost_date: date
    region_code: str
    place_text: str | None
    description: str | None
    image_url: str | None
    status: str
    closure_reason: str | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LostItemUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=100)
    category_code: str | None = None
    custom_category: str | None = Field(default=None, min_length=2, max_length=50)
    color_codes: list[str] | None = None
    custom_color_text: str | None = Field(default=None, min_length=1, max_length=50)
    place_text: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1000)


class LostItemCloseRequest(BaseModel):
    reason: Literal[
        "MATCHED_BY_REFIND",
        "FOUND_ELSEWHERE",
        "NOT_FOUND",
        "INCORRECT_REGISTRATION",
    ]


# --- Found items ---
class FoundItemResponse(BaseModel):
    id: uuid.UUID
    source: str
    title: str
    category_code: str
    color_codes: list[str]
    found_date: date
    region_code: str
    place_text: str | None
    storage_place: str | None
    contact_text: str | None
    description: str | None
    image_url: str | None
    detail_url: str | None
    status: str

    model_config = {"from_attributes": True}


# --- Matches ---
class MatchScoreBreakdown(BaseModel):
    text: float | None
    image: float | None
    category: float | None
    color: float | None
    location: float | None
    date: float | None


class MatchResultItem(BaseModel):
    match_id: uuid.UUID
    score: float
    score_label: str
    reasons: list[str]
    score_breakdown: MatchScoreBreakdown
    found_item: FoundItemResponse


class MatchListResponse(BaseModel):
    lost_item_id: uuid.UUID
    generated_at: datetime
    items: list[MatchResultItem]


# --- Notifications ---
class NotificationResponse(BaseModel):
    id: uuid.UUID
    lost_item_id: uuid.UUID
    match_id: uuid.UUID
    channel: str
    status: str
    sent_at: datetime | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
