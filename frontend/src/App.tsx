import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createCard, fetchCards, updateCard } from './api'
import { LISTS, listTitle } from './lists'
import type { Card, NewCard, Priority } from './types'

const PRIORITY_CLASS: Record<Priority, string> = {
  高: 'prio-high',
  中: 'prio-mid',
  低: 'prio-low',
}

const PRIORITIES: Priority[] = ['高', '中', '低']

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
}: {
  card: Card
  onOpen: (card: Card) => void
}) {
  return (
    <article
      className="card"
      role="button"
      tabIndex={0}
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
      {card.dueDate && <span className="card-due">🗓 {card.dueDate}</span>}
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
}: {
  initial: FormValues
  submitLabel: string
  pendingLabel: string
  onSubmit: (input: NewCard) => Promise<unknown>
  onClose: () => void
  onDone: () => void
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
      await onSubmit(input)
      onDone()
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

// カード詳細モーダル。edit（既存カードの編集）/ create（新規追加）の2モード。
function CardModal({
  state,
  onClose,
  onSaved,
}: {
  state: ModalState
  onClose: () => void
  onSaved: () => void
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

  const handleSubmit = (input: NewCard) =>
    isCreate ? createCard(input) : updateCard(state.card.id, input)

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
          onDone={onSaved}
        />
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

  // keyword / reloadKey の変化に応じて再取得（入力のたびに叩かないよう軽くdebounce）
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetchCards(keyword)
        .then((data) => {
          if (!cancelled) setCards(data)
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
                  <span className="list-count">{col.cards.length}</span>
                </div>
                <div className="list-cards">
                  {col.cards.map((card) => (
                    <CardItem
                      card={card}
                      key={card.id}
                      onOpen={(c) => setModal({ mode: 'edit', card: c })}
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
          onSaved={reload}
        />
      )}
    </div>
  )
}

export default App
