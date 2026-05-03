from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CropCoords(BaseModel):
    x1: float = 0.05
    y1: float = 0.05
    x2: float = 0.95
    y2: float = 0.95


class CardParsedResponse(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    suggested_tags: list[str] = []
    _parse_error: Optional[str] = None


class CardUploadResponse(BaseModel):
    front_image_url: Optional[str] = None
    back_image_url: Optional[str] = None
    front_crop: Optional[CropCoords] = None
    back_crop: Optional[CropCoords] = None
    parsed: CardParsedResponse


class CardBase(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CardCreate(CardBase):
    front_image_url: Optional[str] = None
    back_image_url: Optional[str] = None
    tag_ids: list[str] = []


class CardUpdate(CardBase):
    tag_ids: Optional[list[str]] = None


class CardResponse(CardBase):
    id: str
    user_id: str
    front_image_url: Optional[str] = None
    back_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    tags: list["TagSimple"] = []

    model_config = {"from_attributes": True}


class CardSimple(BaseModel):
    id: str
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None

    model_config = {"from_attributes": True}


from app.schemas.tag import TagSimple

CardResponse.model_rebuild()