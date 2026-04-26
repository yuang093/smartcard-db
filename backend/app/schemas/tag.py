from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TagBase(BaseModel):
    name: str
    color: str = "#6B7280"


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagResponse(TagBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TagSimple(BaseModel):
    id: str
    name: str
    color: str

    model_config = {"from_attributes": True}
