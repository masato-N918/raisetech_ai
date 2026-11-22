# EC2（アプリサーバー）と、それに付随するキーペア・IAM ロール

# 最新の Amazon Linux 2023 の AMI ID を、AWS 公式の SSM パラメータから取得する
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# SSH 用のキーペア（公開鍵だけを登録する。秘密鍵は手元から出さない）
resource "aws_key_pair" "deploy" {
  key_name   = "${var.project_name}-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# --- IAM ロール --------------------------------------------------------------
# - Session Manager で接続できるようにする（SSH を閉じた後の入口になる）
# - DB の接続情報を SSM パラメータストア（/<project_name>/db/*）から読めるようにする

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_caller_identity" "current" {}

# DB の接続情報だけを読める最小限の権限
# （SecureString は AWS 管理キー aws/ssm で暗号化しているので、KMS の権限を別に付けなくても復号できる）
data "aws_iam_policy_document" "ec2_read_db_parameters" {
  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/db",
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/db/*",
    ]
  }
}

resource "aws_iam_role_policy" "ec2_read_db_parameters" {
  name   = "read-db-parameters"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_read_db_parameters.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# --- EC2 インスタンス --------------------------------------------------------

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = aws_key_pair.deploy.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # パブリック IP を自動で割り当てる（Elastic IP は使わない）。
  # 停止中は課金されない代わりに、停止 → 起動のたびに IP アドレスが変わる。
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  # インスタンスメタデータは IMDSv2（トークン必須）だけにする（セキュリティのベストプラクティス）
  metadata_options {
    http_tokens = "required"
  }

  # 初回起動時に実行するセットアップスクリプト
  # （DB 接続情報を読む SSM のパスとリージョンを埋め込む）
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    project_name = var.project_name
    aws_region   = var.aws_region
  })

  # user_data を変えたらインスタンスを作り直して、スクリプトを最初から実行し直す
  # （データは RDS に置くので、EC2 は作り直しても困らない）
  user_data_replace_on_change = true

  tags = { Name = "${var.project_name}-app" }

  # user_data は起動直後に dnf でインターネットを使うので、
  # インターネットへの経路（ルートテーブルの関連付け）ができてから起動する
  depends_on = [aws_route_table_association.public_a]

  lifecycle {
    # 新しい AMI が出るたびに apply でインスタンスが作り直されるのを防ぐ
    ignore_changes = [ami]
  }
}
