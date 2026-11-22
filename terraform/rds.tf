# RDS for PostgreSQL と、アプリが接続に使う情報（SSM パラメータストア）
#
# 接続情報は SSM パラメータストアの /<project_name>/db/ 以下に置き、
# EC2 上のアプリは起動時にそこから読み取る（パスワードを Git やサーバーのファイルに直書きしない）。
#
# ※ 生成したパスワードは terraform.tfstate にも平文で記録される。
#    state はローカルにだけ置き、.gitignore で Git から除外している。

# --- パスワード ---------------------------------------------------------------

# 英数字だけにしている（記号を入れると、Spring の設定で "$" などが特別な意味に解釈されることがあるため）。
# 32 文字あるので、英数字だけでも十分な強さがある。
resource "random_password" "db" {
  length  = 32
  special = false
}

# --- サブネットグループ -------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

# --- RDS インスタンス ---------------------------------------------------------

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # シングル AZ。EC2 と同じ AZ に置いて、AZ をまたぐ通信をなくす
  multi_az          = false
  availability_zone = aws_subnet.public_a.availability_zone

  # 自動バックアップはしない（非機能要件で「バックアップは必須としない」。作成も速くなる）
  backup_retention_period = 0

  # 学習用: terraform destroy ですぐ消せるようにする
  # （本番では deletion_protection = true、skip_final_snapshot = false にする）
  deletion_protection = false
  skip_final_snapshot = true

  # 設定変更を次のメンテナンス時間まで待たずにすぐ反映する
  apply_immediately = true

  # マイナーバージョンの自動更新は有効（AWS が自動で上げるので、
  # engine_version はメジャーだけ指定して、Terraform との差分が出ないようにしている）
  auto_minor_version_upgrade = true

  tags = { Name = "${var.project_name}-db" }
}

# --- 接続情報（SSM パラメータストア）-----------------------------------------
# パラメータ名はアプリの環境変数名（application.properties が読む名前）に合わせている。

locals {
  # 秘密ではない値（String）
  db_parameters = {
    DB_HOST       = aws_db_instance.main.address
    DB_PORT       = tostring(aws_db_instance.main.port)
    POSTGRES_DB   = var.db_name
    POSTGRES_USER = var.db_username
  }
}

resource "aws_ssm_parameter" "db" {
  for_each = local.db_parameters

  name  = "/${var.project_name}/db/${each.key}"
  type  = "String"
  value = each.value
}

# パスワードだけは暗号化して保存する
resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/db/POSTGRES_PASSWORD"
  type  = "SecureString" # AWS 管理の KMS キー（aws/ssm）で暗号化される。追加料金なし
  value = random_password.db.result
}
