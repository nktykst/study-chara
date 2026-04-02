from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CharacterCreate(BaseModel):
    name: str
    persona: Optional[str] = None
    tone: Optional[str] = None
    catchphrase: Optional[str] = None


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    persona: Optional[str] = None
    tone: Optional[str] = None
    catchphrase: Optional[str] = None


class CharacterResponse(BaseModel):
    id: str
    user_id: str
    name: str
    persona: Optional[str]
    tone: Optional[str]
    catchphrase: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
