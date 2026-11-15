package com.example.taskboard;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * カードの移動・並び替え（PUT /api/cards/{id}/position）のリクエストボディ。
 *
 * @param listId   移動先リストID（必須）
 * @param position 移動先リスト内での並び順（0 始まりの index、必須・0 以上）
 */
public record CardMoveRequest(
        @NotNull(message = "listId は必須です")
        UUID listId,

        @NotNull(message = "position は必須です")
        @PositiveOrZero(message = "position は0以上で指定してください")
        Integer position
) {
}
