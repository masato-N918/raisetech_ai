package com.example.taskboard;

import java.util.List;

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
}
