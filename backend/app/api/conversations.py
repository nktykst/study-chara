from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.models.study_plan import StudyPlan
from app.models.conversation import Conversation, Message
from app.models.character import Character
from app.models.user import User
from app.schemas.conversation import (
    MessageCreate,
    MessageResponse,
    ConversationResponse,
    ConversationDetailResponse,
)
from app.services.ai_service import get_ai_service, build_character_system_prompt

router = APIRouter()


@router.get("/study-plans/{plan_id}/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(StudyPlan).filter(
        StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")

    return db.query(Conversation).filter(Conversation.study_plan_id == plan_id).all()


@router.post(
    "/study-plans/{plan_id}/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(StudyPlan).filter(
        StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study plan not found")

    conversation = Conversation(
        user_id=current_user.id,
        study_plan_id=plan_id,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationDetailResponse)
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

    return ConversationDetailResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        study_plan_id=conversation.study_plan_id,
        created_at=conversation.created_at,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="API key not set. Please configure your AI provider API key.",
        )

    # ユーザーメッセージを保存
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content,
    )
    db.add(user_message)
    db.commit()

    # 会話履歴を取得
    history = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

    # 直近10件のみ送信してトークン節約
    recent_history = history[-10:]
    messages_for_ai = [{"role": m.role, "content": m.content} for m in recent_history]

    # キャラクター情報とスタディプランを取得
    plan = db.query(StudyPlan).filter(StudyPlan.id == conversation.study_plan_id).first()
    character = None
    if plan and plan.character_id:
        character = db.query(Character).filter(Character.id == plan.character_id).first()

    # システムプロンプト構築（plan情報は簡潔に）
    if character:
        system = build_character_system_prompt(character)
    else:
        system = "あなたは学習サポートAIです。ユーザーの学習を支援してください。"

    if plan:
        situation = f"／現在の状況: {plan.current_situation}" if getattr(plan, 'current_situation', None) else ""
        system += f"\n\n学習計画: {plan.title}／目標: {plan.goal}{situation}／期間: {plan.start_date}〜{plan.end_date}"

    # AI返答生成
    ai_service = get_ai_service(current_user)
    if not ai_service:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize AI service.",
        )

    try:
        ai_response = await ai_service.generate(system=system, messages=messages_for_ai, max_tokens=512)
    except Exception as e:
        err = str(e)
        if "429" in err or "quota" in err.lower() or "rate" in err.lower():
            detail = "APIの利用制限に達しました。しばらく待ってから再度お試しください。"
        elif "401" in err or "invalid" in err.lower() or "api key" in err.lower():
            detail = "APIキーが無効です。設定画面で正しいAPIキーを登録してください。"
        else:
            detail = "AIの返答生成に失敗しました。しばらく待ってから再度お試しください。"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )

    # AIメッセージを保存
    ai_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response,
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)

    return ai_message
