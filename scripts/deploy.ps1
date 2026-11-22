<#
.SYNOPSIS
  アプリを AWS の EC2 にデプロイする（手元でビルド → scp で送る → 再起動 → 動作確認）。

.DESCRIPTION
  前提:
    - terraform/ で terraform apply 済みであること（接続先の IP は terraform output から取る）
    - ~/.ssh/id_rsa で EC2 に SSH できること

  流れ:
    1. 未コミットの変更がないか確認する（手元のコードがそのままデプロイされるため）
    2. バックエンド（bootJar）とフロントエンド（npm run build）をビルドする
    3. JAR と dist/ を scp で EC2 に送る
    4. EC2 上でファイルを入れ替え、Spring Boot を再起動する
    5. http://<IP>/api/hello が応答するまで待って、成功を確認する

.EXAMPLE
  .\scripts\deploy.ps1

.EXAMPLE
  .\scripts\deploy.ps1 -AllowDirty   # 未コミットの変更があってもデプロイする（試したいときだけ）
#>
param(
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sshOptions = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=10')

# 外部コマンドを実行し、失敗（終了コードが 0 以外）なら止める。
# npm や gradle は正常時でも標準エラーにお知らせを出すため、Windows PowerShell 5.1 では
# 'Stop' のままだと（出力をリダイレクトしたときに）それをエラー扱いして止まってしまう。
# そこでこの中だけ 'Continue' にして、成否は終了コードだけで判断する。
function Invoke-Step {
    param([string]$Message, [scriptblock]$Action)
    Write-Host "==> $Message" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Action } finally { $ErrorActionPreference = $previous }
    if ($LASTEXITCODE -ne 0) { throw "失敗しました: $Message（終了コード $LASTEXITCODE）" }
}

# --- 1. 事前チェック -----------------------------------------------------------
$dirty = git -C $root status --porcelain
if ($dirty -and -not $AllowDirty) {
    throw "未コミットの変更があります。コミットしてから実行してください（試すだけなら -AllowDirty を付ける）。`n$($dirty -join "`n")"
}
$branch = git -C $root rev-parse --abbrev-ref HEAD
$commit = git -C $root rev-parse --short HEAD
Write-Host "デプロイするコード: ブランチ $branch / コミット $commit" -ForegroundColor Yellow
if ($branch -ne 'main') {
    Write-Host "※ main 以外のブランチです。" -ForegroundColor Yellow
}

$ip = terraform "-chdir=$root\terraform" output -raw public_ip
if ($LASTEXITCODE -ne 0 -or -not $ip) {
    throw "EC2 の IP を取得できませんでした。terraform apply 済みか確認してください。"
}
$target = "ec2-user@$ip"
Write-Host "デプロイ先: $target" -ForegroundColor Yellow

# --- 2. ビルド -------------------------------------------------------------------
Invoke-Step 'バックエンドをビルド（bootJar）' {
    Push-Location "$root\backend"
    try { .\gradlew.bat bootJar } finally { Pop-Location }
}
# build.gradle で出力名を app.jar に固定している。
# （*.jar から選ぶと、古いバージョンや -plain.jar が残っていたときに誤って送ってしまうため）
$jar = Get-Item "$root\backend\build\libs\app.jar" -ErrorAction SilentlyContinue
if (-not $jar) { throw "JAR が見つかりません（backend\build\libs\app.jar）" }

Invoke-Step 'フロントエンドの依存関係をインストール（npm ci）' {
    Push-Location "$root\frontend"
    try { npm ci } finally { Pop-Location }
}
Invoke-Step 'フロントエンドをビルド（npm run build）' {
    Push-Location "$root\frontend"
    try { npm run build } finally { Pop-Location }
}

# --- 3. 転送 ---------------------------------------------------------------------
Invoke-Step '前回の一時ファイルを削除' {
    ssh @sshOptions $target 'rm -rf /tmp/taskboard-dist /opt/taskboard/app.jar.new'
}
Invoke-Step "JAR を送信（$($jar.Name)）" {
    scp @sshOptions $jar.FullName "${target}:/opt/taskboard/app.jar.new"
}
Invoke-Step 'フロントエンド（dist）を送信' {
    scp @sshOptions -r "$root\frontend\dist" "${target}:/tmp/taskboard-dist"
}

# --- 4. 入れ替えと再起動 -----------------------------------------------------------
# （PowerShell 5.1 から ssh に渡すと二重引用符が崩れるので、リモートのコマンドには二重引用符を使わない）
$remote = 'set -e; ' +
    'mv /opt/taskboard/app.jar.new /opt/taskboard/app.jar; ' +
    'rm -rf /usr/share/nginx/html/*; ' +
    'cp -r /tmp/taskboard-dist/. /usr/share/nginx/html/; ' +
    # Windows の scp -r で送るとディレクトリが 700（本人しか入れない）になり、nginx が読めず 403 になる。
    # ディレクトリは 755、ファイルは 644 にそろえる
    'chmod -R u=rwX,go=rX /usr/share/nginx/html; ' +
    'rm -rf /tmp/taskboard-dist; ' +
    'sudo systemctl restart taskboard'
Invoke-Step 'EC2 上でファイルを入れ替えて Spring Boot を再起動' {
    ssh @sshOptions $target $remote
}

# --- 5. 動作確認 -------------------------------------------------------------------
Write-Host '==> 起動を待っています（最大 3 分）' -ForegroundColor Cyan
$healthUrl = "http://$ip/api/hello"
$deadline = (Get-Date).AddMinutes(3)
$ok = $false
while ((Get-Date) -lt $deadline) {
    try {
        $res = Invoke-WebRequest $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($res.StatusCode -eq 200) { $ok = $true; break }
    } catch {
        # 起動中は nginx が 502 を返すので、待ち続ける
    }
    Start-Sleep -Seconds 5
}

if (-not $ok) {
    Write-Host "起動を確認できませんでした。EC2 上のログを確認してください:" -ForegroundColor Red
    Write-Host "  ssh $target sudo journalctl -u taskboard -n 100 --no-pager"
    exit 1
}

Write-Host ''
Write-Host "デプロイが完了しました（コミット $commit）" -ForegroundColor Green
Write-Host "  URL: http://$ip/"
