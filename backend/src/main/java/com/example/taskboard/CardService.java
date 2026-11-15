package com.example.taskboard;

import java.util.List;
import java.util.UUID;

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

    /**
     * カードを新規登録する。
     *
     * <p>登録先リストの存在を確認し、position はリスト内の末尾（MAX+1）に自動採番する。
     * title の前後空白は取り除く。</p>
     *
     * @param request 登録内容（入力検証は Controller の {@code @Valid} で済んでいる前提）
     * @return 登録後のカード（DB採番の id・position を含む）
     * @throws NotFoundException 登録先リストが存在しない場合
     */
    public Card create(CardCreateRequest request) {
        if (!cardRepository.listExists(request.listId())) {
            throw new NotFoundException("指定されたリストが存在しません: " + request.listId());
        }

        int position = cardRepository.nextPosition(request.listId());

        return cardRepository.insert(
                request.listId(),
                request.title().trim(),
                request.description(),
                request.dueDate(),
                request.priority(),
                position);
    }

    /**
     * 既存カードを更新する。
     *
     * <p>対象カードと移動先リストの存在を確認する。リスト（状態）を別リストへ
     * 変更した場合は position を移動先リストの末尾へ採番し、同一リストなら現在の
     * position を維持する。title の前後空白は取り除く。</p>
     *
     * @param id      更新対象のカードID
     * @param request 更新内容（入力検証は Controller の {@code @Valid} で済んでいる前提）
     * @return 更新後のカード
     * @throws NotFoundException 対象カード、または移動先リストが存在しない場合
     */
    public Card update(UUID id, CardUpdateRequest request) {
        Card existing = cardRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("指定されたカードが存在しません: " + id));

        if (!cardRepository.listExists(request.listId())) {
            throw new NotFoundException("指定されたリストが存在しません: " + request.listId());
        }

        int position = existing.listId().equals(request.listId())
                ? existing.position()
                : cardRepository.nextPosition(request.listId());

        return cardRepository.update(
                id,
                request.listId(),
                request.title().trim(),
                request.description(),
                request.dueDate(),
                request.priority(),
                position);
    }
}
