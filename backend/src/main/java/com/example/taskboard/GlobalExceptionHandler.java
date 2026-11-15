package com.example.taskboard;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * API 全体の例外を HTTP ステータス + JSON メッセージに変換するハンドラ。
 *
 * <p>レスポンスは {@code {"message": "..."}} 形式に統一する。</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 入力検証（@Valid）違反 → 400 Bad Request。フィールドごとのメッセージをまとめて返す。 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::formatFieldError)
                .collect(Collectors.joining(" / "));
        if (message.isBlank()) {
            message = "入力内容が正しくありません";
        }
        return body(HttpStatus.BAD_REQUEST, message);
    }

    /** リソース不存在（存在しないリストへの登録など）→ 404 Not Found。 */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /** 業務的に不正なリクエスト（並べ替え対象の不一致など）→ 400 Bad Request。 */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(BadRequestException ex) {
        return body(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /** DB 制約違反（CHECK・FK など）→ 400 Bad Request。@Valid をすり抜けた不正入力の保険。 */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        return body(HttpStatus.BAD_REQUEST, "データの整合性エラーにより登録できませんでした");
    }

    private static String formatFieldError(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
