# 入力変数。値は terraform.tfvars で上書きする（terraform.tfvars.example を参照）

variable "aws_region" {
  description = "リソースを作るリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース名やタグの接頭辞"
  type        = string
  default     = "taskboard"
}

variable "my_ip_cidr" {
  description = "HTTP / SSH を許可する自分のグローバル IP（例: 203.0.113.10/32）"
  type        = string

  validation {
    condition     = can(cidrhost(var.my_ip_cidr, 0))
    error_message = "CIDR 形式（例: 203.0.113.10/32）で指定してください。"
  }
}

variable "ssh_public_key_path" {
  description = "EC2 に登録する SSH 公開鍵のパス（秘密鍵ではない）"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "instance_type" {
  description = "EC2 のインスタンスタイプ"
  type        = string
  default     = "t3.micro"
}

variable "vpc_cidr" {
  description = "VPC の IP アドレス範囲"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "EC2 を置くパブリックサブネットの IP アドレス範囲"
  type        = string
  default     = "10.0.1.0/24"
}

variable "repo_url" {
  description = "EC2 上で clone してビルドするリポジトリ（公開リポジトリなので認証不要）"
  type        = string
  default     = "https://github.com/masato-N918/raisetech_ai.git"
}
