# StudyChara（スタディキャラ）

> 萌えキャラと一緒に学習計画を達成するモチベーション管理アプリ

**Live Demo**: https://study-chara-rfme.vercel.app

---

## 概要

学習計画の挫折原因の多くは「モチベーション維持の難しさ」にあります。StudyCharaは、AI駆動のオリジナルキャラクターが学習パートナーとなり、タスク完了のたびに褒めてくれる・遅れたら励ましてくれる仕組みで、学習継続率の向上を目指したWebアプリです。

---

## 機能一覧

### AI学習計画生成
- 目標・期間・現在の状況を入力するとGemini AIが学習計画を自動生成
- 計画に不満があればフィードバックを入力して再生成
- 日ごとのタスクに分割して期日付きで管理

### 萌えキャラクターシステム
- 名前・人格設定・口調・口癖・カスタムプロンプトで自由にキャラを作成
- アバター画像はファイルアップロード対応（Base64でDB保存）
- キャラクターごとに異なる口調でAIが応答（SillyTavern形式のプロンプト対応）

### ゲーミフィケーション
- **好感度システム**: タスク完了・ログインごとに好感度が上がり、キャラの態度が変化
- **ログインストリーク**: 連続ログイン日数を記録・表示
- **称号システム**: タスク完了数・ストリーク・好感度に応じて8種類の称号を獲得
- **応援メッセージ**: タスク完了時にキャラクターが口調に合わせた褒め言葉を生成

### タスク管理
- 今日のタスク・今後のタスク・達成済みタスクをまとめて確認
- 期日超過タスクを警告表示
- 遅延検知：進捗が遅れていると判定したらキャラが再スケジュールを提案
- AIによる自動再スケジュール（残タスクを期日まで再配分）

### カレンダービュー
- 月カレンダーで全プランのタスクを一覧表示
- プランごとに色分け・表示フィルタリング対応

### ポモドーロタイマー
- 25分作業 / 5分休憩のタイマー
- 開始・終了時にキャラクターがセリフを表示

### BYOK（Bring Your Own Key）
- ユーザー自身のGemini APIキーを登録可能（Fernetで暗号化保存）
- 未登録ユーザーはシステムデフォルトキーにフォールバック

---

## 技術スタック

### バックエンド
| 技術 | 用途 |
|------|------|
| Python 3.11 / FastAPI | REST API サーバー |
| SQLAlchemy + Alembic | ORM・マイグレーション |
| Neon PostgreSQL | サーバーレス対応PostgreSQL |
| Clerk (JWT) | 認証・ユーザー管理 |
| Google Gemini API | AI計画生成・応答・再スケジュール |
| Fernet (cryptography) | APIキーの対称暗号化 |

### フロントエンド
| 技術 | 用途 |
|------|------|
| Next.js 14 (App Router) | React フレームワーク |
| TypeScript | 型安全な実装 |
| Tailwind CSS | スタイリング |
| Clerk Next.js SDK | 認証UI・JWTトークン取得 |
| Lucide React | アイコン |

### インフラ
| 技術 | 用途 |
|------|------|
| Vercel | フロント・バックエンド両方のホスティング |
| Neon | サーバーレスPostgreSQL |

---

## アーキテクチャ

```
┌─────────────────────────────────┐
│         Next.js Frontend         │
│  (Vercel / App Router / Clerk)   │
└────────────┬────────────────────┘
             │ REST API (JWT)
┌────────────▼────────────────────┐
│         FastAPI Backend          │
│  (Vercel Serverless Functions)   │
│                                  │
│  ┌──────────┐  ┌──────────────┐  │
│  │  Clerk   │  │ Gemini API   │  │
│  │  JWT検証  │  │  AI生成・応答 │  │
│  └──────────┘  └──────────────┘  │
│                                  │
│  ┌──────────────────────────┐    │
│  │   Neon PostgreSQL        │    │
│  │  (NullPool / 接続プール無) │    │
│  └──────────────────────────┘    │
└─────────────────────────────────┘
```

### 設計上の工夫・解決した課題

**サーバーレス環境でのDB接続**  
Vercel Functions は実行のたびにコンテナが起動するため、SQLAlchemyのコネクションプールを `NullPool` に設定して接続リークを防止。

**CORS + JWT認証の両立**  
Clerk JWTをBearerトークンで検証しつつ、CORSの `allow_credentials=False` + `allow_origins=["*"]` の組み合わせで認証とクロスオリジン許可を両立。FastAPIの `redirect_slashes=False` でリダイレクト起因のCORSエラーも解消。

**キャラクター個性の表現**  
SillyTavern形式のカスタムプロンプトをサポート。システムプロンプトの組み立て時に `custom_prompt` が最優先となるよう設計し、口調・人格の再現精度を向上。

**Base64アバター画像**  
外部ストレージ不要でアバター画像を保存するため、クライアント側でFileReaderによりDataURLに変換しText型カラムに格納。

---

## ローカル起動

### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 環境変数を設定
alembic upgrade head
uvicorn app.main:app --reload
```

### フロントエンド

```bash
cd frontend
npm install
cp .env.example .env.local  # 環境変数を設定
npm run dev
```

### 必要な環境変数

**backend/.env**
```
DATABASE_URL=           # Neon PostgreSQL接続文字列
CLERK_SECRET_KEY=       # Clerk シークレットキー
ENCRYPTION_KEY=         # Fernet.generate_key() で生成
DEFAULT_GEMINI_API_KEY= # フォールバック用Gemini APIキー
```

**frontend/.env.local**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Clerk 公開鍵
CLERK_SECRET_KEY=                   # Clerk シークレットキー
NEXT_PUBLIC_API_URL=                # FastAPIのベースURL
```

---

## デプロイ

Vercelに2プロジェクト作成し、同一MonorepoからRoot Directoryを分けてデプロイ。

| プロジェクト | Root Directory | Runtime |
|------------|----------------|---------|
| study-chara-backend | `backend` | Python (Serverless) |
| study-chara-frontend | `frontend` | Next.js |

---

## 画面構成

| 画面 | パス | 説明 |
|------|------|------|
| ダッシュボード | `/dashboard` | 今日の目標宣言・キャラ挨拶・称号・週次レポート |
| 学習計画一覧 | `/plans` | 全プラン一覧・新規作成 |
| 計画詳細 | `/plans/[id]` | タスク管理・進捗・AI再生成・ポモドーロ |
| タスク | `/tasks` | 今日・今後・達成済みタスクのまとめ |
| カレンダー | `/calendar` | 月カレンダーでタスクを可視化 |
| キャラクター管理 | `/characters` | キャラ作成・編集・削除 |
| 設定 | `/settings` | APIキー登録 |
