// Types
export type CardId = string
export type ColumnId = string

export type Card = {
  id: CardId
  title: string
}

export type Column = {
  id: ColumnId
  title: string
  cardIds: CardId[]
}

export type Board = {
  cards: Record<CardId, Card>
  columns: Column[]
}

// Sample data
export const sampleBoard: Board = {
  cards: {
    'card-1': { id: 'card-1', title: 'Set up project structure' },
    'card-2': { id: 'card-2', title: 'Design data model' },
    'card-3': { id: 'card-3', title: 'Implement drag and drop' },
    'card-4': { id: 'card-4', title: 'Add persistence' },
    'card-5': { id: 'card-5', title: 'Research Tailwind v4' },
  },
  columns: [
    { id: 'col-1', title: 'Todo', cardIds: ['card-3', 'card-4'] },
    { id: 'col-2', title: 'In Progress', cardIds: ['card-2'] },
    { id: 'col-3', title: 'Done', cardIds: ['card-1', 'card-5'] },
  ],
}
