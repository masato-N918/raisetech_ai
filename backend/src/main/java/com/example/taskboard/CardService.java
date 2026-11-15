package com.example.taskboard;

import java.util.List;

import org.springframework.stereotype.Service;

/**
 * カードに関する業務ロジックを担当するサービス層。
 *
 * <p>検索するか全件取得するかの判断をここに集約し、Controller は HTTP、Repository は SQL に専念させる。</p>
 */
@Service
public class CardService {

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    /**
     * カードを取得する。
     *
     * <p>キーワードが未指定（null）または空白のみなら全件、指定があればキーワード検索を行う。</p>
     *
     * @param keyword 検索語（任意）
     */
    public List<Card> find(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return cardRepository.findAll();
        }
        return cardRepository.search(keyword.trim());
    }
}
