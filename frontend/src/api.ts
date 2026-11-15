import type { Card, ChecklistItem, NewCard } from './types'

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

// リスト内カードの並び順をまとめて更新する（PUT /api/lists/{listId}/card-order）。
// cardIds はそのリストのカードIDを希望順に並べた配列。並べ替え後のカードが返る。
export async function reorderCards(
  listId: string,
  cardIds: string[],
): Promise<Card[]> {
  const res = await fetch(`/api/lists/${listId}/card-order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardIds }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) detail = `: ${body.message}`
    } catch {
      // JSON でなければ無視
    }
    throw new Error(`カードの並べ替えに失敗しました (HTTP ${res.status})${detail}`)
  }
  return (await res.json()) as Card[]
}

// エラーレスポンス（{"message": "..."}）からメッセージを取り出す補助。
async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string }
    return body?.message ? `: ${body.message}` : ''
  } catch {
    return ''
  }
}

// チェック項目を追加する（POST /api/cards/{cardId}/checklist-items）。
export async function addChecklistItem(
  cardId: string,
  content: string,
): Promise<ChecklistItem> {
  const res = await fetch(`/api/cards/${cardId}/checklist-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    throw new Error(
      `チェック項目の追加に失敗しました (HTTP ${res.status})${await errorDetail(res)}`,
    )
  }
  return (await res.json()) as ChecklistItem
}

// チェック項目を更新する（PATCH /api/checklist-items/{id}）。内容変更・完了トグル。
export async function updateChecklistItem(
  id: string,
  patch: { content?: string; done?: boolean },
): Promise<ChecklistItem> {
  const res = await fetch(`/api/checklist-items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(
      `チェック項目の更新に失敗しました (HTTP ${res.status})${await errorDetail(res)}`,
    )
  }
  return (await res.json()) as ChecklistItem
}

// チェック項目を削除する（DELETE /api/checklist-items/{id}）。
export async function deleteChecklistItem(id: string): Promise<void> {
  const res = await fetch(`/api/checklist-items/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(
      `チェック項目の削除に失敗しました (HTTP ${res.status})${await errorDetail(res)}`,
    )
  }
}
