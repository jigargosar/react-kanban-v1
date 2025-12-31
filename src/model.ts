// Types
export type CardId = string
export type ColumnId = string

export type Card = {
  id: CardId
  title: string
  columnId: ColumnId
  position: string
}

export type Column = {
  id: ColumnId
  title: string
}

export type Board = {
  cards: Record<CardId, Card>
  columns: Column[]
}

// Fractional indexing helpers
export function positionBetween(before: string | null, after: string | null): string {
  if (!before && !after) return 'a'
  if (!before) return midpoint('', after!)
  if (!after) return before + 'a'
  return midpoint(before, after)
}

function midpoint(a: string, b: string): string {
  let result = ''
  let i = 0
  while (true) {
    const charA = a.charCodeAt(i) || 96 // 'a' - 1
    const charB = b.charCodeAt(i) || 123 // 'z' + 1
    if (charA + 1 < charB) {
      return result + String.fromCharCode(Math.floor((charA + charB) / 2))
    }
    result += a[i] || 'a'
    i++
  }
}

// Derive cards for a column, sorted by position
export function getColumnCards(cards: Record<CardId, Card>, columnId: ColumnId): Card[] {
  return Object.values(cards)
    .filter(card => card.columnId === columnId)
    .sort((a, b) => a.position.localeCompare(b.position))
}

// Sample data
export const sampleBoard: Board = {
  cards: {
    'card-1': { id: 'card-1', title: 'Set up project structure', columnId: 'col-3', position: 'a' },
    'card-2': { id: 'card-2', title: 'Design data model', columnId: 'col-2', position: 'a' },
    'card-3': { id: 'card-3', title: 'Implement drag and drop', columnId: 'col-1', position: 'a' },
    'card-4': { id: 'card-4', title: 'Add persistence', columnId: 'col-1', position: 'n' },
    'card-5': { id: 'card-5', title: 'Research Tailwind v4', columnId: 'col-3', position: 'n' },
  },
  columns: [
    { id: 'col-1', title: 'Todo' },
    { id: 'col-2', title: 'In Progress' },
    { id: 'col-3', title: 'Done' },
  ],
}

// Local storage
const STORAGE_KEY = 'kanban-cards'

export function loadCards(): Record<CardId, Card> | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as Record<CardId, Card>
  } catch {
    return null
  }
}

export function saveCards(cards: Record<CardId, Card>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}
