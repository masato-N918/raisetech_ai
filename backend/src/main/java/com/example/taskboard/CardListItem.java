package com.example.taskboard;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * カード一覧（GET /api/cards）のレスポンス要素。
 *
 * <p>{@link Card} の各項目に、そのカードのチェック項目一覧 {@code checklistItems} を
 * 加えたもの。カード本体の読み取り・更新系では {@link Card} をそのまま使い、一覧表示で
 * チェックリストを同梱したいこのレスポンスだけ別型にする。</p>
 */
public record CardListItem(
        UUID id,
        UUID listId,
        String title,
        String description,
        LocalDate dueDate,
        String priority,
        int position,
        List<ChecklistItem> checklistItems
) {
    /** {@link Card} とチェック項目一覧から組み立てる。 */
    public static CardListItem of(Card card, List<ChecklistItem> checklistItems) {
        return new CardListItem(
                card.id(),
                card.listId(),
                card.title(),
                card.description(),
                card.dueDate(),
                card.priority(),
                card.position(),
                checklistItems);
    }
}
