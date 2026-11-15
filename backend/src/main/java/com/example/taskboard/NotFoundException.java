package com.example.taskboard;

/**
 * 指定されたリソースが存在しない場合に投げる例外。
 *
 * <p>{@link GlobalExceptionHandler} で HTTP 404 に変換する。</p>
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
