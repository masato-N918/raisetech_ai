package com.example.taskboard;

import java.time.LocalDate;
import java.util.UUID;

/**
 * カード（タスク）を表すモデル。
 *
 * <p>DB の {@code card} テーブル1行に対応する。読み取り専用のため不変な {@code record} とする。</p>
 *
 * @param id          カードID
 * @param listId      所属リストID
 * @param title       タイトル
 * @param description 説明（任意、null 可）
 * @param dueDate     期限（任意、null 可）
 * @param priority    優先度（高/中/低、任意、null 可）
 * @param position    リスト内の表示順
 */
public record Card(
        UUID id,
        UUID listId,
        String title,
        String description,
        LocalDate dueDate,
        String priority,
        int position
) {
}
