from typing import Optional
from app.services.ai_service import AIService, build_character_system_prompt


async def generate_ai_plan(
    ai_service: AIService,
    goal: str,
    start_date,
    end_date,
    character=None,
    current_situation: Optional[str] = None,
) -> str:
    if character:
        system = build_character_system_prompt(character)
        system += "\n\n学習計画を300字以内で作成してください。"
    else:
        system = "あなたは学習サポートAIです。学習計画を300字以内で作成してください。"

    situation_part = f"\n現在の状況: {current_situation}" if current_situation else ""

    messages = [
        {
            "role": "user",
            "content": (
                f"目標: {goal}{situation_part}\n"
                f"期間: {start_date}〜{end_date}\n\n"
                "学習計画を300字以内で作成してください。"
            ),
        }
    ]

    return await ai_service.generate(system=system, messages=messages, max_tokens=400)


async def regenerate_ai_plan(
    ai_service: AIService,
    goal: str,
    start_date,
    end_date,
    current_plan: str,
    feedback: str,
    character=None,
    current_situation: Optional[str] = None,
) -> str:
    if character:
        system = build_character_system_prompt(character)
        system += "\n\n学習計画を300字以内で作成してください。"
    else:
        system = "あなたは学習サポートAIです。学習計画を300字以内で作成してください。"

    situation_part = f"\n現在の状況: {current_situation}" if current_situation else ""

    messages = [
        {
            "role": "user",
            "content": (
                f"目標: {goal}{situation_part}\n"
                f"期間: {start_date}〜{end_date}\n\n"
                "学習計画を300字以内で作成してください。"
            ),
        },
        {
            "role": "assistant",
            "content": current_plan,
        },
        {
            "role": "user",
            "content": f"フィードバック: {feedback}\n\nこのフィードバックをもとに計画を改善してください。",
        },
    ]

    return await ai_service.generate(system=system, messages=messages, max_tokens=400)
