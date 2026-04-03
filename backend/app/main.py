from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, characters, study_plans, tasks, conversations

app = FastAPI(title="StudyChara API", version="1.0.0")

# CORS設定
from app.config import settings

origins = ["http://localhost:3000"]
if settings.frontend_url:
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(users.router, tags=["users"])
app.include_router(characters.router, prefix="/characters", tags=["characters"])
app.include_router(study_plans.router, prefix="/study-plans", tags=["study-plans"])
app.include_router(tasks.router, tags=["tasks"])
app.include_router(conversations.router, tags=["conversations"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
