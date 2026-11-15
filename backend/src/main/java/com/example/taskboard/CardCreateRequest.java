package com.example.taskboard;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * カード登録（POST）のリクエストボディ。
 *
 * <p>{@code id} と {@code position} はサーバ側で採番するため、クライアントは指定しない。
 * そのため読み取り用の {@link Card} とは分けて、登録専用の不変 {@code record} とする。</p>
 *
 * @param listId      所属リストID（必須）
 * @param title       タイトル（必須・255文字以内）
 * @param description 説明（任意、null 可）
 * @param dueDate     期限（任意、null 可）
 * @param priority    優先度（高/中/低 のいずれか、任意、null 可）
 */
public record CardCreateRequest(
        @NotNull(message = "listId は必須です")
        UUID listId,

        @NotBlank(message = "title は必須です")
        @Size(max = 255, message = "title は255文字以内で入力してください")
        String title,

        String description,

        LocalDate dueDate,

        // null は許容し、値がある場合のみ全角の 高/中/低 に限定する（DB の CHECK 制約と対応）。
        @Pattern(regexp = "高|中|低", message = "priority は 高・中・低 のいずれかで指定してください")
        String priority
) {
}
