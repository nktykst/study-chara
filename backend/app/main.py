from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import users, characters, study_plans, tasks, conversations
from app.config import settings

app = FastAPI(title="StudyChara API", version="1.0.0", redirect_slashes=False)

# CORS設定
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

# OPTIONSプリフライトを明示的に処理
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return JSONResponse(content={}, status_code=200)

# ルーター登録
app.include_router(users.router, tags=["users"])
app.include_router(characters.router, prefix="/characters", tags=["characters"])
app.include_router(study_plans.router, prefix="/study-plans", tags=["study-plans"])
app.include_router(tasks.router, tags=["tasks"])
app.include_router(conversations.router, tags=["conversations"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
