import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './App.css'
import {
  addChecklistItem,
  createCard,
  deleteChecklistItem,
  fetchCards,
  moveCard,
  reorderCards,
  updateCard,
  updateChecklistItem,
} from './api'
import { LISTS, listTitle } from './lists'
import type { Card, ChecklistItem, NewCard, Priority } from './types'

const PRIORITY_CLASS: Record<Priority, string> = {
  高: 'prio-high',
  中: 'prio-mid',
  低: 'prio-low',
}

const PRIORITIES: Priority[] = ['高', '中', '低']

// 優先度の強さ（高いほど大きい。なしは 0）
const PRIORITY_RANK: Record<Priority, number> = { 高: 3, 中: 2, 低: 1 }
const rankOf = (p: Priority | null) => (p ? PRIORITY_RANK[p] : 0)

// 期限("yyyy-MM-dd")を状態込みの表示情報に変換する。
// over=期限切れ（今日より前）、soon=間近（今日〜3日以内）、ok=それ以外。
function dueInfo(
  due: string | null,
): { label: string; cls: string } | null {
  if (!due) return null
  const [y, m, d] = due.split('-').map(Number)
  if (!y || !m || !d) return { label: due, cls: 'due-ok' }
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)
  const cls = diffDays < 0 ? 'due-over' : diffDays <= 3 ? 'due-soon' : 'due-ok'
  return { label: `${m}/${d}`, cls }
}

type SortKey = 'due' | 'priority'
type SortDir = 'asc' | 'desc'

// 期限で比較（期限なしは常に末尾）
function compareByDue(a: Card, b: Card, dir: SortDir): number {
  if (!a.dueDate && !b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  return dir === 'asc'
    ? a.dueDate.localeCompare(b.dueDate)
    : b.dueDate.localeCompare(a.dueDate)
}

// 優先度で比較（優先度なしは常に末尾。desc=高い順 / asc=低い順）
function compareByPriority(a: Card, b: Card, dir: SortDir): number {
  const ra = rankOf(a.priority)
  const rb = rankOf(b.priority)
  if (ra === 0 && rb === 0) return 0
  if (ra === 0) return 1
  if (rb === 0) return -1
  return dir === 'desc' ? rb - ra : ra - rb
}

// モーダルの状態。既存カードの編集(edit)か、新規追加(create)か。
// create のときは「＋ カード追加」を押したリストの id を初期選択に使う。
type ModalState =
  | { mode: 'edit'; card: Card }
  | { mode: 'create'; listId: string }

// フォームの入力値（文字列ベース。送信時に NewCard へ整形する）。
interface FormValues {
  listId: string
  title: string
  description: string
  dueDate: string
  priority: Priority | ''
}

function CardItem({
  card,
  onOpen,
  draggingId,
  onDragStart,
  onDragEnd,
  onDropBefore,
}: {
  card: Card
  onOpen: (card: Card) => void
  draggingId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  // このカードの直前に、ドラッグ中のカードをドロップする
  onDropBefore: (beforeCardId: string) => void
}) {
  const isDragging = draggingId === card.id
  return (
    <article
      className={`card${isDragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(card.id)
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        // ドラッグ中のみドロップを許可する
        if (draggingId) e.preventDefault()
      }}
      onDrop={(e) => {
        if (!draggingId) return
        e.preventDefault()
        e.stopPropagation() // リストコンテナの「末尾へ」より優先する
        onDropBefore(card.id)
      }}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(card)
        }
      }}
    >
      <div className="card-top">
        <h3 className="card-title">{card.title}</h3>
        {card.priority && (
          <span className={`prio-badge ${PRIORITY_CLASS[card.priority]}`}>
            {card.priority}
          </span>
        )}
      </div>
      {card.description && <p className="card-desc">{card.description}</p>}
      {(() => {
        const due = dueInfo(card.dueDate)
        const items = card.checklistItems ?? []
        const doneCount = items.filter((i) => i.done).length
        if (!due && items.length === 0) return null
        return (
          <div className="card-meta">
            {due && <span className={`card-due ${due.cls}`}>📅 {due.label}</span>}
            {items.length > 0 && (
              <span className="card-check">
                ☑ {doneCount}/{items.length}
              </span>
            )}
          </div>
        )
      })()}
    </article>
  )
}

// カードの入力フォーム（新規追加・編集で共通）。
// onSubmit に整形済みの NewCard を渡す。成功で onDone（一覧再取得）→ onClose。
function CardForm({
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
  onClose,
  onDone,
  children,
}: {
  initial: FormValues
  submitLabel: string
  pendingLabel: string
  onSubmit: (input: NewCard) => Promise<unknown>
  onClose: () => void
  // 保存成功時に、API が返した保存後データを渡す（盤面の部分更新に使う）
  onDone: (result: unknown) => void
  // フォーム項目の下（フッターの上）に差し込む追加要素（編集時のチェックリストなど）
  children?: ReactNode
}) {
  const [listId, setListId] = useState(initial.listId || LISTS[0]?.id || '')
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [dueDate, setDueDate] = useState(initial.dueDate)
  const [priority, setPriority] = useState<Priority | ''>(initial.priority)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || submitting) return

    const input: NewCard = {
      listId,
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate || null,
      priority: priority || null,
    }

    setSubmitting(true)
    setError(null)
    try {
      const saved = await onSubmit(input)
      onDone(saved)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <label className="field-label" htmlFor="m-title">
          タイトル
        </label>
        <input
          id="m-title"
          type="text"
          className="field-input"
          placeholder="カードのタイトル（必須）"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="field-label" htmlFor="m-list">
          リスト（状態）
        </label>
        <select
          id="m-list"
          className="field-input"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
        >
          {LISTS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="m-prio">
          優先度
        </label>
        <select
          id="m-prio"
          className="field-input"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | '')}
        >
          <option value="">なし</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="m-desc">
          説明
        </label>
        <textarea
          id="m-desc"
          className="field-input"
          rows={3}
          placeholder="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="field-label" htmlFor="m-due">
          期限
        </label>
        <input
          id="m-due"
          type="date"
          className="field-input date-input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {error && <p className="add-error">⚠ {error}</p>}

        {children}
      </div>

      <div className="modal-foot modal-foot-end">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!title.trim() || submitting}
        >
          {submitting ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}

// カードのチェックリスト（編集モードのモーダル内に表示）。
// 追加・完了トグル・削除は即APIに反映し、ローカル状態と一覧（onChanged）を更新する。
function CardChecklist({
  card,
  onItemsChange,
}: {
  card: Card
  // 変更後のチェック項目を親へ通知し、盤面の ☑ x/y を部分更新する
  onItemsChange: (items: ChecklistItem[]) => void
}) {
  const [items, setItems] = useState<ChecklistItem[]>(card.checklistItems ?? [])
  const [newContent, setNewContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.length
  const done = items.filter((i) => i.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  // ローカル表示と盤面側カードを同時に更新する（全件再取得はしない）
  const applyItems = (next: ChecklistItem[]) => {
    setItems(next)
    onItemsChange(next)
  }

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  // 入れ子フォームを避けるため form は使わず、ボタン／Enterキーから呼ぶ。
  const submitAdd = () => {
    const content = newContent.trim()
    if (!content || busy) return
    run(async () => {
      const created = await addChecklistItem(card.id, content)
      applyItems([...items, created])
      setNewContent('')
    })
  }

  const handleToggle = (item: ChecklistItem) =>
    run(async () => {
      const updated = await updateChecklistItem(item.id, { done: !item.done })
      applyItems(items.map((i) => (i.id === updated.id ? updated : i)))
    })

  const handleDelete = (item: ChecklistItem) =>
    run(async () => {
      await deleteChecklistItem(item.id)
      applyItems(items.filter((i) => i.id !== item.id))
    })

  return (
    <div className="checklist">
      <div className="checklist-head">
        <span className="field-label">チェックリスト</span>
        {total > 0 && (
          <span className="checklist-progress-text">
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="checklist-bar">
          <div className="checklist-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      )}

      <ul className="checklist-items">
        {items.map((item) => (
          <li key={item.id} className="checklist-item">
            <label className="checklist-label">
              <input
                type="checkbox"
                checked={item.done}
                disabled={busy}
                onChange={() => handleToggle(item)}
              />
              <span className={item.done ? 'checklist-done' : ''}>
                {item.content}
              </span>
            </label>
            <button
              type="button"
              className="checklist-del"
              aria-label="削除"
              disabled={busy}
              onClick={() => handleDelete(item)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="checklist-add">
        <input
          type="text"
          className="checklist-input"
          placeholder="項目を追加..."
          value={newContent}
          disabled={busy}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            // Enter でカード編集フォームが送信されないようにして項目を追加する
            if (e.key === 'Enter') {
              e.preventDefault()
              submitAdd()
            }
          }}
        />
        <button
          type="button"
          className="btn btn-ghost checklist-add-btn"
          disabled={busy || !newContent.trim()}
          onClick={submitAdd}
        >
          ＋ 追加
        </button>
      </div>

      {error && <p className="add-error">⚠ {error}</p>}
    </div>
  )
}

// 新規作成モーダル用のチェックリスト編集（カード未作成のためローカルに溜める）。
// 入力内容は親(items/setItems)が保持し、カード作成成功後にまとめて登録される。
function PendingChecklist({
  items,
  setItems,
}: {
  items: string[]
  setItems: (updater: (prev: string[]) => string[]) => void
}) {
  const [newContent, setNewContent] = useState('')

  const addItem = () => {
    const content = newContent.trim()
    if (!content) return
    setItems((prev) => [...prev, content])
    setNewContent('')
  }

  return (
    <div className="checklist">
      <div className="checklist-head">
        <span className="field-label">チェックリスト</span>
        {items.length > 0 && (
          <span className="checklist-progress-text">{items.length}件</span>
        )}
      </div>

      <ul className="checklist-items">
        {items.map((content, idx) => (
          <li key={idx} className="checklist-item">
            <span className="checklist-label">{content}</span>
            <button
              type="button"
              className="checklist-del"
              aria-label="削除"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="checklist-add">
        <input
          type="text"
          className="checklist-input"
          placeholder="項目を追加..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
        />
        <button
          type="button"
          className="btn btn-ghost checklist-add-btn"
          disabled={!newContent.trim()}
          onClick={addItem}
        >
          ＋ 追加
        </button>
      </div>

      <p className="checklist-note">※ カードを作成すると登録されます</p>
    </div>
  )
}

// カード詳細モーダル。edit（既存カードの編集）/ create（新規追加）の2モード。
function CardModal({
  state,
  onClose,
  onSaved,
}: {
  state: ModalState
  onClose: () => void
  // 保存後のカードを受け取り、盤面の該当カードだけを部分更新する
  onSaved: (card: Card) => void
}) {
  // Escキーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isCreate = state.mode === 'create'
  const heading = isCreate ? 'カードを追加' : 'カード詳細'

  // 新規作成モーダルでローカルに溜めるチェック項目（作成成功後に登録する）
  const [pendingItems, setPendingItems] = useState<string[]>([])

  // モードに応じた初期値と送信処理。
  const initial: FormValues = isCreate
    ? { listId: state.listId, title: '', description: '', dueDate: '', priority: '' }
    : {
        listId: state.card.listId,
        title: state.card.title,
        description: state.card.description ?? '',
        dueDate: state.card.dueDate ?? '',
        priority: state.card.priority ?? '',
      }

  // 新規作成時はカード作成後、採番された id へ溜めた項目をまとめて登録する。
  // 盤面の ☑ x/y にも反映されるよう、登録済み項目を含めたカードを返す。
  const handleSubmit = async (input: NewCard) => {
    if (!isCreate) return updateCard(state.card.id, input)
    const created = await createCard(input)
    const createdItems: ChecklistItem[] = []
    for (const content of pendingItems) {
      createdItems.push(await addChecklistItem(created.id, content))
    }
    return { ...created, checklistItems: createdItems }
  }

  return (
    // オーバーレイのクリックで閉じる。モーダル本体のクリックは伝播を止める。
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 className="modal-heading">{heading}</h2>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <CardForm
          initial={initial}
          submitLabel={isCreate ? '追加' : '保存'}
          pendingLabel={isCreate ? '追加中...' : '保存中...'}
          onSubmit={handleSubmit}
          onClose={onClose}
          onDone={(saved) => onSaved(saved as Card)}
        >
          {state.mode === 'edit' ? (
            <CardChecklist
              card={state.card}
              onItemsChange={(items) =>
                onSaved({ ...state.card, checklistItems: items })
              }
            />
          ) : (
            <PendingChecklist items={pendingItems} setItems={setPendingItems} />
          )}
        </CardForm>
      </div>
    </div>
  )
}

function App() {
  const [keyword, setKeyword] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 登録・更新後にインクリメントして一覧を再取得させるためのキー
  const [reloadKey, setReloadKey] = useState(0)
  // 開いているモーダル（null なら閉じている）
  const [modal, setModal] = useState<ModalState | null>(null)
  // ドラッグ中のカードID（null ならドラッグしていない）
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // リストごとの現在のソート方向（ボタン表示の矢印に使う）
  // 例: { "<listId>": { due: 'asc', priority: 'desc' } }
  const [sortDir, setSortDir] = useState<
    Record<string, Partial<Record<SortKey, SortDir>>>
  >({})

  // 初回ロードを済ませたか（2回目以降は「読み込み中...」のチラつきを出さない）
  const loadedOnce = useRef(false)

  // keyword / reloadKey の変化に応じて再取得（入力のたびに叩かないよう軽くdebounce）
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      // 初回だけ盤面を「読み込み中...」に差し替える。以降は既存表示を保つ。
      if (!loadedOnce.current) setLoading(true)
      setError(null)
      fetchCards(keyword)
        .then((data) => {
          if (!cancelled) {
            setCards(data)
            loadedOnce.current = true
          }
        })
        .catch((e: unknown) => {
          if (!cancelled)
            setError(e instanceof Error ? e.message : '取得に失敗しました')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [keyword, reloadKey])

  // カードを listId でグルーピングし、リスト順にカラムを組み立てる。
  // LISTS に無い listId もデータにあれば末尾のカラムとして拾う。
  const columns = useMemo(() => {
    const byList = new Map<string, Card[]>()
    for (const card of cards) {
      const arr = byList.get(card.listId) ?? []
      arr.push(card)
      byList.set(card.listId, arr)
    }

    const orderedIds = [
      ...LISTS.map((l) => l.id),
      ...[...byList.keys()].filter((id) => !LISTS.some((l) => l.id === id)),
    ]

    return orderedIds.map((id) => ({
      id,
      title: listTitle(id),
      cards: (byList.get(id) ?? []).sort((a, b) => a.position - b.position),
    }))
  }, [cards])

  const reload = () => setReloadKey((k) => k + 1)
  const isSearching = keyword.trim().length > 0

  // 盤面の該当カードだけを差し替える（無ければ末尾に追加）。全件再取得の代わり。
  // 更新API(PUT)は checklistItems を返さないため、未指定のときは既存の値を保持する
  // （更新はチェックリストを変更しないので、消さずに引き継ぐのが正しい）。
  const upsertCard = (card: Card) =>
    setCards((prev) => {
      const current = prev.find((c) => c.id === card.id)
      if (!current) return [...prev, card]
      const merged: Card = {
        ...card,
        checklistItems: card.checklistItems ?? current.checklistItems,
      }
      return prev.map((c) => (c.id === card.id ? merged : c))
    })

  // ドラッグ中のカードを、targetListId の targetIndex 番目へ移動する。
  async function moveTo(targetListId: string, targetIndex: number) {
    const id = draggingId
    setDraggingId(null)
    if (!id) return
    try {
      await moveCard(id, targetListId, targetIndex)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '移動に失敗しました')
    } finally {
      reload()
    }
  }

  // targetListId 内の beforeCardId の直前へドロップしたときの移動先 index を求めて移動する。
  function dropBefore(targetListId: string, beforeCardId: string) {
    if (!draggingId || beforeCardId === draggingId) return
    const col = columns.find((c) => c.id === targetListId)
    if (!col) return
    const siblings = col.cards.filter((c) => c.id !== draggingId)
    const idx = siblings.findIndex((c) => c.id === beforeCardId)
    moveTo(targetListId, idx < 0 ? siblings.length : idx)
  }

  // リストの末尾（空白領域）へドロップしたときの移動。
  function dropToEnd(targetListId: string) {
    if (!draggingId) return
    const col = columns.find((c) => c.id === targetListId)
    if (!col) return
    const siblings = col.cards.filter((c) => c.id !== draggingId)
    moveTo(targetListId, siblings.length)
  }

  // リストを key（期限/優先度）でソートし、結果を永続化する。
  // 押すたびに方向をトグル（期限は初回=昇順、優先度は初回=高い順）。
  async function sortList(listId: string, key: SortKey) {
    const col = columns.find((c) => c.id === listId)
    if (!col || col.cards.length < 2) return

    const current = sortDir[listId]?.[key]
    const dir: SortDir =
      key === 'due'
        ? current === 'asc'
          ? 'desc'
          : 'asc'
        : current === 'desc'
          ? 'asc'
          : 'desc'

    const sorted = [...col.cards].sort((a, b) =>
      key === 'due' ? compareByDue(a, b, dir) : compareByPriority(a, b, dir),
    )

    setSortDir((s) => ({ ...s, [listId]: { ...s[listId], [key]: dir } }))

    try {
      await reorderCards(
        listId,
        sorted.map((c) => c.id),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '並べ替えに失敗しました')
    } finally {
      reload()
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Trello風タスク管理</h1>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="カードを検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </header>

      <main className="board-main">
        {error && <p className="state-msg state-error">⚠ {error}</p>}

        {!error && loading && <p className="state-msg">読み込み中...</p>}

        {!error && !loading && (
          <div className="lists">
            {columns.map((col) => (
              <section className="list" key={col.id}>
                <div className="list-head">
                  <h2 className="list-title">{col.title}</h2>
                  <div className="list-tools">
                    <button
                      type="button"
                      className="sort-btn"
                      title="期限順に並べ替え"
                      disabled={col.cards.length < 2}
                      onClick={() => sortList(col.id, 'due')}
                    >
                      📅
                      {sortDir[col.id]?.due === 'asc'
                        ? '↑'
                        : sortDir[col.id]?.due === 'desc'
                          ? '↓'
                          : '↕'}
                    </button>
                    <button
                      type="button"
                      className="sort-btn"
                      title="優先度順に並べ替え"
                      disabled={col.cards.length < 2}
                      onClick={() => sortList(col.id, 'priority')}
                    >
                      ⚑
                      {sortDir[col.id]?.priority === 'desc'
                        ? '↓'
                        : sortDir[col.id]?.priority === 'asc'
                          ? '↑'
                          : '↕'}
                    </button>
                    <span className="list-count">{col.cards.length}</span>
                  </div>
                </div>
                <div
                  className={`list-cards${draggingId ? ' is-drop-target' : ''}`}
                  onDragOver={(e) => {
                    if (draggingId) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    if (!draggingId) return
                    e.preventDefault()
                    dropToEnd(col.id)
                  }}
                >
                  {col.cards.map((card) => (
                    <CardItem
                      card={card}
                      key={card.id}
                      onOpen={(c) => setModal({ mode: 'edit', card: c })}
                      draggingId={draggingId}
                      onDragStart={setDraggingId}
                      onDragEnd={() => setDraggingId(null)}
                      onDropBefore={(beforeId) => dropBefore(col.id, beforeId)}
                    />
                  ))}
                  {col.cards.length === 0 && (
                    <p className="list-empty">
                      {isSearching ? '該当なし' : 'カードなし'}
                    </p>
                  )}
                </div>
                {/* 検索中は追加の起点を隠す（検索結果にカードを足す操作は紛らわしいため） */}
                {!isSearching && (
                  <button
                    type="button"
                    className="add-card-btn"
                    onClick={() => setModal({ mode: 'create', listId: col.id })}
                  >
                    ＋ カード追加
                  </button>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <CardModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={upsertCard}
        />
      )}
    </div>
  )
}

export default App
