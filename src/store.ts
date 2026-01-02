import { create } from 'zustand'
import {
  type Card,
  type CardId,
  type ColumnId,
  sampleBoard,
  createCard,
  repositionCard,
  getColumnCards,
} from './model'
import * as api from './api'
import type { MoveInfo } from './Dnd'

type Status = 'idle' | 'loading'

type AppState = {
  cards: Record<CardId, Card>
  status: Status
  error: string | null
}

type AppActions = {
  load: () => void
  addCard: (columnId: ColumnId, title: string) => void
  deleteCard: (cardId: CardId) => void
  handleDndMove: (info: MoveInfo, isEnd: boolean) => void
  reset: () => void
  clearError: () => void
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  cards: {},
  status: 'idle',
  error: null,

  load: () => {
    set({ status: 'loading' })
    api.fetchBoard()
      .then((stored) => set({ cards: stored ?? sampleBoard.cards, status: 'idle' }))
      .catch((e) => set({ error: e.message, status: 'idle' }))
  },

  addCard: (columnId, title) => {
    const { cards } = get()
    const columnCards = getColumnCards(cards, columnId)
    const lastPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : null
    const newCard = createCard(columnId, title, lastPosition)
    set({ cards: { ...cards, [newCard.id]: newCard } })
    api.persistCard(newCard)
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

  handleDndMove: ({ movedItemId, destGroupId, beforeId, afterId }, isEnd) => {
    const { cards } = get()
    const card = cards[movedItemId]
    if (!card) return

    const beforePos = beforeId ? cards[beforeId]?.position ?? null : null
    const afterPos = afterId ? cards[afterId]?.position ?? null : null
    const updated = repositionCard(card, destGroupId, beforePos, afterPos)
    set({ cards: { ...cards, [card.id]: updated } })

    if (isEnd) {
      api.persistCard(updated)
        .catch((e) => set({ error: e.message }))
    }
  },

  reset: () => {
    api.resetAll()
      .then(() => set({ cards: sampleBoard.cards }))
      .catch((e) => set({ error: e.message }))
  },

  clearError: () => set({ error: null }),
}))
