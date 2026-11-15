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

// カードを更新する（PUT /api/cards/{id}）。
// 成功すると更新後のカードが返る。
export async function updateCard(id: string, input: NewCard): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: 'PUT',
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
    throw new Error(`カードの更新に失敗しました (HTTP ${res.status})${detail}`)
  }
  return (await res.json()) as Card
}

// カードを指定リストの指定位置へ移動・並び替えする（PUT /api/cards/{id}/position）。
// position は移動先リスト内の 0 始まりの並び順 index。
export async function moveCard(
  id: string,
  listId: string,
  position: number,
): Promise<Card> {
  const res = await fetch(`/api/cards/${id}/position`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId, position }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) detail = `: ${body.message}`
    } catch {
      // JSON でなければ無視
    }
    throw new Error(`カードの移動に失敗しました (HTTP ${res.status})${detail}`)
  }
  return (await res.json()) as Card
}
