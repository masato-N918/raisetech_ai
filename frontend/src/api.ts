import type { Card, NewCard } from './types'

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

// カードを新規登録する（POST /api/cards）。
// 成功すると登録後のカード（採番された id・position を含む）が返る。
export async function createCard(input: NewCard): Promise<Card> {
  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    // バックエンドは {"message": "..."} 形式でエラー内容を返すので、あれば利用する
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) detail = `: ${body.message}`
    } catch {
      // JSON でなければ無視
    }
    throw new Error(`カードの登録に失敗しました (HTTP ${res.status})${detail}`)
  }
  return (await res.json()) as Card
}
