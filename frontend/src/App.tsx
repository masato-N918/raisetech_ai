import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { fetchCards } from './api'
import { LISTS, listTitle } from './lists'
import type { Card, Priority } from './types'

const PRIORITY_CLASS: Record<Priority, string> = {
  高: 'prio-high',
  中: 'prio-mid',
  低: 'prio-low',
}

function CardItem({ card }: { card: Card }) {
  return (
    <article className="card">
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

function App() {
  const [keyword, setKeyword] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // keyword の変化に応じて再取得（入力のたびに叩かないよう軽くdebounce）
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
  }, [keyword])

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

  const totalHits = cards.length

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

        {!error && !loading && totalHits === 0 && (
          <p className="state-msg">
            {keyword.trim()
              ? `「${keyword.trim()}」に該当するカードはありません。`
              : 'カードがありません。'}
          </p>
        )}

        {!error && !loading && totalHits > 0 && (
          <div className="lists">
            {columns.map((col) => (
              <section className="list" key={col.id}>
                <div className="list-head">
                  <h2 className="list-title">{col.title}</h2>
                  <span className="list-count">{col.cards.length}</span>
                </div>
                <div className="list-cards">
                  {col.cards.map((card) => (
                    <CardItem card={card} key={card.id} />
                  ))}
                  {col.cards.length === 0 && (
                    <p className="list-empty">カードなし</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
