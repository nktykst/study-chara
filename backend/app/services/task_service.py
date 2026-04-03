import json
from datetime import date, timedelta
from app.services.ai_service import AIService, build_character_system_prompt


async def generate_tasks_from_ai(
    ai_service: AIService,
    character,
    study_plan,
) -> list[dict]:
    start = study_plan.start_date
    end = study_plan.end_date
    total_days = (end - start).days + 1 if hasattr(end, 'days') else 1
    try:
        from datetime import date as _date
        s = start if isinstance(start, _date) else _date.fromisoformat(str(start))
        e = end if isinstance(end, _date) else _date.fromisoformat(str(end))
        total_days = (e - s).days + 1
    except Exception:
        total_days = 7

    system = (
        "あなたは学習計画のタスク生成AIです。\n"
        "1日1タスクを基本とし、期間内の各日付に具体的なタスクを割り当ててください。\n"
        "同じ日に複数タスクは入れない。学習量が多い場合はタスクを1日分に収まるよう分割する。\n"
        "必ず以下の形式のJSONのみを返してください（他のテキストは不要）:\n"
        '[\n'
        '  {\n'
        '    "title": "その日にやる具体的な作業",\n'
        '    "description": "補足があれば1文で。なければ空文字",\n'
        '    "due_date": "YYYY-MM-DD",\n'
        '    "order_index": 0\n'
        '  }\n'
        ']\n'
        f"due_dateは必ず{start}〜{end}の範囲内にすること。週末も含めてよい。"
    )

    ai_plan_summary = getattr(study_plan, 'ai_plan_summary', None) or (study_plan.ai_plan or "")[:200]
    situation_part = f"\n現在の状況: {study_plan.current_situation}" if getattr(study_plan, 'current_situation', None) else ""

    messages = [
        {
            "role": "user",
            "content": (
                f"目標: {study_plan.goal}{situation_part}\n"
                f"期間: {start}〜{end}（{total_days}日間）\n"
                f"計画概要: {ai_plan_summary}\n\n"
                f"1日1タスクで{min(total_days, 30)}個のタスクを生成してください。"
                "各タスクのtitleは「〇〇ページを読む」「〇〇の問題を解く」など当日にやる具体的な作業にしてください。"
            ),
        }
    ]

    raw = await ai_service.generate(system=system, messages=messages, max_tokens=2048)

    # JSONパース（```json ... ``` ブロックを除去）
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    tasks = json.loads(raw)
    return tasks


async def generate_delay_warning(
    ai_service: AIService,
    character,
    plan_title: str,
    completed: int,
    total: int,
    days_left: int,
    expected_progress: float,
    actual_progress: float,
) -> str:
    if character:
        system = build_character_system_prompt(character)
    else:
        system = "あなたは学習サポートAIです。"
    system += "\n\n1〜2文の短文で。LINEのような口調で。マークダウン禁止。"

    messages = [
        {
            "role": "user",
            "content": (
                f"学習計画「{plan_title}」の進捗が遅れています。\n"
                f"期待進捗: {expected_progress:.0f}% / 実際: {actual_progress:.0f}% / 残り{days_left}日\n"
                f"タスク {completed}/{total}完了。\n"
                "このユーザーに計画が遅れていることを伝えて、再スケジュールを提案してください。"
            ),
        }
    ]
    return await ai_service.generate(system=system, messages=messages, max_tokens=80)


async def reschedule_tasks(
    ai_service: AIService,
    incomplete_tasks: list,
    end_date: date,
) -> list[dict]:
    """未完了タスクを残り日数に均等配分して due_date を再設定"""
    today = date.today()
    days_left = (end_date - today).days
    if days_left <= 0:
        days_left = 1

    task_count = len(incomplete_tasks)
    interval = max(1, days_left // task_count)

    result = []
    for i, task in enumerate(incomplete_tasks):
        new_due = today + timedelta(days=min(interval * (i + 1), days_left))
        result.append({"id": task.id, "due_date": new_due})
    return result


async def generate_cheer_message(
    ai_service: AIService,
    character,
    task_title: str,
) -> str:
    if character:
        system = build_character_system_prompt(character)
    else:
        system = "あなたは学習サポートAIです。"
    system += "\n\n励ましメッセージを1〜2文で生成してください。LINEのような短い口調で。マークダウン禁止。"

    messages = [
        {
            "role": "user",
            "content": f"「{task_title}」完了！",
        }
    ]

    return await ai_service.generate(system=system, messages=messages, max_tokens=100)
