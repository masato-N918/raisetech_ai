// バックエンドの Card レコード (com.example.taskboard.Card) に対応する型。
// GET /api/cards のレスポンス要素。

export type Priority = '高' | '中' | '低'

export interface Card {
  id: string // UUID
  listId: string // UUID（所属リスト）
  title: string
  description: string | null
  dueDate: string | null // "yyyy-MM-dd"
  priority: Priority | null
  position: number // リスト内の表示順
}
