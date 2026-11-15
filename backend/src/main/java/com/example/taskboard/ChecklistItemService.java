package com.example.taskboard;

import java.util.UUID;

import org.springframework.stereotype.Service;

/**
 * チェック項目に関する業務ロジックを担当するサービス層。
 */
@Service
public class ChecklistItemService {

    private final ChecklistItemRepository checklistItemRepository;
    private final CardRepository cardRepository;

    public ChecklistItemService(ChecklistItemRepository checklistItemRepository,
            CardRepository cardRepository) {
        this.checklistItemRepository = checklistItemRepository;
        this.cardRepository = cardRepository;
    }

    /**
     * カードにチェック項目を追加する。
     *
     * @throws NotFoundException 対象カードが存在しない場合
     */
    public ChecklistItem add(UUID cardId, String content) {
        if (cardRepository.findById(cardId).isEmpty()) {
            throw new NotFoundException("指定されたカードが存在しません: " + cardId);
        }
        return checklistItemRepository.insert(cardId, content.trim());
    }

    /**
     * チェック項目を部分更新する（内容変更・完了トグル）。null の項目は変更しない。
     *
     * @throws NotFoundException   対象項目が存在しない場合
     * @throws BadRequestException content が空文字のみの場合
     */
    public ChecklistItem update(UUID id, String content, Boolean done) {
        ChecklistItem current = checklistItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("指定されたチェック項目が存在しません: " + id));

        String newContent = current.content();
        if (content != null) {
            String trimmed = content.trim();
            if (trimmed.isEmpty()) {
                throw new BadRequestException("content は空にできません");
            }
            newContent = trimmed;
        }

        boolean newDone = done != null ? done : current.done();

        return checklistItemRepository.update(id, newContent, newDone);
    }

    /**
     * チェック項目を削除する。
     *
     * @throws NotFoundException 対象項目が存在しない場合
     */
    public void delete(UUID id) {
        int rows = checklistItemRepository.deleteById(id);
        if (rows == 0) {
            throw new NotFoundException("指定されたチェック項目が存在しません: " + id);
        }
    }
}
