from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.models.study_plan import StudyPlan
from app.models.task import Task, TaskCompletion
from app.models.character import Character
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskCompletionResponse
from datetime import date
from app.services.ai_service import get_ai_service
from app.services.task_service import generate_tasks_from_ai, generate_cheer_message, generate_delay_warning, reschedule_tasks

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


class TodayTaskResponse(TaskResponse):
    study_plan_title: str
    is_overdue: bool


@router.get("/tasks/today", response_model=List[TodayTaskResponse])
async def list_today_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """今日期日のタスクと期日超過のタスクを返す（未完了のみ）"""
    today = date.today()

    # ユーザーの全プランIDを取得
    plan_ids = [
        p.id for p in db.query(StudyPlan.id).filter(StudyPlan.user_id == current_user.id).all()
    ]
    if not plan_ids:
        return []

    # 完了済みタスクIDを取得
    completed_ids = {
        c.task_id
        for c in db.query(TaskCompletion.task_id).filter(
            TaskCompletion.user_id == current_user.id
        ).all()
    }

    # 期日が今日以前のタスクを取得
    tasks = (
        db.query(Task)
        .filter(
            Task.study_plan_id.in_(plan_ids),
            Task.due_date != None,
            Task.due_date <= today,
            ~Task.id.in_(completed_ids) if completed_ids else True,
        )
        .order_by(Task.due_date)
        .all()
    )

    # プランタイトルをまとめて取得
    plans = {p.id: p for p in db.query(StudyPlan).filter(StudyPlan.id.in_(plan_ids)).all()}

    result = []
    for task in tasks:
        if task.id in completed_ids:
            continue
        plan = plans.get(task.study_plan_id)
        result.append(
            TodayTaskResponse(
                id=task.id,
                study_plan_id=task.study_plan_id,
                title=task.title,
                description=task.description,
                due_date=task.due_date,
                order_index=task.order_index,
                created_at=task.created_at,
                is_completed=False,
                cheer_message=None,
                study_plan_title=plan.title if plan else "",
                is_overdue=task.due_date < today,
            )
        )
    return result


@router.get("/tasks/completed")
async def list_completed_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """完了済みタスクを新しい順で返す（最大50件）"""
    plan_ids = [
        p.id for p in db.query(StudyPlan.id).filter(StudyPlan.user_id == current_user.id).all()
    ]
    if not plan_ids:
        return []

    completions = (
        db.query(TaskCompletion)
        .filter(TaskCompletion.user_id == current_user.id)
        .order_by(TaskCompletion.completed_at.desc())
        .limit(50)
        .all()
    )

    plans = {p.id: p for p in db.query(StudyPlan).filter(StudyPlan.id.in_(plan_ids)).all()}
    task_ids = [c.task_id for c in completions]
    tasks = {t.id: t for t in db.query(Task).filter(Task.id.in_(task_ids)).all()}

    result = []
    for c in completions:
        task = tasks.get(c.task_id)
        if not task or task.study_plan_id not in plans:
            continue
        plan = plans[task.study_plan_id]
        result.append({
            "id": task.id,
            "title": task.title,
            "study_plan_title": plan.title,
            "due_date": str(task.due_date) if task.due_date else None,
            "completed_at": c.completed_at.isoformat(),
            "cheer_message": c.cheer_message,
        })
    return result


@router.get("/tasks/upcoming", response_model=List[TodayTaskResponse])
async def list_upcoming_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """今日より後に期日があるタスクを返す（未完了のみ、最大30件）"""
    today = date.today()

    plan_ids = [
        p.id for p in db.query(StudyPlan.id).filter(StudyPlan.user_id == current_user.id).all()
    ]
    if not plan_ids:
        return []

    completed_ids = {
        c.task_id
        for c in db.query(TaskCompletion.task_id).filter(
            TaskCompletion.user_id == current_user.id
        ).all()
    }

    tasks = (
        db.query(Task)
        .filter(
            Task.study_plan_id.in_(plan_ids),
            Task.due_date != None,
            Task.due_date > today,
            ~Task.id.in_(completed_ids) if completed_ids else True,
        )
        .order_by(Task.due_date)
        .limit(30)
        .all()
    )

    plans = {p.id: p for p in db.query(StudyPlan).filter(StudyPlan.id.in_(plan_ids)).all()}

    return [
        TodayTaskResponse(
            id=task.id,
            study_plan_id=task.study_plan_id,
            title=task.title,
            description=task.description,
            due_date=task.due_date,
            order_index=task.order_index,
            created_at=task.created_at,
            is_completed=False,
            cheer_message=None,
            study_plan_title=plans[task.study_plan_id].title if task.study_plan_id in plans else "",
            is_overdue=False,
        )
        for task in tasks
    ]


@router.get("/study-plans/{plan_id}/tasks/delay-check")
async def check_delay(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """遅延チェック：進捗が期待値より遅れていたらキャラの口調で警告メッセージを返す"""
    plan = _get_plan_or_404(plan_id, current_user.id, db)
    today = date.today()

    start = plan.start_date if isinstance(plan.start_date, date) else date.fromisoformat(str(plan.start_date))
    end = plan.end_date if isinstance(plan.end_date, date) else date.fromisoformat(str(plan.end_date))

    total_days = (end - start).days or 1
    elapsed_days = (today - start).days
    days_left = (end - today).days

    tasks = db.query(Task).filter(Task.study_plan_id == plan_id).all()
    if not tasks:
        return {"is_delayed": False, "warning": None}

    completed_ids = {
        c.task_id for c in db.query(TaskCompletion.task_id).filter(
            TaskCompletion.user_id == current_user.id
        ).all()
    }
    completed = len([t for t in tasks if t.id in completed_ids])
    total = len(tasks)

    expected_progress = min(elapsed_days / total_days * 100, 100)
    actual_progress = completed / total * 100

    # 10%以上遅れていたら警告
    is_delayed = expected_progress - actual_progress >= 10 and days_left > 0

    warning = None
    if is_delayed:
        character = None
        if plan.character_id:
            character = db.query(Character).filter(Character.id == plan.character_id).first()
        ai_service = get_ai_service(current_user)
        if ai_service:
            try:
                warning = await generate_delay_warning(
                    ai_service=ai_service,
                    character=character,
                    plan_title=plan.title,
                    completed=completed,
                    total=total,
                    days_left=days_left,
                    expected_progress=expected_progress,
                    actual_progress=actual_progress,
                )
            except Exception:
                warning = "計画が少し遅れています。再スケジュールしますか？"

    return {"is_delayed": is_delayed, "warning": warning}


@router.post("/study-plans/{plan_id}/tasks/reschedule", response_model=List[TaskResponse])
async def reschedule(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """未完了タスクの期日を残り日数に合わせて再配分"""
    plan = _get_plan_or_404(plan_id, current_user.id, db)

    completed_ids = {
        c.task_id for c in db.query(TaskCompletion.task_id).filter(
            TaskCompletion.user_id == current_user.id
        ).all()
    }

    incomplete_tasks = (
        db.query(Task)
        .filter(Task.study_plan_id == plan_id, ~Task.id.in_(completed_ids) if completed_ids else True)
        .order_by(Task.order_index)
        .all()
    )

    if not incomplete_tasks:
        return []

    end = plan.end_date if isinstance(plan.end_date, date) else date.fromisoformat(str(plan.end_date))
    new_dates = await reschedule_tasks(ai_service=None, incomplete_tasks=incomplete_tasks, end_date=end)

    for item in new_dates:
        task = db.query(Task).filter(Task.id == item["id"]).first()
        if task:
            task.due_date = item["due_date"]

    db.commit()

    all_tasks = db.query(Task).filter(Task.study_plan_id == plan_id).order_by(Task.order_index).all()
    return [_task_to_response(t, current_user.id, db) for t in all_tasks]


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

    ai_service = get_ai_service(current_user)
    if not ai_service:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="AIキーが設定されていません。設定画面でAPIキーを登録してください。",
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
        err = str(e)
        if "429" in err or "quota" in err.lower() or "rate" in err.lower():
            detail = "APIの利用制限に達しました。しばらく待ってから再度お試しください。"
        elif "401" in err or "invalid" in err.lower() or "api key" in err.lower():
            detail = "APIキーが無効です。設定画面で正しいAPIキーを登録してください。"
        else:
            detail = "AIによるタスク生成に失敗しました。しばらく待ってから再度お試しください。"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
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

    plan.task_count = len(tasks)
    plan.completed_count = 0
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
    plan = _get_plan_or_404(plan_id, current_user.id, db)

    task = Task(
        study_plan_id=plan_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        order_index=data.order_index,
    )
    db.add(task)
    plan.task_count = (plan.task_count or 0) + 1
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

    # 完了済みかチェックしてカウンターを更新
    completion = db.query(TaskCompletion).filter(
        TaskCompletion.task_id == task_id,
        TaskCompletion.user_id == current_user.id,
    ).first()
    plan.task_count = max(0, (plan.task_count or 1) - 1)
    if completion:
        plan.completed_count = max(0, (plan.completed_count or 1) - 1)

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
    ai_service = get_ai_service(current_user)
    if ai_service:
        character = None
        if plan.character_id:
            character = db.query(Character).filter(Character.id == plan.character_id).first()
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
    plan.completed_count = (plan.completed_count or 0) + 1
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
        plan.completed_count = max(0, (plan.completed_count or 1) - 1)
        db.commit()
