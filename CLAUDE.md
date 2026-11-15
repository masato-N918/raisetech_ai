# raisetech_ai 開発ガイド（Claude Code 用）

このリポジトリで作業するときの開発ルールです。Claude Code はこのファイルの内容に従って作業します。

## ブランチ運用（最重要）

- **`main` へ直接コミット・プッシュしない。** `main` はGitHubのルールセットで保護されており、直プッシュは拒否されます。
- 変更は**必ずGitHub Issueを立て、そのIssueに紐づくブランチ**を切って行います。
- `main` への反映は**PR（プルリクエスト）経由のマージのみ**です。

### ブランチ命名規則

`<種別>/issue-<番号>-<内容>`

| 種別 | 用途 |
| --- | --- |
| `feature/` | 新機能の追加 |
| `fix/` | バグ修正 |
| `docs/` | ドキュメントの変更 |
| `refactor/` | リファクタリング |
| `chore/` | 設定・ビルド・雑務 |

例:
- `feature/issue-12-add-task-list`
- `fix/issue-15-login-error`
- `docs/issue-1-add-claude-workflow`

## 作業の流れ

```bash
# 1. Issueを立てる（番号を確認）
gh issue create

# 2. mainを最新化
git switch main
git pull --ff-only

# 3. Issueに紐づくブランチを切る
git switch -c feature/issue-<番号>-<内容>

# 4. 変更してコミット（本文に "Closes #<番号>" を書くとマージ時にIssueが自動クローズ）
git add -A
git commit

# 5. ブランチをpush
git push -u origin feature/issue-<番号>-<内容>

# 6. PRを作成
gh pr create

# 7. マージ後、ブランチを削除
gh pr merge --delete-branch
```

- コミットメッセージやPR本文に `#<番号>` を書くとIssueに紐づきます。
- `Closes #<番号>` / `Fixes #<番号>` と書くと、マージ時にIssueが自動でクローズされます。

## GitHub設定メモ

- `main` はリポジトリルールセット `protect-main` で保護済み。
  - 直プッシュ禁止（PR経由のみ）
  - ブランチ削除禁止・force-push禁止
  - レビュー承認数は **0**（ソロ開発のため、自分でPRをマージ可能）
  - オーナー（管理者）にも適用（バイパスなし）

## プロジェクト概要

- バックエンド: Java 25 + Spring Boot 4
- フロントエンド: React
- データベース: PostgreSQL（Docker Compose、Flywayでスキーマ管理）

## 補足

- このプロジェクトはスクールの学習課題です。一度に作り込まず、1ステップずつ段階的に進めます。
- ユーザーに見える確認メッセージなどは日本語で記述します。
