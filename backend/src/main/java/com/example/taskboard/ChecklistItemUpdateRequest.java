package com.example.taskboard;

import jakarta.validation.constraints.Size;

/**
 * チェック項目の更新（PATCH /api/checklist-items/{id}）のリクエストボディ。
 *
 * <p>内容変更・完了トグルの両方に対応する部分更新。{@code content} と {@code done} は
 * どちらも任意で、指定された項目だけを更新する（null は「変更しない」を意味する）。</p>
 *
 * @param content 内容（任意・255文字以内。指定時は空不可）
 * @param done    完了状態（任意）
 */
public record ChecklistItemUpdateRequest(
        @Size(max = 255, message = "content は255文字以内で入力してください")
        String content,

        Boolean done
) {
}
