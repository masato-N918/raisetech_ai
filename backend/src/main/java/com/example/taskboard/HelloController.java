package com.example.taskboard;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 動作確認用の最小エンドポイント。
 * GET /api/hello で JSON を返すだけ（DB などは次ステップ）。
 */
@RestController
public class HelloController {

	@GetMapping("/api/hello")
	public Map<String, String> hello() {
		return Map.of("message", "taskboard backend is running");
	}
}
