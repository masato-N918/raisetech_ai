package com.example.taskboard;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * カード（タスク）の読み取り・検索 API。
 *
 * <p>HTTP の入出力のみを担当し、取得ロジックは {@link CardService} に委譲する。</p>
 */
@RestController
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    /**
     * カードを取得する。
     *
     * <ul>
     *   <li>{@code GET /api/cards} … 全カードを取得</li>
     *   <li>{@code GET /api/cards?keyword=xxx} … タイトル・説明をキーワードで部分一致検索</li>
     * </ul>
     *
     * @param keyword 検索語（任意）
     */
    @GetMapping("/api/cards")
    public List<Card> getCards(@RequestParam(required = false) String keyword) {
        return cardService.find(keyword);
    }

    /**
     * カードを新規登録する。
     *
     * <p>{@code POST /api/cards} … リクエストボディ（JSON）のカードを登録し、
     * 登録後のカード（採番された id・position を含む）を {@code 201 Created} で返す。</p>
     *
     * @param request 登録するカードの内容（入力検証は {@code @Valid} で実施）
     */
    @PostMapping("/api/cards")
    public ResponseEntity<Card> createCard(@Valid @RequestBody CardCreateRequest request) {
        Card created = cardService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * カードを更新する。
     *
     * <p>{@code PUT /api/cards/{id}} … パスのカードを、リクエストボディ（JSON）の内容で
     * 更新し、更新後のカードを {@code 200 OK} で返す。対象カードや移動先リストが無ければ
     * {@code 404}、入力不正は {@code 400}（{@link GlobalExceptionHandler} に準拠）。</p>
     *
     * @param id      更新対象のカードID（パス変数）
     * @param request 更新するカードの内容（入力検証は {@code @Valid} で実施）
     */
    @PutMapping("/api/cards/{id}")
    public Card updateCard(@PathVariable UUID id,
            @Valid @RequestBody CardUpdateRequest request) {
        return cardService.update(id, request);
    }

    /**
     * カードを移動・並び替えする。
     *
     * <p>{@code PUT /api/cards/{id}/position} … パスのカードを、ボディで指定した
     * リスト（{@code listId}）の指定位置（{@code position}）へ移動し、リスト内の
     * 並び順を詰め直す。更新後のカードを {@code 200 OK} で返す。対象カードや移動先
     * リストが無ければ {@code 404}、入力不正は {@code 400}。</p>
     *
     * @param id      移動対象のカードID（パス変数）
     * @param request 移動先リストと位置
     */
    @PutMapping("/api/cards/{id}/position")
    public Card moveCard(@PathVariable UUID id,
            @Valid @RequestBody CardMoveRequest request) {
        return cardService.move(id, request.listId(), request.position());
    }

    /**
     * リスト内カードの並び順をまとめて更新する。
     *
     * <p>{@code PUT /api/lists/{listId}/card-order} … ボディの {@code cardIds} の順序で
     * リスト内の position を振り直し、並べ替え後のカードを {@code 200 OK} で返す。
     * リストが無ければ {@code 404}、{@code cardIds} がリストの現在の構成と一致しなければ
     * {@code 400}。期限順・優先度順ソートの結果を永続化する用途で使う。</p>
     *
     * @param listId  並べ替え対象のリストID（パス変数）
     * @param request 希望する並び順のカードID配列
     */
    @PutMapping("/api/lists/{listId}/card-order")
    public List<Card> reorderCards(@PathVariable UUID listId,
            @Valid @RequestBody CardOrderRequest request) {
        return cardService.reorder(listId, request.cardIds());
    }
}
