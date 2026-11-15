# raisetech_ai

ボード上でカード（付箋）を動かしながらタスクを視覚的に管理する、**Trello風タスク管理アプリ**です。
個人のタスクを「ToDo / Doing / Done」の状態で整理し、進捗をひと目で把握できることを目指します。

> スクールの学習課題として開発しています。一度に作り込まず、1ステップずつ段階的に進めています。

## 技術スタック

| 区分 | 技術 |
|------|------|
| バックエンド | Java 25 + Spring Boot 4.1（REST API） |
| ビルドツール | Gradle 9.8（Gradle Wrapper） |
| DB アクセス | Spring JDBC（JdbcTemplate） ※JPA/Hibernateは不使用 |
| DB マイグレーション | Flyway |
| データベース | PostgreSQL 18（Docker Compose / `postgres:18-alpine`） |
| 実行環境（FE） | Node.js 22 + npm 12 |
| フロントエンド | React 19 + TypeScript 7 + Vite 8 |
| HTTP クライアント | fetch API（ブラウザ標準） |
| Lint / テスト | oxlint（FE） / JUnit 5（BE） |

> フロント（React）とバックエンド（Spring Boot）は分離構成とし、REST API（JSON）で連携します。
> フロントは `/api` へのリクエストを Vite の開発プロキシでバックエンド（:8080）へ転送します。

## ディレクトリ構成

```
raisetech_ai/
├── backend/      # Spring Boot（REST API）
│   ├── src/main/java/com/example/taskboard/   # コントローラ・サービス・リポジトリ
│   ├── src/main/resources/db/migration/       # Flyway マイグレーション（V1, V2...）
│   └── docker-compose.yml                     # PostgreSQL
├── frontend/     # React + TypeScript（Vite）
│   └── src/                                   # 画面・API 呼び出し
├── docs/         # 要件定義・設計ドキュメント
└── CLAUDE.md     # 開発ワークフロー（ブランチ運用ルール）
```

## 起動手順

### 1. バックエンド（API: http://localhost:8080）

```bash
cd backend
cp .env.example .env     # 初回のみ。DB 接続情報（パスワード等）を設定
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

ブラウザで http://localhost:5173 を開くと、カードが ToDo / Doing / Done のリストごとにボード表示されます。

> バックエンドを先に起動しておく必要があります（フロントは `/api` を :8080 へプロキシするため）。

## 機能（現時点）

- ボード表示（ToDo / Doing / Done の固定3リスト）
- カードの追加・編集・削除（モーダルでタイトル・説明・リスト・優先度・期限を入力。削除は確認ダイアログあり）
- カードのドラッグ&ドロップ（リスト内の並べ替え・リスト間の移動）
- 期限の色分け（3日以内＝黄、期限切れ＝赤）と優先度バッジ（高 / 中 / 低）
- チェックリスト（項目の追加・完了切替・削除、進捗表示）
- キーワード検索（タイトル・説明の部分一致）
- リスト内カードの期限順 / 優先度順の並べ替え（結果を保存）

ボード・リストの管理やラベルは将来拡張としています（詳細は [機能要件](docs/機能要件.md)）。

## API エンドポイント

| メソッド | パス | 説明 |
|------|------|------|
| GET | `/api/cards` | 全カードを取得（チェック項目を含む） |
| GET | `/api/cards?keyword=xxx` | タイトル・説明をキーワードで部分一致検索 |
| POST | `/api/cards` | カードを登録 |
| PUT | `/api/cards/{id}` | カードを更新 |
| DELETE | `/api/cards/{id}` | カードを削除（子のチェック項目も併せて削除） |
| PUT | `/api/cards/{id}/position` | カードを指定リストの指定位置へ移動 |
| PUT | `/api/lists/{listId}/card-order` | リスト内カードの並び順をまとめて更新 |
| POST | `/api/cards/{cardId}/checklist-items` | チェック項目を追加 |
| PATCH | `/api/checklist-items/{id}` | チェック項目の内容・完了状態を更新 |
| DELETE | `/api/checklist-items/{id}` | チェック項目を削除 |

## ドキュメント

| ドキュメント | 内容 |
|------|------|
| [要件定義書](docs/要件定義書.md) | 全体の概要・スコープ・技術スタック |
| [機能要件](docs/機能要件.md) | ユースケース、機能要件一覧 |
| [画面設計書](docs/画面設計書.md) | 画面一覧、画面遷移、ワイヤーフレーム |
| [データ設計書](docs/データ設計書.md) | データ項目、ER図、テーブル定義 |
| [非機能要件](docs/非機能要件.md) | 性能・可用性・セキュリティ等 |

## 開発ワークフロー

`main` への直接コミットは禁止です。変更は **Issue を立て → ブランチを切り → PR 経由でマージ** します。
詳細は [CLAUDE.md](CLAUDE.md) を参照してください。
