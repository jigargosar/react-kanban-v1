import type { CardId, Card, ColumnId, Column, Board } from './model'

const CARDS_KEY = 'kanban-cards'
const COLUMNS_KEY = 'kanban-columns'

export async function fetchCards(): Promise<Record<CardId, Card> | null> {
  const stored = localStorage.getItem(CARDS_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<CardId, Card>
}

export async function fetchColumns(): Promise<Record<ColumnId, Column> | null> {
  const stored = localStorage.getItem(COLUMNS_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<ColumnId, Column>
}

export async function fetchBoard(): Promise<Partial<Board>> {
  const cards = await fetchCards()
  const columns = await fetchColumns()
  return { cards: cards ?? undefined, columns: columns ?? undefined }
}

export async function persistCard(card: Card): Promise<void> {
  const current = await fetchCards() ?? {}
  current[card.id] = card
  localStorage.setItem(CARDS_KEY, JSON.stringify(current))
}

export async function deleteCard(cardId: CardId): Promise<void> {
  const current = await fetchCards() ?? {}
  delete current[cardId]
  localStorage.setItem(CARDS_KEY, JSON.stringify(current))
}

export async function persistColumn(column: Column): Promise<void> {
  const current = await fetchColumns() ?? {}
  current[column.id] = column
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(current))
}

export async function deleteColumn(columnId: ColumnId): Promise<void> {
  const current = await fetchColumns() ?? {}
  delete current[columnId]
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(current))
}

export async function deleteCardsByColumn(columnId: ColumnId): Promise<void> {
  const current = await fetchCards() ?? {}
  const filtered = Object.fromEntries(
    Object.entries(current).filter(([, card]) => card.columnId !== columnId)
  )
  localStorage.setItem(CARDS_KEY, JSON.stringify(filtered))
}

export async function resetAll(): Promise<void> {
  localStorage.removeItem(CARDS_KEY)
  localStorage.removeItem(COLUMNS_KEY)
}
