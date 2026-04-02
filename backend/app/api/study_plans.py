from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.models.study_plan import StudyPlan
from app.models.character import Character
from app.models.user import User
from app.schemas.study_plan import (
    StudyPlanCreate,
    StudyPlanUpdate,
    StudyPlanResponse,
    StudyPlanDetailResponse,
)
from app.schemas.task import TaskResponse
from app.models.task import Task, TaskCompletion
from app.services.ai_service import get_ai_service
from app.services.plan_service import generate_ai_plan

router = APIRouter()


def _task_to_response(task: Task, user_id: str, db: Session) -> TaskResponse:
    completion = (
        db.query(TaskCompletion)
        .filter(TaskCompletion.task_id == task.id, TaskCompletion.user_id == user_id)
        .first()
    )
    return TaskResponse(
        id=task.id,
        study_plan_id=task.study_plan_id,
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        order_index=task.order_index,
        created_at=task.created_at,
        is_completed=completion is not None,
        cheer_message=completion.cheer_message if completion else None,
    )


@router.get("", response_model=List[StudyPlanResponse])
async def list_study_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id).all()


@router.post("", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_study_plan(
    data: StudyPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # キャラクター確認
    character = None
    if data.character_id:
        character = (
            db.query(Character)
            .filter(Character.id == data.character_id, Character.user_id == current_user.id)
            .first()
        )
        if not character:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    plan = StudyPlan(
        user_id=current_user.id,
        character_id=data.character_id,
        title=data.title,
        goal=data.goal,
        current_situation=data.current_situation,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # AIで計画文を生成（キャラクターがある場合）
    if character:
        ai_service = get_ai_service(current_user)
        if ai_service:
            try:
                ai_plan = await generate_ai_plan(
                    ai_service=ai_service,
                    character=character,
                    goal=data.goal,
                    current_situation=data.current_situation,
                    start_date=data.start_date,
                    end_date=data.end_date,
                )
                plan.ai_plan = ai_plan
                db.commit()
                db.refresh(plan)
            except Exception:
                pass  # AI生成失敗してもプラン作成は成功とする

    return plan


@router.get("/{plan_id}", response_model=StudyPlanDetailResponse)
async def get_study_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(StudyPlan)
        .filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")

    tasks = (
        db.query(Task)
        .filter(Task.study_plan_id == plan_id)
        .order_by(Task.order_index)
        .all()
    )
    task_responses = [_task_to_response(t, current_user.id, db) for t in tasks]

    return StudyPlanDetailResponse(
        id=plan.id,
        user_id=plan.user_id,
        character_id=plan.character_id,
        title=plan.title,
        goal=plan.goal,
        current_situation=plan.current_situation,
        start_date=plan.start_date,
        end_date=plan.end_date,
        ai_plan=plan.ai_plan,
        created_at=plan.created_at,
        tasks=task_responses,
    )


@router.put("/{plan_id}", response_model=StudyPlanResponse)
async def update_study_plan(
    plan_id: str,
    data: StudyPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(StudyPlan)
        .filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")

    if data.character_id is not None:
        plan.character_id = data.character_id
    if data.title is not None:
        plan.title = data.title
    if data.goal is not None:
        plan.goal = data.goal
    if data.start_date is not None:
        plan.start_date = data.start_date
    if data.end_date is not None:
        plan.end_date = data.end_date

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_study_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(StudyPlan)
        .filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")

    db.delete(plan)
    db.commit()
