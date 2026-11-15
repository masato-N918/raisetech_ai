package com.example.taskboard;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * リスト内カードの一括並べ替え（PUT /api/lists/{listId}/card-order）のリクエストボディ。
 *
 * @param cardIds そのリストのカードIDを希望する並び順に並べた配列（必須）
 */
public record CardOrderRequest(
        @NotNull(message = "cardIds は必須です")
        List<UUID> cardIds
) {
}
