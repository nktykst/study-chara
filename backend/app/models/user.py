from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=True)
    ai_provider = Column(String, nullable=False, default="anthropic")
    encrypted_api_key = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_date = Column(Date, nullable=True)
    login_streak = Column(Integer, nullable=False, default=0)
    affection = Column(Integer, nullable=False, default=0)

    characters = relationship("Character", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    task_completions = relationship("TaskCompletion", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
