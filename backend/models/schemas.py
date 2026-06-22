"""
DomApp — Pydantic схемы
"""

import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# === Company ===
class CompanyCreate(BaseModel):
    name: str
    phone: str
    email: str
    plan: str = "basic"


class CompanyResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    plan: str
    created_at: datetime


# === Building ===
class BuildingCreate(BaseModel):
    address: str
    district: str
    floors: int
    apartments_count: int


class BuildingResponse(BaseModel):
    id: int
    company_id: int
    address: str
    district: str
    floors: int
    apartments_count: int


# === Apartment ===
class ApartmentCreate(BaseModel):
    building_id: int
    number: str
    floor: int


class ApartmentResponse(BaseModel):
    id: int
    building_id: int
    number: str
    floor: int


# === Resident ===
class ResidentCreate(BaseModel):
    apartment_id: int
    telegram_id: int
    name: str
    phone: str

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        # Убираем всё кроме цифр
        digits = re.sub(r"\D", "", v)
        # Если 12 цифр и начинается с 998 — оставляем
        if len(digits) == 12 and digits.startswith("998"):
            return f"+{digits}"
        # Если 9 цифр — добавляем +998
        if len(digits) == 9:
            return f"+998{digits}"
        # Если начинается с 8 — заменяем на +998
        if len(digits) == 11 and digits.startswith("8"):
            return f"+998{digits[1:]}"
        # Иначе возвращаем как есть
        return v


class ResidentResponse(BaseModel):
    id: int
    apartment_id: int
    telegram_id: int
    name: str
    phone: str
    registered_at: datetime


# === Resident Auth (phone-based) ===
class ResidentLoginRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12 and digits.startswith("998"):
            return f"+{digits}"
        if len(digits) == 9:
            return f"+998{digits}"
        if len(digits) == 11 and digits.startswith("8"):
            return f"+998{digits[1:]}"
        return v


class ResidentLoginResponse(BaseModel):
    token: str
    resident_id: int
    name: str
    phone: str
    apartment_id: int
    apartment_number: Optional[str] = None
    building_id: Optional[int] = None
    building_address: Optional[str] = None


class ResidentProfileResponse(BaseModel):
    id: int
    name: str
    phone: str
    apartment_id: int
    apartment_number: Optional[str] = None
    building_id: Optional[int] = None
    building_address: Optional[str] = None
    balance: float = 0.0
    registered_at: datetime


# === Request ===
class RequestCreate(BaseModel):
    resident_id: int
    building_id: int
    category: str
    description: str
    photo_url: Optional[str] = None


class RequestUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(new|in_progress|done)$")
    comment: Optional[str] = None
    assigned_to: Optional[int] = None


class RequestResponse(BaseModel):
    id: int
    resident_id: int
    building_id: int
    category: str
    description: str
    photo_url: Optional[str]
    status: str
    comment: Optional[str] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    resolved_at: Optional[datetime]


# === Announcement ===
class AnnouncementCreate(BaseModel):
    building_id: Optional[int] = None  # null = всем домам
    text: str


class AnnouncementResponse(BaseModel):
    id: int
    company_id: int
    building_id: Optional[int]
    text: str
    created_at: datetime
    sent_at: Optional[datetime]


# === Payment ===
class PaymentResponse(BaseModel):
    id: int
    resident_id: int
    amount: float
    period: str
    status: str
    payme_transaction_id: Optional[str]
    paid_at: Optional[datetime]


# === Meter Reading ===
class MeterReadingCreate(BaseModel):
    apartment_id: int
    resident_id: int
    meter_type: str = Field(pattern="^(water_cold|water_hot|electricity|gas)$")
    value: float
    photo_url: Optional[str] = None
    period: str  # YYYY-MM-DD


class MeterReadingResponse(BaseModel):
    id: int
    apartment_id: int
    resident_id: int
    meter_type: str
    value: float
    photo_url: Optional[str]
    period: str
    created_at: datetime


# === Chat Message ===
class ChatMessageCreate(BaseModel):
    request_id: int
    sender_type: str = Field(pattern="^(resident|uk|employee)$")
    sender_name: str
    message: str


class ChatMessageResponse(BaseModel):
    id: int
    request_id: int
    sender_type: str
    sender_name: str
    message: str
    created_at: datetime


# === Poll ===
class PollCreate(BaseModel):
    company_id: int
    building_id: int
    question: str
    options: list[str]
    ends_at: Optional[datetime] = None


class PollResponse(BaseModel):
    id: int
    company_id: int
    building_id: int
    question: str
    options: list
    ends_at: Optional[datetime]
    created_at: datetime


class PollVoteRequest(BaseModel):
    poll_id: int
    resident_id: int
    option_index: int
