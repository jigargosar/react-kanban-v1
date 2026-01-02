import type { CardId, Card } from './model'

const STORAGE_KEY = 'kanban-cards'

export async function fetchBoard(): Promise<Record<CardId, Card> | null> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<CardId, Card>
}

export async function persistCard(card: Card): Promise<void> {
  const current = await fetchBoard() ?? {}
  current[card.id] = card
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export async function deleteCard(cardId: CardId): Promise<void> {
  const current = await fetchBoard() ?? {}
  delete current[cardId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export async function resetAll(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
}
