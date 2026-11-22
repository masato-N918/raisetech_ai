# Terraform 本体と AWS プロバイダの設定

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # state はひとまずローカル（terraform/terraform.tfstate）に保存する。
  # .gitignore で除外しているので Git には入らない。
}

provider "aws" {
  region = var.aws_region

  # このプロバイダで作るすべてのリソースに付くタグ（AWS コンソールで見分けやすくする）
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
