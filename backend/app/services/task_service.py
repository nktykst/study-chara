import json
from app.services.ai_service import AIService, build_character_system_prompt


async def generate_tasks_from_ai(
    ai_service: AIService,
    character,
    study_plan,
) -> list[dict]:
    system = (
        "あなたは学習計画のタスク生成AIです。"
        "与えられた学習目標・計画・期間をもとに、具体的なタスクリストをJSON形式で生成してください。\n\n"
        "必ず以下の形式のJSONのみを返してください（他のテキストは不要）:\n"
        '[\n'
        '  {\n'
        '    "title": "タスクタイトル",\n'
        '    "description": "タスクの詳細説明",\n'
        '    "due_date": "YYYY-MM-DD",\n'
        '    "order_index": 0\n'
        '  }\n'
        ']\n'
        "due_dateはstart_dateとend_dateの間の日付にすること。"
    )

    # ai_planは長くなりがちなので先頭200文字に制限
    ai_plan_summary = (study_plan.ai_plan or "")[:200]
    situation_part = f"\n現在の状況: {study_plan.current_situation}" if getattr(study_plan, 'current_situation', None) else ""

    messages = [
        {
            "role": "user",
            "content": (
                f"目標: {study_plan.goal}{situation_part}\n"
                f"期間: {study_plan.start_date}〜{study_plan.end_date}\n"
                f"計画概要: {ai_plan_summary}\n\n"
                "タスクを5〜8個生成してください。descriptionは1文以内で簡潔に。"
            ),
        }
    ]

    raw = await ai_service.generate(system=system, messages=messages, max_tokens=1024)

    # JSONパース（```json ... ``` ブロックを除去）
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    tasks = json.loads(raw)
    return tasks


async def generate_cheer_message(
    ai_service: AIService,
    character,
    task_title: str,
) -> str:
    system = build_character_system_prompt(character)
    system += "\n\n励ましメッセージを1〜2文で生成してください。簡潔に。"

    messages = [
        {
            "role": "user",
            "content": f"「{task_title}」完了！",
        }
    ]

    return await ai_service.generate(system=system, messages=messages, max_tokens=100)
