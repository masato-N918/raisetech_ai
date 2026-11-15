package com.example.taskboard;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * カードに関する業務ロジックを担当するサービス層。
 *
 * <p>検索するか全件取得するかの判断をここに集約し、Controller は HTTP、Repository は SQL に専念させる。</p>
 */
@Service
public class CardService {

    private final CardRepository cardRepository;
    private final ChecklistItemRepository checklistItemRepository;

    public CardService(CardRepository cardRepository,
            ChecklistItemRepository checklistItemRepository) {
        this.cardRepository = cardRepository;
        this.checklistItemRepository = checklistItemRepository;
    }

    /**
     * カードを取得する（各カードにチェック項目を同梱する）。
     *
     * <p>キーワードが未指定（null）または空白のみなら全件、指定があればキーワード検索を行う。</p>
     *
     * @param keyword 検索語（任意）
     */
    public List<CardListItem> find(String keyword) {
        List<Card> cards = (keyword == null || keyword.isBlank())
                ? cardRepository.findAll()
                : cardRepository.search(keyword.trim());

        Map<UUID, List<ChecklistItem>> itemsByCard = checklistItemRepository.findAll().stream()
                .collect(Collectors.groupingBy(ChecklistItem::cardId));

        return cards.stream()
                .map(c -> CardListItem.of(c, itemsByCard.getOrDefault(c.id(), List.of())))
                .toList();
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

    /**
     * カードを移動・並び替えする。
     *
     * <p>移動先リストの並びに、指定の index でカードを挿入し直し、リスト内の position を
     * 0..n に詰め直す。別リストへ移動した場合は移動元リストの position も詰め直す。
     * 整合性を保つため1トランザクションで実施する。</p>
     *
     * @param id          移動するカードID
     * @param targetListId 移動先リストID
     * @param targetIndex  移動先リスト内での並び順（0 始まり。範囲外はリスト端に丸める）
     * @return 移動後のカード
     * @throws NotFoundException 対象カード、または移動先リストが存在しない場合
     */
    @Transactional
    public Card move(UUID id, UUID targetListId, int targetIndex) {
        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("指定されたカードが存在しません: " + id));

        if (!cardRepository.listExists(targetListId)) {
            throw new NotFoundException("指定されたリストが存在しません: " + targetListId);
        }

        UUID sourceListId = card.listId();

        // 移動先リストの並び（移動カードを除く）に、指定位置で挿入し直して 0..n を振り直す。
        List<UUID> target = cardRepository.findIdsByList(targetListId);
        target.remove(id);
        int idx = Math.max(0, Math.min(targetIndex, target.size()));
        target.add(idx, id);
        for (int i = 0; i < target.size(); i++) {
            cardRepository.setListAndPosition(target.get(i), targetListId, i);
        }

        // 別リストへ移動した場合は、移動元リストの position も詰め直す。
        if (!sourceListId.equals(targetListId)) {
            List<UUID> source = cardRepository.findIdsByList(sourceListId);
            for (int i = 0; i < source.size(); i++) {
                cardRepository.setListAndPosition(source.get(i), sourceListId, i);
            }
        }

        return cardRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("指定されたカードが存在しません: " + id));
    }

    /**
     * リスト内カードの並び順をまとめて更新する。
     *
     * <p>指定された {@code cardIds} の順序どおりに position を 0..n へ振り直す。
     * {@code cardIds} はそのリストの現在のカード構成と過不足なく一致している必要がある
     * （重複・別リストのID混入・数の不一致は不正）。整合性のため1トランザクションで実施する。</p>
     *
     * @param listId  並べ替え対象のリストID
     * @param cardIds 希望する並び順のカードID配列
     * @return 並べ替え後のリストのカード（position 昇順）
     * @throws NotFoundException   リストが存在しない場合
     * @throws BadRequestException cardIds がリストの現在の構成と一致しない場合
     */
    @Transactional
    public List<Card> reorder(UUID listId, List<UUID> cardIds) {
        if (!cardRepository.listExists(listId)) {
            throw new NotFoundException("指定されたリストが存在しません: " + listId);
        }

        List<UUID> current = cardRepository.findIdsByList(listId);
        // 集合として一致し、かつ重複が無い（＝サイズも一致）ことを確認する。
        if (cardIds.size() != current.size()
                || !new HashSet<>(cardIds).equals(new HashSet<>(current))) {
            throw new BadRequestException("cardIds がリストの現在のカード構成と一致しません");
        }

        for (int i = 0; i < cardIds.size(); i++) {
            cardRepository.setListAndPosition(cardIds.get(i), listId, i);
        }

        return cardRepository.findByList(listId);
    }
}
