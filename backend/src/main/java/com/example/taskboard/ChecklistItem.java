package com.example.taskboard;

import java.util.UUID;

/**
 * チェック項目（カードに属するチェックリストの1項目）。
 *
 * <p>DB の {@code checklist_item} テーブル1行に対応する。</p>
 *
 * @param id      チェック項目ID
 * @param cardId  所属カードID
 * @param content 内容
 * @param done    完了したか
 */
public record ChecklistItem(
        UUID id,
        UUID cardId,
        String content,
        boolean done
) {
}
