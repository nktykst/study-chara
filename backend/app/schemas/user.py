from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    clerk_user_id: str
    display_name: Optional[str]
    ai_provider: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    provider: str  # "anthropic" or "google"
    api_key: str


class ApiKeyStatus(BaseModel):
    provider: str
    masked_key: Optional[str]
    is_set: bool
