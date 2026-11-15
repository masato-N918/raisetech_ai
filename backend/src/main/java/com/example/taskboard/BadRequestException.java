package com.example.taskboard;

/**
 * リクエスト内容が不正な場合に投げる例外。
 *
 * <p>{@link GlobalExceptionHandler} で HTTP 400 に変換する。</p>
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
