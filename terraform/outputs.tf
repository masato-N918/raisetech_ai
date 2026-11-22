# apply 後に表示される値（terraform output でも確認できる）
#
# ※ パブリック IP は停止 → 起動のたびに変わる。起動し直したら
#    terraform apply -refresh-only で最新の値を取り込んでから terraform output で確認する。

output "instance_id" {
  description = "EC2 のインスタンス ID（Session Manager や aws cli で使う）"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "EC2 のパブリック IP（停止 → 起動で変わる）"
  value       = aws_instance.app.public_ip
}

output "app_url" {
  description = "ブラウザで開く URL"
  value       = "http://${aws_instance.app.public_ip}/"
}

output "ssh_command" {
  description = "SSH で接続するコマンド"
  value       = "ssh ec2-user@${aws_instance.app.public_ip}"
}

output "db_endpoint" {
  description = "RDS の接続先（VPC の中、つまり EC2 からしか接続できない）"
  value       = aws_db_instance.main.address
}

output "db_parameter_path" {
  description = "DB の接続情報を置いた SSM パラメータストアのパス"
  value       = "/${var.project_name}/db/"
}
