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

type Status = 'idle' | 'loading' | 'error'

type AppState = {
  cards: Record<CardId, Card>
  status: Status
}

type AppActions = {
  load: () => Promise<void>
  addCard: (columnId: ColumnId, title: string) => void
  deleteCard: (cardId: CardId) => void
  moveCard: (info: MoveInfo) => void
  persistCard: (cardId: CardId) => Promise<void>
  reset: () => Promise<void>
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  cards: {},
  status: 'idle',

  load: async () => {
    set({ status: 'loading' })
    const stored = await api.fetchBoard()
    set({ cards: stored ?? sampleBoard.cards, status: 'idle' })
  },

  addCard: (columnId, title) => {
    const { cards } = get()
    const columnCards = getColumnCards(cards, columnId)
    const lastPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : null
    const newCard = createCard(columnId, title, lastPosition)
    set({ cards: { ...cards, [newCard.id]: newCard } })
    api.persistCard(newCard)
  },

  deleteCard: (cardId) => {
    const { cards } = get()
    const remaining = { ...cards }
    delete remaining[cardId]
    set({ cards: remaining })
    api.deleteCard(cardId)
  },

  moveCard: (info) => {
    const { cards } = get()
    const card = cards[info.itemId]
    if (!card) return

    const targetCards = getColumnCards(cards, info.toGroupId)
    const filteredCards = targetCards.filter((c) => c.id !== card.id)

    const beforePos = info.toIndex > 0 ? filteredCards[info.toIndex - 1]?.position ?? null : null
    const afterPos = filteredCards[info.toIndex]?.position ?? null

    const updated = repositionCard(card, info.toGroupId, beforePos, afterPos)
    set({ cards: { ...cards, [card.id]: updated } })
  },

  persistCard: async (cardId) => {
    const { cards } = get()
    const card = cards[cardId]
    if (card) {
      await api.persistCard(card)
    }
  },

  reset: async () => {
    await api.resetAll()
    set({ cards: sampleBoard.cards })
  },
}))
