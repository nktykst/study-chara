from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from cryptography.fernet import Fernet
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.character import Character
from app.models.study_plan import StudyPlan
from app.models.task import TaskCompletion
from app.schemas.user import UserResponse, UserUpdate, ApiKeyUpdate, ApiKeyStatus
from app.config import settings

router = APIRouter()

MOOD_GREETINGS = {
    "happy": {
        "low":  ["今日も頑張ってるね！", "すごい、タスク終わらせたんだ！", "いい調子だよ！"],
        "mid":  ["さすがだね、今日も完璧！", "一緒に頑張れてうれしい！", "どんどん進んでるね！"],
        "high": ["あなたのこと、誇りに思う。", "今日もかっこよかった。", "もっと頑張れって言いたいけど、十分すぎるくらいだよ。"],
    },
    "normal": {
        "low":  ["今日も一緒に頑張ろう！", "まだ間に合うよ、やってみよう！", "待ってたよ！"],
        "mid":  ["来てくれた！今日は何する？", "一緒にいると安心する。", "今日も頑張ろうね。"],
        "high": ["また来てくれた。うれしい。", "いつも来てくれてありがとう。", "今日も隣にいるよ。"],
    },
    "lonely": {
        "low":  ["久しぶり！元気だった？", "待ってたよ…来てくれてよかった。", "忘れてなかったんだね。"],
        "mid":  ["心配してたよ…大丈夫だった？", "また会えてうれしい。", "待ってたんだから。"],
        "high": ["…来てくれた。ずっと待ってた。", "寂しかったよ。もう置いてかないでね。", "また会えると信じてた。"],
    },
}


def get_affection_tier(affection: int) -> str:
    if affection >= 30:
        return "high"
    elif affection >= 10:
        return "mid"
    return "low"


def get_mood(user: User, db: Session) -> str:
    today = date.today()

    # 2日以上来ていない → lonely
    if user.last_login_date and (today - user.last_login_date).days >= 2:
        return "lonely"

    # 今日タスクを完了している → happy
    from app.models.task import Task
    from sqlalchemy import func
    completed_today = (
        db.query(TaskCompletion)
        .filter(
            TaskCompletion.user_id == user.id,
            func.date(TaskCompletion.completed_at) == today,
        )
        .first()
    )
    if completed_today:
        return "happy"

    return "normal"


def get_fernet() -> Fernet:
    return Fernet(settings.encryption_key.encode() if isinstance(settings.encryption_key, str) else settings.encryption_key)


def mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:6] + "****" + key[-4:]


def update_login_streak(user: User, db: Session):
    today = date.today()
    if user.last_login_date == today:
        return  # 今日はもう更新済み

    if user.last_login_date and (today - user.last_login_date).days == 1:
        user.login_streak = (user.login_streak or 0) + 1
    elif user.last_login_date and (today - user.last_login_date).days > 1:
        user.login_streak = 1  # ストリークリセット
    else:
        user.login_streak = 1  # 初回

    user.affection = min((user.affection or 0) + 1, 100)  # 毎ログイン+1、上限100
    user.last_login_date = today
    db.commit()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_login_streak(current_user, db)
    return current_user


TITLES = [
    {"id": "first_task", "label": "はじめの一歩", "condition": "初タスク完了", "emoji": "🌱"},
    {"id": "ten_tasks", "label": "努力家", "condition": "10タスク完了", "emoji": "📚"},
    {"id": "fifty_tasks", "label": "猛者", "condition": "50タスク完了", "emoji": "⚔️"},
    {"id": "streak_3", "label": "3日連続", "condition": "3日連続ログイン", "emoji": "🔥"},
    {"id": "streak_7", "label": "一週間の絆", "condition": "7日連続ログイン", "emoji": "💫"},
    {"id": "streak_30", "label": "皆勤賞", "condition": "30日連続ログイン", "emoji": "👑"},
    {"id": "affection_10", "label": "仲良し", "condition": "親密度10", "emoji": "💕"},
    {"id": "affection_30", "label": "大切な人", "condition": "親密度30", "emoji": "💖"},
]


def get_unlocked_titles(user: User, total_completions: int) -> list[dict]:
    unlocked = []
    streak = user.login_streak or 0
    affection = user.affection or 0

    if total_completions >= 1:
        unlocked.append(TITLES[0])
    if total_completions >= 10:
        unlocked.append(TITLES[1])
    if total_completions >= 50:
        unlocked.append(TITLES[2])
    if streak >= 3:
        unlocked.append(TITLES[3])
    if streak >= 7:
        unlocked.append(TITLES[4])
    if streak >= 30:
        unlocked.append(TITLES[5])
    if affection >= 10:
        unlocked.append(TITLES[6])
    if affection >= 30:
        unlocked.append(TITLES[7])
    return unlocked


@router.get("/me/dashboard")
async def get_dashboard_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ダッシュボード用：常駐キャラ・好感度・気分・挨拶を返す"""
    import random

    # 最近使ったプランのキャラを取得
    plan_with_char = (
        db.query(StudyPlan)
        .filter(StudyPlan.user_id == current_user.id, StudyPlan.character_id != None)
        .order_by(StudyPlan.created_at.desc())
        .first()
    )
    character = None
    if plan_with_char:
        character = db.query(Character).filter(Character.id == plan_with_char.character_id).first()
    if not character:
        character = db.query(Character).filter(Character.user_id == current_user.id).first()

    mood = get_mood(current_user, db)
    tier = get_affection_tier(current_user.affection or 0)
    greeting_pool = MOOD_GREETINGS[mood][tier]

    # キャラの口癖があれば一定確率で混ぜる
    if character and character.catchphrase and random.random() < 0.3:
        greeting = f"「{character.catchphrase}」"
    else:
        greeting = random.choice(greeting_pool)

    # 称号チェック
    total_completions = db.query(TaskCompletion).filter(TaskCompletion.user_id == current_user.id).count()
    titles = get_unlocked_titles(current_user, total_completions)

    # 週次レポート（土日に表示）
    weekly_report = None
    if date.today().weekday() >= 5:  # 土日
        week_completions = (
            db.query(TaskCompletion)
            .filter(
                TaskCompletion.user_id == current_user.id,
                func.date(TaskCompletion.completed_at) >= date.today() - timedelta(days=7),
            )
            .count()
        )
        if week_completions > 0:
            reports = [
                f"今週は{week_completions}個のタスクをやり遂げたね！すごい。",
                f"{week_completions}個も終わらせた、お疲れ様。",
                f"今週{week_completions}タスク完了！来週も一緒に頑張ろ。",
            ]
            weekly_report = random.choice(reports)
        else:
            weekly_report = "今週はちょっと大変だったかな。来週また一緒に頑張ろう。"

    return {
        "character": {
            "id": character.id,
            "name": character.name,
            "avatar_url": character.avatar_url,
            "catchphrase": character.catchphrase,
        } if character else None,
        "affection": current_user.affection or 0,
        "login_streak": current_user.login_streak or 0,
        "mood": mood,
        "greeting": greeting,
        "titles": titles,
        "weekly_report": weekly_report,
    }


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/api-key")
async def update_api_key(
    data: ApiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.provider not in ("anthropic", "google"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid provider. Must be 'anthropic' or 'google'",
        )

    fernet = get_fernet()
    encrypted = fernet.encrypt(data.api_key.encode()).decode()

    current_user.ai_provider = data.provider
    current_user.encrypted_api_key = encrypted
    db.commit()

    return {"message": "API key updated successfully"}


@router.delete("/me/api-key")
async def delete_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.encrypted_api_key = None
    db.commit()
    return {"message": "API key deleted successfully"}


@router.get("/me/api-key/status", response_model=ApiKeyStatus)
async def get_api_key_status(current_user: User = Depends(get_current_user)):
    if not current_user.encrypted_api_key:
        return ApiKeyStatus(
            provider=current_user.ai_provider,
            masked_key=None,
            is_set=False,
        )

    fernet = get_fernet()
    decrypted = fernet.decrypt(current_user.encrypted_api_key.encode()).decode()

    return ApiKeyStatus(
        provider=current_user.ai_provider,
        masked_key=mask_api_key(decrypted),
        is_set=True,
    )
