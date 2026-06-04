"""
DomApp — Pydantic схемы
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


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
    company_id: int
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


class ResidentResponse(BaseModel):
    id: int
    apartment_id: int
    telegram_id: int
    name: str
    phone: str
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


class RequestResponse(BaseModel):
    id: int
    resident_id: int
    building_id: int
    category: str
    description: str
    photo_url: Optional[str]
    status: str
    comment: Optional[str] = None
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
