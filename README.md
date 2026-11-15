# raisetech_ai

Trello風のタスク管理アプリ（スクール学習課題）。

- バックエンド: Java 25 + Spring Boot 4（`backend/`）
- フロントエンド: React + TypeScript + Vite（`frontend/`）
- データベース: PostgreSQL（Docker Compose + Flyway）

## 起動手順

### 1. バックエンド（API: http://localhost:8080）

```bash
cd backend
cp .env.example .env     # 初回のみ。接続情報を設定
docker compose up -d     # PostgreSQL を起動（Flyway でスキーマ＋テストデータ投入）
./gradlew bootRun        # Spring Boot を起動
```

動作確認: `curl http://localhost:8080/api/cards` でカード一覧（JSON）が返れば OK。

### 2. フロントエンド（開発サーバー: http://localhost:5173）

```bash
cd frontend
npm install              # 初回のみ
npm run dev
```

ブラウザで http://localhost:5173 を開くと、カードが ToDo / Doing のリストごとにボード表示されます。
ヘッダーの検索ボックスにキーワードを入れると、タイトル・説明の部分一致でカードを絞り込めます。

> フロントは `/api` へのリクエストを Vite の開発プロキシでバックエンド（:8080）へ転送するため、
> バックエンドを先に起動しておく必要があります。

## 機能（現時点）

- カードの一覧表示（リストごとのカラム表示）
- キーワード検索（タイトル・説明の部分一致）

カードの作成・編集・ドラッグ&ドロップなどは今後のステップで追加予定です。
