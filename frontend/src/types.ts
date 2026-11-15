// バックエンドの Card レコード (com.example.taskboard.Card) に対応する型。
// GET /api/cards のレスポンス要素。

export type Priority = '高' | '中' | '低'

// チェック項目（カードに属するチェックリストの1項目）。
export interface ChecklistItem {
  id: string // UUID
  cardId: string // UUID（所属カード）
  content: string
  done: boolean
}

export interface Card {
  id: string // UUID
  listId: string // UUID（所属リスト）
  title: string
  description: string | null
  dueDate: string | null // "yyyy-MM-dd"
  priority: Priority | null
  position: number // リスト内の表示順
  checklistItems?: ChecklistItem[] // GET /api/cards で同梱される
}

// POST /api/cards のリクエストボディ。
// id と position はサーバ側で採番するため送らない。
export interface NewCard {
  listId: string
  title: string
  description?: string | null
  dueDate?: string | null // "yyyy-MM-dd"
  priority?: Priority | null
}
