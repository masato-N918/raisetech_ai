package com.example.taskboard;

import java.time.LocalDate;
import java.util.List;
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
}
