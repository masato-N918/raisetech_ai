# セキュリティグループ（EC2 用・RDS 用）
# ルールは推奨の書き方（aws_vpc_security_group_*_rule）で 1 ルール 1 リソースにしている。
# SSH を閉じたくなったら ec2_ssh を消して apply するだけでよい。

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Web and SSH access to the app server"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-ec2-sg" }
}

# HTTP（画面と API）: 自分の IP だけ許可
resource "aws_vpc_security_group_ingress_rule" "ec2_http" {
  security_group_id = aws_security_group.ec2.id
  description       = "HTTP from my IP"
  cidr_ipv4         = var.my_ip_cidr
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

# SSH: 自分の IP だけ許可
resource "aws_vpc_security_group_ingress_rule" "ec2_ssh" {
  security_group_id = aws_security_group.ec2.id
  description       = "SSH from my IP"
  cidr_ipv4         = var.my_ip_cidr
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

# 外向き: すべて許可（dnf でのインストール、git clone、Maven / npm からの取得、RDS への接続に必要）
resource "aws_vpc_security_group_egress_rule" "ec2_all" {
  security_group_id = aws_security_group.ec2.id
  description       = "All outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# --- RDS 用 -------------------------------------------------------------------

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "PostgreSQL access from the app server only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-rds-sg" }
}

# PostgreSQL: EC2 のセキュリティグループが付いたサーバーからだけ許可（IP アドレスではなく SG で指定）
resource "aws_vpc_security_group_ingress_rule" "rds_postgres_from_ec2" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from app server"
  referenced_security_group_id = aws_security_group.ec2.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

# RDS からの外向きルールは作らない（DB から外へ通信を始める必要がないため。応答は自動で返る）
