from app.services.ai_service import AIService, build_character_system_prompt


async def generate_ai_plan(
    ai_service: AIService,
    character,
    goal: str,
    start_date,
    end_date,
) -> str:
    system = build_character_system_prompt(character)
    system += "\n\nユーザーから学習目標と期間を受け取り、キャラクターの口調で具体的な学習計画文を生成してください。"

    messages = [
        {
            "role": "user",
            "content": (
                f"目標: {goal}\n"
                f"期間: {start_date}〜{end_date}\n\n"
                "学習計画を300字以内で作成してください。"
            ),
        }
    ]

    return await ai_service.generate(system=system, messages=messages, max_tokens=400)
