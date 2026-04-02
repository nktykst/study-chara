import json
from typing import Optional
import anthropic
import google.generativeai as genai


class AIService:
    def __init__(self, provider: str, api_key: str):
        self.provider = provider
        if provider == "anthropic":
            self.anthropic_client = anthropic.Anthropic(api_key=api_key)
        elif provider == "google":
            genai.configure(api_key=api_key)
            self.gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def generate(self, system: str, messages: list[dict], max_tokens: int = 512) -> str:
        if self.provider == "anthropic":
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            return response.content[0].text

        elif self.provider == "google":
            # Gemini用にメッセージ形式を変換
            history = []
            for msg in messages[:-1]:
                role = "user" if msg["role"] == "user" else "model"
                history.append({"role": role, "parts": [msg["content"]]})

            chat = self.gemini_model.start_chat(history=history)
            last_message = messages[-1]["content"] if messages else ""
            full_prompt = f"{system}\n\n{last_message}" if not history else last_message
            response = chat.send_message(full_prompt)
            return response.text

        raise ValueError(f"Unsupported provider: {self.provider}")


def get_ai_service(user) -> Optional[AIService]:
    """ユーザーのAPIキーからAIServiceを構築する"""
    if not user.encrypted_api_key:
        return None

    from cryptography.fernet import Fernet
    from app.config import settings

    fernet = Fernet(
        settings.encryption_key.encode()
        if isinstance(settings.encryption_key, str)
        else settings.encryption_key
    )
    api_key = fernet.decrypt(user.encrypted_api_key.encode()).decode()
    return AIService(provider=user.ai_provider, api_key=api_key)


def build_character_system_prompt(character) -> str:
    """キャラクターのシステムプロンプトを構築する"""
    parts = [f"あなたは「{character.name}」というキャラクターです。"]

    if character.persona:
        parts.append(f"人格・性格: {character.persona}")

    if character.tone:
        parts.append(f"話し方・口調: {character.tone}")

    if character.catchphrase:
        parts.append(f"励ます時の口癖: 「{character.catchphrase}」")

    parts.append(
        "ユーザーの学習をサポートする役割です。"
        "常にキャラクターの口調・人格を保ちながら回答してください。"
    )

    return "\n".join(parts)
