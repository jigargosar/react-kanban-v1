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
  position: string
}

export type Board = {
  cards: Record<CardId, Card>
  columns: Record<ColumnId, Column>
}

// Fractional indexing helpers
function positionBetween(before: string | null | undefined, after: string | null | undefined): string {
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

// Card operations
export function createCard(columnId: ColumnId, title: string, lastPosition: string | null): Card {
  return {
    id: crypto.randomUUID(),
    title,
    columnId,
    position: positionBetween(lastPosition, null),
  }
}

// Derive cards for a column, sorted by position
export function getColumnCards(cards: Record<CardId, Card>, columnId: ColumnId): Card[] {
  return Object.values(cards)
    .filter(card => card.columnId === columnId)
    .sort((a, b) => a.position.localeCompare(b.position))
}

// Column operations
export function createColumn(title: string, lastPosition: string | null): Column {
  return {
    id: crypto.randomUUID(),
    title,
    position: positionBetween(lastPosition, null),
  }
}

// Get sorted columns
export function getSortedColumns(columns: Record<ColumnId, Column>): Column[] {
  return Object.values(columns).sort((a, b) => a.position.localeCompare(b.position))
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
  columns: {
    'col-1': { id: 'col-1', title: 'Todo', position: 'a' },
    'col-2': { id: 'col-2', title: 'In Progress', position: 'n' },
    'col-3': { id: 'col-3', title: 'Done', position: 'z' },
  },
}
