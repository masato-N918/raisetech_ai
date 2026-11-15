package com.example.taskboard;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
