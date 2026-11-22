# ネットワーク: VPC、パブリックサブネット 1 つ（EC2 用）、プライベートサブネット 2 つ（RDS 用）

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  # RDS のエンドポイント名を名前解決するために有効にしておく
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-vpc" }
}

# インターネットへの出入口
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-igw" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr
  availability_zone = data.aws_availability_zones.available.names[0]

  # パブリック IP の割り当ては EC2 側（associate_public_ip_address）で指定する
  map_public_ip_on_launch = false

  tags = { Name = "${var.project_name}-public-a" }
}

# パブリックサブネット用のルートテーブル（外向きの通信をインターネットゲートウェイへ）
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

# --- プライベートサブネット（RDS 用）-----------------------------------------
# RDS のサブネットグループは 2 つ以上の AZ のサブネットが必要なので、AZ を分けて 2 つ作る。
# （シングル AZ 構成なので、実際に DB が動くのは片方だけ）

resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${var.project_name}-private-${count.index + 1}" }
}

# プライベートサブネット用のルートテーブル。
# インターネットへの経路を持たない（VPC 内の通信だけ）ので、外から直接は届かない。
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
