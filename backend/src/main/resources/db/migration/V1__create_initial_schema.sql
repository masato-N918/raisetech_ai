-- Trello風タスク管理アプリ 初期スキーマ
-- 参照: docs/データ設計書.md
-- ID は UUID（gen_random_uuid() は PostgreSQL 13+ の標準関数）

-- ボード
CREATE TABLE board (
    id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title    VARCHAR(255) NOT NULL,
    position INTEGER      NOT NULL
);

-- リスト（ボードに属する）
CREATE TABLE list (
    id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID         NOT NULL REFERENCES board (id) ON DELETE CASCADE,
    title    VARCHAR(255) NOT NULL,
    position INTEGER      NOT NULL
);

-- カード（リストに属する）
CREATE TABLE card (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id     UUID         NOT NULL REFERENCES list (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    due_date    DATE,
    priority    VARCHAR(10)  CHECK (priority IN ('高', '中', '低')),
    position    INTEGER      NOT NULL
);

-- ラベル（ボード単位で定義）
CREATE TABLE label (
    id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID         NOT NULL REFERENCES board (id) ON DELETE CASCADE,
    name     VARCHAR(100) NOT NULL,
    color    VARCHAR(20)  NOT NULL
);

-- チェック項目（カードに属する）
CREATE TABLE checklist_item (
    id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID         NOT NULL REFERENCES card (id) ON DELETE CASCADE,
    content VARCHAR(255) NOT NULL,
    is_done BOOLEAN      NOT NULL DEFAULT FALSE
);

-- カード⇄ラベル（多対多の中間テーブル）
CREATE TABLE card_label (
    card_id  UUID NOT NULL REFERENCES card (id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES label (id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);

-- 外部キー列のインデックス（親からの絞り込みを高速化）
CREATE INDEX idx_list_board_id       ON list (board_id);
CREATE INDEX idx_card_list_id        ON card (list_id);
CREATE INDEX idx_label_board_id      ON label (board_id);
CREATE INDEX idx_checklist_card_id   ON checklist_item (card_id);
CREATE INDEX idx_card_label_label_id ON card_label (label_id);
