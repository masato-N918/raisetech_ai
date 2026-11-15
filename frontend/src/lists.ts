// リスト(カラム)情報。
// 現状バックエンドにリスト取得APIが無いため、シードデータの listId(UUID) を
// 表示名にマッピングして暫定表示する。
// （将来 /api/lists を実装したら、ここをAPI取得に置き換える）

export interface ListInfo {
  id: string
  title: string
}

// ボードに左から並べるリストの順序
export const LISTS: ListInfo[] = [
  { id: '22222222-2222-2222-2222-222222222201', title: 'ToDo' },
  { id: '22222222-2222-2222-2222-222222222202', title: 'Doing' },
]

const TITLE_BY_ID = new Map(LISTS.map((l) => [l.id, l.title]))

// マップに無い listId はUUIDの先頭だけ見せて取りこぼさない
export function listTitle(listId: string): string {
  return TITLE_BY_ID.get(listId) ?? `その他 (${listId.slice(0, 8)})`
}
