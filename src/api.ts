import type { CardId, Card } from './model'

const STORAGE_KEY = 'kanban-cards'

export function fetchBoard(): Record<CardId, Card> | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as Record<CardId, Card>
  } catch {
    return null
  }
}

export function persistCard(card: Card): void {
  const current = fetchBoard() ?? {}
  current[card.id] = card
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function resetAll(): void {
  localStorage.removeItem(STORAGE_KEY)
}
