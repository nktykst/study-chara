from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.task import TaskResponse


class StudyPlanCreate(BaseModel):
    character_id: Optional[str] = None
    title: str
    goal: str
    current_situation: Optional[str] = None
    start_date: date
    end_date: date


class StudyPlanUpdate(BaseModel):
    character_id: Optional[str] = None
    title: Optional[str] = None
    goal: Optional[str] = None
    current_situation: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class StudyPlanResponse(BaseModel):
    id: str
    user_id: str
    character_id: Optional[str]
    title: str
    goal: str
    current_situation: Optional[str]
    start_date: date
    end_date: date
    ai_plan: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyPlanDetailResponse(StudyPlanResponse):
    tasks: List[TaskResponse] = []
