---
name: quality-check
description: raisetech_ai（Trello風タスク管理アプリ：Spring Boot + React、AWS へのデプロイは Terraform + PowerShell スクリプト）の品質チェックを行う。lint・型チェック・ビルド・依存の脆弱性チェック、Terraform の fmt / validate を実行し、要件定義書などの docs/ と実装の食い違い、バグ、デファクトスタンダードやベストプラクティスからのずれを洗い出して、優先度つきで報告する。「品質チェックして」「レビューして」「lint かけて」「よくない点を指摘して」「ベストプラクティスから外れていないか見て」「ドキュメントと実装がずれていないか確認して」など、コードの品質・正しさ・規約への適合を確かめたい依頼では、対象範囲や言い方が違っても必ずこのスキルを使うこと。
---

# 品質チェック（raisetech_ai）

このプロジェクトの品質を、**機械的なチェック**と**人の目でのレビュー**の両方から確認し、直すべき点を優先度つきで報告するためのスキル。

このプロジェクトはスクールの学習課題で、1ステップずつ段階的に作っている。指摘は「次に何を直せばよいか」が分かる形にし、学習者が理解できるように**なぜ問題なのか**を添える。

## 基本方針

- **修正はしない。報告までを行う。** 直すかどうか・どの順で直すかはユーザーが決める。直す場合は CLAUDE.md の運用（Issue → ブランチ → PR）に従い、別の作業として進める。
  - plan モードで呼ばれた場合は、報告内容を計画ファイルに書く。
- **推測で指摘しない。** バグとして挙げるものは、コードの流れを実際に追い、「どういう操作をすると何が起きるか」を具体的に書けるものだけにする。確信が持てないものは「要確認」と明記する。
- **lint の出力をそのまま並べない。** 誤検知や実害の小さい警告は除外し、意味のあるものだけを要約する（後述）。
- ユーザーに見せる文章とコマンドの説明はすべて日本語で書く。

## 手順

### 0. 対象範囲の確認

依頼で範囲が指定されていればそれに従う（例：「フロントだけ」「今のブランチの変更だけ」）。指定がなければリポジトリ全体を対象にする。

- ブランチの差分だけを見る場合：`git diff main...HEAD --stat` と `git diff main...HEAD`
- 既存の Issue と同じ指摘を重ねて出さないよう、`gh issue list --state open` で未対応の Issue を確認しておく。既に Issue がある指摘は「Issue #番号 で対応予定」と添える。

### 1. 機械的なチェック

以下を実行し、結果を記録する。1つが失敗しても残りは続ける。

**フロントエンド**（`frontend/` で実行）

| チェック | コマンド | 備考 |
|---|---|---|
| lint（プロジェクト設定） | `npm run lint` | 0 件であることを確認 |
| 型チェック＋ビルド | `npm run build` | `tsc -b` を含む |
| lint（拡張ルール） | `npx oxlint --jsx-a11y-plugin --react-perf-plugin -W suspicious -W perf src` | プロジェクト設定より厳しい観点。下の除外ルールで絞り込む |
| 依存の脆弱性 | `npm audit` | |

拡張ルールの結果は、次を**除外**してから集計する：

- `react(react-in-jsx-scope)`：React 17 以降の新しい JSX 変換（`"jsx": "react-jsx"`）では誤検知
- `react-perf(*)`：レンダリング最適化の提案で、このアプリの規模ではほぼ実害がない（1件ずつ挙げず「多数あるが対象外」とだけ書く）

残った警告（`jsx-a11y`、`no-await-in-loop`、`no-array-index-key`、`exhaustive-effect-dependencies` など）はルールごとに件数を数え、代表的な箇所と「何が問題か」を添える。

結果の整形には次のように集計すると楽：

```bash
npx oxlint --jsx-a11y-plugin -W suspicious -W perf src 2>/dev/null \
  | grep -E '^src' | grep -vE 'react-in-jsx-scope|react-perf' \
  | sed -E 's/^(src[^ ]+) warning ([^:]+):.*/\2/' | sort | uniq -c
```

**バックエンド**（`backend/` で実行）

| チェック | コマンド | 備考 |
|---|---|---|
| コンパイル | `./gradlew compileJava compileTestJava` | DB がなくても実行できる |
| テスト | `./gradlew test` | `contextLoads` は PostgreSQL が必要。`docker compose ps` で DB が動いていなければ、テストは「DB 未起動のため未実行」と報告する（DB を勝手に起動しない） |

Java 用の静的解析ツール（Checkstyle / Spotless / SpotBugs など）が `build.gradle` に入っているか確認し、入っていれば実行する。入っていなければ「未導入」として報告に含める。

**インフラ・デプロイ**（`terraform/`、`scripts/`）

| チェック | コマンド | 備考 |
|---|---|---|
| Terraform の書式 | `terraform -chdir=terraform fmt -check -recursive` | 差分があるファイル名が出る。Windows には `diff` がないので `-diff` は付けない |
| Terraform の構文・参照 | `terraform -chdir=terraform validate` | 未初期化なら先に `terraform -chdir=terraform init -backend=false`（AWS には接続しない） |
| Terraform の lint | `tflint --chdir=terraform` | 未インストールなら「未導入」と報告する |
| Terraform のセキュリティ | `trivy config terraform` または `checkov -d terraform` | 未インストールなら「未導入」と報告し、手順 3 の観点（[checklist.md](references/checklist.md) の 6 章）で目視する |
| PowerShell の構文 | `[Management.Automation.Language.Parser]::ParseFile(<パス>, [ref]$null, [ref]$errs)` で `$errs` が 0 件か | `scripts/*.ps1` ごとに実行する |
| PowerShell の文字コード | 先頭 3 バイトが `EF BB BF`（UTF-8 BOM）か | Windows PowerShell 5.1 は BOM なしの UTF-8 を Shift_JIS として読み、日本語が化けたり構文エラーになったりする |
| PowerShell の lint | `Invoke-ScriptAnalyzer -Path scripts -Recurse` | PSScriptAnalyzer が未インストールなら「未導入」と報告する |
| シェルスクリプトの lint | `shellcheck`（`user_data.sh.tftpl` は Terraform のテンプレートなので、`$${` → `${` に置き換えてから渡す） | 未インストールなら「未導入」と報告し、目視する |
| 改行コード | `git ls-files --eol terraform scripts` | EC2 で実行する `*.tftpl` / `*.sh` が `i/lf` であること（CRLF だと bash が失敗する） |
| 秘密情報の混入 | `git ls-files` に `*.tfstate`・`*.tfvars`（`.example` 以外）・`.env` が含まれていないか。差分に IP アドレス・AWS アカウント ID・アクセスキー（`AKIA`）・秘密鍵が含まれていないか | 例示用の `203.0.113.0/24`、VPC 内の `10.x.x.x`、`0.0.0.0/0` は問題ない |

**`terraform plan` / `apply` は実行しない。** plan は AWS に接続し、apply は課金が発生する。必要なら報告の中で「plan での確認を推奨」と書くにとどめる。

**リポジトリ全体**

- CI（`.github/workflows/`）があるか、`.editorconfig` があるか
- VS Code の診断（`mcp__claude-vscode__getDiagnostics`）が使えれば補助的に見る。ただし開いていないファイルは解析されないことがあるので、空でも「問題なし」とは言い切らない

### 2. ドキュメントと実装の整合性

`docs/` は要件・設計の正となる文書で、[要件定義書.md](../../../docs/要件定義書.md) が中央ドキュメント。次の対応を確認する：

| ドキュメント | 実装側で照らし合わせる場所 |
|---|---|
| `docs/機能要件.md` の F-xx と「状態」列（実装済み／未実装／将来拡張） | 実際にその機能が動くコードがあるか。実装済みなのに「未実装」のまま、またはその逆になっていないか |
| `docs/画面設計書.md` の画面遷移図・ワイヤーフレーム・要素表 | `frontend/src/` のコンポーネント。ボタン・操作・無効になる条件・文言 |
| `docs/データ設計書.md` のテーブル定義・固定 UUID | `backend/src/main/resources/db/migration/` の SQL、`frontend/src/lists.ts` |
| `docs/非機能要件.md`（性能・誤操作防止・保守性など） | 部分更新になっているか、確認ダイアログがあるか、構成が読みやすいか |
| `README.md` の API 一覧・起動手順・機能一覧 | Controller の `@*Mapping`、実際の起動方法 |
| `docs/要件定義書.md` の技術スタック・改訂履歴 | `build.gradle`、`package.json`、`gradle-wrapper.properties` |
| `docs/インフラ設計書.md` の構成図・リソース一覧・セキュリティ・手順 | `terraform/*.tf`、`user_data.sh.tftpl`、`scripts/deploy.ps1`。図にあるリソースや通信が実在するか、逆に tf にあるのに文書にないものはないか。手順のコマンドがそのまま動くか |
| `docs/非機能要件.md` のアクセス制限・秘密情報・バックアップ | セキュリティグループのルール、RDS の `publicly_accessible` / `backup_retention_period`、SSM パラメータの型 |
| `README.md` のデプロイ手順・ディレクトリ構成 | `terraform/`・`scripts/` の実際のファイル、`terraform.tfvars.example` |

食い違いを見つけたら、「どちらが正しいか」も判断して書く（多くは実装が進んでドキュメントが古いだけ。逆に、ドキュメントの仕様どおりに実装されていない場合はバグとして扱う）。

### 3. コードレビュー（バグ・ベストプラクティス）

全ソースを読む（規模が小さいので、ファイルを絞り込まずに通して読むほうが取りこぼしが少ない）。特に次の観点で見る。観点ごとの具体的な確認項目は [references/checklist.md](references/checklist.md) にある。必要に応じて読むこと。

- **状態が組み合わさったときの不具合**：検索中 × D&D、モーダルの上にダイアログ、処理中 × 再操作、エラー × 再取得など。単独の機能では正しくても、組み合わせると壊れることが多い
- **フロントとバックの前提のずれ**：画面で計算した値（index など）を、サーバが別の前提で解釈していないか。リクエストとレスポンスの型が合っているか
- **データの整合性**：トランザクション境界、並び順（`ORDER BY` の根拠になっている列が本当に順序を表すか）、途中で失敗したときに中途半端な状態が残らないか
- **エラー処理**：エラーがユーザーに見えるか、すぐ消えないか、レスポンスの形式がそろっているか
- **デファクトスタンダードからのずれ**：Spring Boot / React / TypeScript / PostgreSQL で一般的なやり方と比べてどうか。ずれていても学習目的の方針（例：JPA ではなく JdbcTemplate を使う、と要件定義書に明記）なら指摘しない
- **テスト・CI・静的解析の有無**
- **インフラとデプロイ**：通信の許可が最小限か、秘密情報がどこに残るか、作り直し・再実行しても同じ結果になるか（冪等性）、Windows（PowerShell 5.1・OpenSSH）と Linux（EC2）の違いで壊れないか。学習用途として要件定義書・非機能要件で許容している制約（HTTP のみ、シングル AZ、バックアップなし、削除保護なし）は指摘しない

## 報告の形式

次の構成で報告する。指摘には必ず `ファイル:行` へのリンク（`[App.tsx:833](frontend/src/App.tsx#L833)` の形）を付ける。

```markdown
## 実行したチェックの結果
| チェック | 結果 |
|---|---|
（コマンドごとに 1 行。0 件なら「0 件」と書く。実行できなかったものは理由を書く）

## A. バグ（優先度：高）
1. **（何が起きるかを一言で）** — [ファイル:行](リンク)
   （どういう操作で起きるか → なぜ起きるか → 対策の方向性）

## B. ドキュメントと実装のずれ
- （どのドキュメントのどこが、実装とどう違うか。どちらに合わせるべきか）

## C. ベストプラクティスとのずれ（優先度：中〜低）
（バックエンド／フロントエンド／インフラ・デプロイ／リポジトリ全体に分けて、なぜそれが一般的なのかを 1 文で添える）

## 修正の進め方（提案）
（1 Issue ＝ 1 PR の単位で、おすすめの順番に並べる。ブランチの種別（fix/ docs/ chore/ refactor/）も添える）
```

報告の最後に、**最初に何から手をつけるとよいか**を理由つきで1つだけ勧める。
