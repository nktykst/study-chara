# StudyChara（スタディキャラ）

キャラクター（AI）と一緒に学習計画を立て、タスク管理・進捗確認・励ましを受けられるWebアプリ。

## 技術スタック

- **バックエンド**: Python / FastAPI
- **フロントエンド**: Next.js 14（App Router）
- **認証**: Clerk
- **DB**: Vercel Postgres（PostgreSQL）
- **ORM**: SQLAlchemy + Alembic
- **AI**: Anthropic Claude API / Google Gemini API（BYOK方式）
- **デプロイ**: Vercel

## セットアップ

### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .envを編集して環境変数を設定
alembic upgrade head
uvicorn app.main:app --reload
```

### フロントエンド

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.localを編集して環境変数を設定
npm run dev
```

## 環境変数

### backend/.env

```
DATABASE_URL=          # Vercel Postgres接続文字列
CLERK_SECRET_KEY=      # Clerk シークレットキー
ENCRYPTION_KEY=        # APIキー暗号化用キー（Fernet.generate_key()で生成）
```

### frontend/.env.local

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Clerk 公開鍵
CLERK_SECRET_KEY=                    # Clerk シークレットキー
NEXT_PUBLIC_API_URL=                 # FastAPI のベースURL
```

## デプロイ

Vercelに2プロジェクト作成し、同一Monorepoから別々にデプロイ。

- `study-chara-backend`: rootDirectory = `backend`
- `study-chara-frontend`: rootDirectory = `frontend`
