package com.example.taskboard;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * カードの DB アクセスを担当するリポジトリ。
 *
 * <p>SQL の実行のみを責務とし、業務ロジック（検索有無の判定など）は {@link CardService} 側に置く。
 * 既存方針に合わせ JPA ではなく {@link JdbcTemplate} を使用する。</p>
 */
@Repository
public class CardRepository {

    /** 1行を {@link Card} に変換するマッパー。 */
    private static final RowMapper<Card> CARD_ROW_MAPPER = (rs, rowNum) -> new Card(
            rs.getObject("id", java.util.UUID.class),
            rs.getObject("list_id", java.util.UUID.class),
            rs.getString("title"),
            rs.getString("description"),
            rs.getObject("due_date", java.time.LocalDate.class),
            rs.getString("priority"),
            rs.getInt("position")
    );

    private final JdbcTemplate jdbcTemplate;

    public CardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 全カードを表示順で取得する。
     */
    public List<Card> findAll() {
        return jdbcTemplate.query(
                "SELECT id, list_id, title, description, due_date, priority, position"
                        + " FROM card ORDER BY position",
                CARD_ROW_MAPPER);
    }

    /**
     * キーワードでカードを検索する（タイトル・説明の部分一致、大文字小文字を無視）。
     *
     * @param keyword 検索語（空でないことは呼び出し側で保証する）
     */
    public List<Card> search(String keyword) {
        String pattern = "%" + keyword.toLowerCase() + "%";
        return jdbcTemplate.query(
                "SELECT id, list_id, title, description, due_date, priority, position"
                        + " FROM card"
                        + " WHERE LOWER(title) LIKE ?"
                        + " OR LOWER(COALESCE(description, '')) LIKE ?"
                        + " ORDER BY position",
                CARD_ROW_MAPPER, pattern, pattern);
    }

    /**
     * id でカードを1件取得する（存在しなければ空）。
     *
     * <p>更新時に対象カードの存在確認・現在の所属リスト/position の参照に使う。</p>
     */
    public Optional<Card> findById(UUID id) {
        List<Card> rows = jdbcTemplate.query(
                "SELECT id, list_id, title, description, due_date, priority, position"
                        + " FROM card WHERE id = ?",
                CARD_ROW_MAPPER, id);
        return rows.stream().findFirst();
    }

    /**
     * 指定したリストが存在するかを返す。
     *
     * <p>存在しないリストへのカード登録を事前に弾くために使う。</p>
     */
    public boolean listExists(UUID listId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM list WHERE id = ?)",
                Boolean.class, listId);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * 指定したリストに新しく追加するカードの position を採番する。
     *
     * <p>リスト内の最大 position + 1 を返す（カードが無ければ 0）。</p>
     */
    public int nextPosition(UUID listId) {
        Integer next = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM card WHERE list_id = ?",
                Integer.class, listId);
        return next != null ? next : 0;
    }

    /**
     * カードを1件登録し、登録後の {@link Card}（DB採番の id を含む）を返す。
     *
     * <p>id は DB の {@code DEFAULT gen_random_uuid()} に任せ、{@code RETURNING} で採番結果を取得する。</p>
     */
    public Card insert(UUID listId, String title, String description,
            LocalDate dueDate, String priority, int position) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO card (list_id, title, description, due_date, priority, position)"
                        + " VALUES (?, ?, ?, ?, ?, ?)"
                        + " RETURNING id, list_id, title, description, due_date, priority, position",
                CARD_ROW_MAPPER,
                listId, title, description, dueDate, priority, position);
    }

    /**
     * 指定リストのカードを position 昇順で取得する。
     */
    public List<Card> findByList(UUID listId) {
        return jdbcTemplate.query(
                "SELECT id, list_id, title, description, due_date, priority, position"
                        + " FROM card WHERE list_id = ? ORDER BY position",
                CARD_ROW_MAPPER, listId);
    }

    /**
     * 指定リストのカードIDを position 昇順で取得する。
     *
     * <p>並び替え・移動時に、リスト内の順序を組み替えるために使う。</p>
     */
    public List<UUID> findIdsByList(UUID listId) {
        return jdbcTemplate.query(
                "SELECT id FROM card WHERE list_id = ? ORDER BY position",
                (rs, rowNum) -> rs.getObject("id", java.util.UUID.class),
                listId);
    }

    /**
     * カードの所属リストと position を更新する（内容は変更しない）。
     *
     * <p>並び替え・移動時に、リスト内の各カードへ 0..n の position を振り直すために使う。</p>
     */
    public void setListAndPosition(UUID id, UUID listId, int position) {
        jdbcTemplate.update(
                "UPDATE card SET list_id = ?, position = ? WHERE id = ?",
                listId, position, id);
    }

    /**
     * カードを1件更新し、更新後の {@link Card} を返す。
     *
     * <p>対象 id の存在は呼び出し側（{@link CardService}）で確認済みの前提。
     * {@code RETURNING} で更新後の行をそのまま取得する。</p>
     */
    public Card update(UUID id, UUID listId, String title, String description,
            LocalDate dueDate, String priority, int position) {
        return jdbcTemplate.queryForObject(
                "UPDATE card"
                        + " SET list_id = ?, title = ?, description = ?, due_date = ?,"
                        + " priority = ?, position = ?"
                        + " WHERE id = ?"
                        + " RETURNING id, list_id, title, description, due_date, priority, position",
                CARD_ROW_MAPPER,
                listId, title, description, dueDate, priority, position, id);
    }
}
