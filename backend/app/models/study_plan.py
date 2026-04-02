from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(UUID(as_uuid=False), ForeignKey("characters.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    goal = Column(Text, nullable=False)
    current_situation = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    ai_plan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="study_plans")
    character = relationship("Character", back_populates="study_plans")
    tasks = relationship("Task", back_populates="study_plan", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="study_plan", cascade="all, delete-orphan")
