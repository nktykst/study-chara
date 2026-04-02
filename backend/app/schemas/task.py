from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    order_index: Optional[int] = None


class TaskResponse(BaseModel):
    id: str
    study_plan_id: str
    title: str
    description: Optional[str]
    due_date: Optional[date]
    order_index: int
    created_at: datetime
    is_completed: bool = False
    cheer_message: Optional[str] = None

    model_config = {"from_attributes": True}


class TaskCompletionResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    cheer_message: Optional[str]
    completed_at: datetime

    model_config = {"from_attributes": True}
