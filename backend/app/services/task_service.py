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

    messages = [
        {
            "role": "user",
            "content": (
                f"学習目標: {study_plan.goal}\n"
                f"開始日: {study_plan.start_date}\n"
                f"終了日: {study_plan.end_date}\n"
                f"学習計画:\n{study_plan.ai_plan or '未生成'}\n\n"
                "この計画を実行するための具体的なタスクリストをJSON形式で生成してください。"
                "タスクは5〜15個程度にしてください。"
            ),
        }
    ]

    raw = await ai_service.generate(system=system, messages=messages)

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
    system += "\n\nユーザーがタスクを完了したときに励ましメッセージを生成してください。短く、元気が出るメッセージにしてください。"

    messages = [
        {
            "role": "user",
            "content": f"タスク「{task_title}」を完了しました！励ましのメッセージをください。",
        }
    ]

    return await ai_service.generate(system=system, messages=messages)
