package com.example.taskboard;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * アプリが起動しているかを確かめるための最小エンドポイント。
 * GET /api/hello で JSON を返すだけで、DB にはアクセスしない。
 *
 * <p>デプロイスクリプト（scripts/deploy.ps1）が、デプロイ後の起動確認（ヘルスチェック）に使っている。
 * 削除や URL の変更をするときは、スクリプトも合わせて直すこと。
 * （アプリは起動時に Flyway で DB に接続するため、ここが応答すれば DB への接続にも成功している）
 */
@RestController
public class HelloController {

	@GetMapping("/api/hello")
	public Map<String, String> hello() {
		return Map.of("message", "taskboard backend is running");
	}
}
