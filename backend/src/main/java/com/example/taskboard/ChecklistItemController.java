package com.example.taskboard;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * チェック項目（チェックリスト）の API。
 *
 * <p>一覧はカード取得（{@code GET /api/cards}）のレスポンスに同梱するため、ここでは
 * 追加・更新・削除のみを提供する。</p>
 */
@RestController
public class ChecklistItemController {

    private final ChecklistItemService checklistItemService;

    public ChecklistItemController(ChecklistItemService checklistItemService) {
        this.checklistItemService = checklistItemService;
    }

    /**
     * カードにチェック項目を追加する（{@code 201 Created}）。
     */
    @PostMapping("/api/cards/{cardId}/checklist-items")
    public ResponseEntity<ChecklistItem> addItem(@PathVariable UUID cardId,
            @Valid @RequestBody ChecklistItemCreateRequest request) {
        ChecklistItem created = checklistItemService.add(cardId, request.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * チェック項目を部分更新する（内容変更・完了トグル、{@code 200 OK}）。
     */
    @PatchMapping("/api/checklist-items/{id}")
    public ChecklistItem updateItem(@PathVariable UUID id,
            @Valid @RequestBody ChecklistItemUpdateRequest request) {
        return checklistItemService.update(id, request.content(), request.done());
    }

    /**
     * チェック項目を削除する（{@code 204 No Content}）。
     */
    @DeleteMapping("/api/checklist-items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        checklistItemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
