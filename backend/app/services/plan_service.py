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
                f"学習目標: {goal}\n"
                f"開始日: {start_date}\n"
                f"終了日: {end_date}\n\n"
                "この目標を達成するための学習計画を作成してください。"
                "励ましの言葉も交えながら、具体的な学習の進め方を教えてください。"
            ),
        }
    ]

    return await ai_service.generate(system=system, messages=messages)
