import type { Card } from './types'

// カード一覧／検索を取得する。
// keyword を渡すと title/description の部分一致で絞り込む（バックエンド側で処理）。
export async function fetchCards(keyword?: string): Promise<Card[]> {
  const trimmed = keyword?.trim()
  const url = trimmed
    ? `/api/cards?keyword=${encodeURIComponent(trimmed)}`
    : '/api/cards'

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`カードの取得に失敗しました (HTTP ${res.status})`)
  }
  return (await res.json()) as Card[]
}
