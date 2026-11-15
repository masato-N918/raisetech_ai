import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createCard, fetchCards } from './api'
import { LISTS, listTitle } from './lists'
import type { Card, NewCard, Priority } from './types'

const PRIORITY_CLASS: Record<Priority, string> = {
  高: 'prio-high',
  中: 'prio-mid',
  低: 'prio-low',
}

const PRIORITIES: Priority[] = ['高', '中', '低']

// モーダルの状態。既存カードの詳細表示(view)か、新規追加(create)か。
// create のときは「＋ カード追加」を押したリストの id を初期選択に使う。
type ModalState =
  | { mode: 'view'; card: Card }
  | { mode: 'create'; listId: string }

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

// 既存カードの詳細表示（読み取り専用）。
function CardView({ card }: { card: Card }) {
  const hasDesc = !!card.description?.trim()
  return (
    <div className="modal-body">
      <span className="field-label">タイトル</span>
      <p className="field-value">{card.title}</p>

      <span className="field-label">リスト（状態）</span>
      <p className="field-value">{listTitle(card.listId)}</p>

      <span className="field-label">優先度</span>
      <p className="field-value">{card.priority ?? 'なし'}</p>

      <span className="field-label">説明</span>
      <p className="field-value field-desc">{hasDesc ? card.description : '—'}</p>

      <span className="field-label">期限</span>
      <p className="field-value">{card.dueDate ?? '—'}</p>
    </div>
  )
}

// 新規カードの入力フォーム。登録成功で onCreated（一覧再取得）→ onClose。
function CardCreateForm({
  initialListId,
  onClose,
  onCreated,
}: {
  initialListId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [listId, setListId] = useState(initialListId || LISTS[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')
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
      await createCard(input)
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
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
          {submitting ? '追加中...' : '追加'}
        </button>
      </div>
    </form>
  )
}

// カード詳細モーダル。view（詳細表示）/ create（新規追加）の2モードを持つ。
function CardModal({
  state,
  onClose,
  onCreated,
}: {
  state: ModalState
  onClose: () => void
  onCreated: () => void
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

        {state.mode === 'create' ? (
          <CardCreateForm
            initialListId={state.listId}
            onClose={onClose}
            onCreated={onCreated}
          />
        ) : (
          <CardView card={state.card} />
        )}
      </div>
    </div>
  )
}

function App() {
  const [keyword, setKeyword] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 登録後にインクリメントして一覧を再取得させるためのキー
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
                      onOpen={(c) => setModal({ mode: 'view', card: c })}
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
          onCreated={reload}
        />
      )}
    </div>
  )
}

export default App
