package com.example.taskboard;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
