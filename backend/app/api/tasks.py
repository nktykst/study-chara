from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.models.study_plan import StudyPlan
from app.models.task import Task, TaskCompletion
from app.models.character import Character
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskCompletionResponse
from app.services.ai_service import get_ai_service
from app.services.task_service import generate_tasks_from_ai, generate_cheer_message

router = APIRouter()


def _get_plan_or_404(plan_id: str, user_id: str, db: Session) -> StudyPlan:
    plan = (
        db.query(StudyPlan)
        .filter(StudyPlan.id == plan_id, StudyPlan.user_id == user_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")
    return plan


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


@router.get("/study-plans/{plan_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_plan_or_404(plan_id, current_user.id, db)
    tasks = (
        db.query(Task)
        .filter(Task.study_plan_id == plan_id)
        .order_by(Task.order_index)
        .all()
    )
    return [_task_to_response(t, current_user.id, db) for t in tasks]


@router.post("/study-plans/{plan_id}/tasks/generate", response_model=List[TaskResponse])
async def generate_tasks(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(plan_id, current_user.id, db)

    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="API key not set. Please configure your AI provider API key.",
        )

    ai_service = get_ai_service(current_user)
    if not ai_service:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Failed to initialize AI service.",
        )

    character = None
    if plan.character_id:
        character = db.query(Character).filter(Character.id == plan.character_id).first()

    try:
        task_data_list = await generate_tasks_from_ai(
            ai_service=ai_service,
            character=character,
            study_plan=plan,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate tasks: {str(e)}",
        )

    # 既存タスクを削除してから新規追加
    db.query(Task).filter(Task.study_plan_id == plan_id).delete()

    tasks = []
    for i, td in enumerate(task_data_list):
        task = Task(
            study_plan_id=plan_id,
            title=td.get("title", ""),
            description=td.get("description"),
            due_date=td.get("due_date"),
            order_index=td.get("order_index", i),
        )
        db.add(task)
        tasks.append(task)

    db.commit()
    for t in tasks:
        db.refresh(t)

    return [_task_to_response(t, current_user.id, db) for t in tasks]


@router.post("/study-plans/{plan_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    plan_id: str,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_plan_or_404(plan_id, current_user.id, db)

    task = Task(
        study_plan_id=plan_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        order_index=data.order_index,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_response(task, current_user.id, db)


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # プランの所有者確認
    plan = db.query(StudyPlan).filter(
        StudyPlan.id == task.study_plan_id,
        StudyPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.order_index is not None:
        task.order_index = data.order_index

    db.commit()
    db.refresh(task)
    return _task_to_response(task, current_user.id, db)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    plan = db.query(StudyPlan).filter(
        StudyPlan.id == task.study_plan_id,
        StudyPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(task)
    db.commit()


@router.post("/tasks/{task_id}/complete", response_model=TaskCompletionResponse)
async def complete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    plan = db.query(StudyPlan).filter(
        StudyPlan.id == task.study_plan_id,
        StudyPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # 既存の完了レコード確認
    existing = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.user_id == current_user.id,
    ).first()
    if existing:
        return existing

    cheer_message = None
    if current_user.encrypted_api_key and plan.character_id:
        character = db.query(Character).filter(Character.id == plan.character_id).first()
        if character:
            ai_service = get_ai_service(current_user)
            if ai_service:
                try:
                    cheer_message = await generate_cheer_message(
                        ai_service=ai_service,
                        character=character,
                        task_title=task.title,
                    )
                except Exception:
                    pass

    completion = TaskCompletion(
        task_id=task_id,
        user_id=current_user.id,
        cheer_message=cheer_message,
    )
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


@router.delete("/tasks/{task_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
async def uncomplete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    plan = db.query(StudyPlan).filter(
        StudyPlan.id == task.study_plan_id,
        StudyPlan.user_id == current_user.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    completion = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.user_id == current_user.id,
    ).first()
    if completion:
        db.delete(completion)
        db.commit()
