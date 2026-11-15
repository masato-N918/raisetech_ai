package com.example.taskboard;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * チェック項目の DB アクセスを担当するリポジトリ。
 *
 * <p>既存方針に合わせ {@link JdbcTemplate} を使用する。並び順は安定させるため id 順とする。</p>
 */
@Repository
public class ChecklistItemRepository {

    private static final RowMapper<ChecklistItem> ROW_MAPPER = (rs, rowNum) -> new ChecklistItem(
            rs.getObject("id", java.util.UUID.class),
            rs.getObject("card_id", java.util.UUID.class),
            rs.getString("content"),
            rs.getBoolean("is_done")
    );

    private final JdbcTemplate jdbcTemplate;

    public ChecklistItemRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 全チェック項目を card_id・id 順で取得する（カード一覧へ同梱するためのまとめ取得）。
     */
    public List<ChecklistItem> findAll() {
        return jdbcTemplate.query(
                "SELECT id, card_id, content, is_done FROM checklist_item ORDER BY card_id, id",
                ROW_MAPPER);
    }

    /**
     * id でチェック項目を取得する（存在しなければ空）。
     */
    public Optional<ChecklistItem> findById(UUID id) {
        List<ChecklistItem> rows = jdbcTemplate.query(
                "SELECT id, card_id, content, is_done FROM checklist_item WHERE id = ?",
                ROW_MAPPER, id);
        return rows.stream().findFirst();
    }

    /**
     * チェック項目を1件追加し、追加後の項目を返す（is_done は false 初期）。
     */
    public ChecklistItem insert(UUID cardId, String content) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO checklist_item (card_id, content, is_done)"
                        + " VALUES (?, ?, FALSE)"
                        + " RETURNING id, card_id, content, is_done",
                ROW_MAPPER, cardId, content);
    }

    /**
     * チェック項目の内容・完了状態を更新し、更新後の項目を返す。
     *
     * <p>対象 id の存在は呼び出し側で確認済みの前提。</p>
     */
    public ChecklistItem update(UUID id, String content, boolean done) {
        return jdbcTemplate.queryForObject(
                "UPDATE checklist_item SET content = ?, is_done = ? WHERE id = ?"
                        + " RETURNING id, card_id, content, is_done",
                ROW_MAPPER, content, done, id);
    }

    /**
     * チェック項目を削除し、削除した行数を返す（0 なら存在しなかった）。
     */
    public int deleteById(UUID id) {
        return jdbcTemplate.update("DELETE FROM checklist_item WHERE id = ?", id);
    }
}
