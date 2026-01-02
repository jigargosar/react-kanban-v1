import { create } from 'zustand'
import {
  type Card,
  type CardId,
  type Column,
  type ColumnId,
  sampleBoard,
  createCard,
  createColumn,
  getColumnCards,
  getSortedColumns,
} from './model'
import * as api from './api'

type Status = 'idle' | 'loading'

type EditingState =
  | { type: 'card'; id: CardId }
  | { type: 'column'; id: ColumnId }
  | null

type AppState = {
  cards: Record<CardId, Card>
  columns: Record<ColumnId, Column>
  status: Status
  error: string | null
  editing: EditingState
}

type AppActions = {
  load: () => void
  // Card actions
  addCard: (columnId: ColumnId, title: string) => void
  updateCard: (cardId: CardId, title: string) => void
  deleteCard: (cardId: CardId) => void
  // Column actions
  addColumn: (title: string) => void
  updateColumn: (columnId: ColumnId, title: string) => void
  deleteColumn: (columnId: ColumnId) => void
  // Editing
  startEditing: (type: 'card' | 'column', id: string) => void
  stopEditing: () => void
  // Other
  reset: () => void
  clearError: () => void
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  cards: {},
  columns: {},
  status: 'idle',
  error: null,
  editing: null,

  load: () => {
    set({ status: 'loading' })
    api.fetchBoard()
      .then((stored) => set({
        cards: stored.cards ?? sampleBoard.cards,
        columns: stored.columns ?? sampleBoard.columns,
        status: 'idle'
      }))
      .catch((e) => set({ error: e.message, status: 'idle' }))
  },

  // Card actions
  addCard: (columnId, title) => {
    const { cards } = get()
    const columnCards = getColumnCards(cards, columnId)
    const lastPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : null
    const newCard = createCard(columnId, title, lastPosition)
    set({ cards: { ...cards, [newCard.id]: newCard } })
    api.persistCard(newCard)
      .catch((e) => set({ error: e.message }))
  },

  updateCard: (cardId, title) => {
    const { cards } = get()
    const card = cards[cardId]
    if (!card) return
    const updated = { ...card, title }
    set({ cards: { ...cards, [cardId]: updated } })
    api.persistCard(updated)
      .catch((e) => set({ error: e.message }))
  },

  deleteCard: (cardId) => {
    const { cards } = get()
    const remaining = { ...cards }
    delete remaining[cardId]
    set({ cards: remaining })
    api.deleteCard(cardId)
      .catch((e) => set({ error: e.message }))
  },

  // Column actions
  addColumn: (title) => {
    const { columns } = get()
    const sortedColumns = getSortedColumns(columns)
    const lastPosition = sortedColumns.length > 0 ? sortedColumns[sortedColumns.length - 1].position : null
    const newColumn = createColumn(title, lastPosition)
    set({ columns: { ...columns, [newColumn.id]: newColumn } })
    api.persistColumn(newColumn)
      .catch((e) => set({ error: e.message }))
  },

  updateColumn: (columnId, title) => {
    const { columns } = get()
    const column = columns[columnId]
    if (!column) return
    const updated = { ...column, title }
    set({ columns: { ...columns, [columnId]: updated } })
    api.persistColumn(updated)
      .catch((e) => set({ error: e.message }))
  },

  deleteColumn: (columnId) => {
    const { cards, columns } = get()
    // Delete column
    const remainingColumns = { ...columns }
    delete remainingColumns[columnId]
    // Delete all cards in this column
    const remainingCards = Object.fromEntries(
      Object.entries(cards).filter(([, card]) => card.columnId !== columnId)
    )
    set({ cards: remainingCards, columns: remainingColumns })
    // Persist
    api.deleteColumn(columnId)
      .catch((e) => set({ error: e.message }))
    api.deleteCardsByColumn(columnId)
      .catch((e) => set({ error: e.message }))
  },

  // Editing
  startEditing: (type, id) => {
    set({ editing: { type, id } })
  },

  stopEditing: () => {
    set({ editing: null })
  },

  // Other
  reset: async () => {
    try {
      await api.resetAll()
      set({ cards: sampleBoard.cards, columns: sampleBoard.columns })
      // Persist sample data
      for (const card of Object.values(sampleBoard.cards)) {
        await api.persistCard(card)
      }
      for (const column of Object.values(sampleBoard.columns)) {
        await api.persistColumn(column)
      }
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  clearError: () => set({ error: null }),
}))
