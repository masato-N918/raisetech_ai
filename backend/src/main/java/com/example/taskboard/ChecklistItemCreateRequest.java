package com.example.taskboard;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * チェック項目の追加（POST /api/cards/{cardId}/checklist-items）のリクエストボディ。
 *
 * @param content 内容（必須・255文字以内）
 */
public record ChecklistItemCreateRequest(
        @NotBlank(message = "content は必須です")
        @Size(max = 255, message = "content は255文字以内で入力してください")
        String content
) {
}
