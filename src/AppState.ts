import type { Card, CardId, ColumnId, Column } from './model'
import { sampleBoard, getColumnCards, createCard, repositionCard } from './model'
import { fetchBoard, persistCard, resetAll } from './api'
import type { UpdateResult, Effect } from './useElmish'
import type { MoveInfo } from './Dnd'

// State
export type AppState = {
  cards: Record<CardId, Card>
  columns: Column[]
}

// Messages
export type Msg =
  | { type: 'addCard'; columnId: ColumnId; title: string }
  | { type: 'moveCard'; info: MoveInfo }
  | { type: 'moveCardEnd'; info: MoveInfo }
  | { type: 'reset' }

// Init
export function init(): UpdateResult<AppState, Msg> {
  const cards = fetchBoard() ?? sampleBoard.cards
  return [{
    cards,
    columns: sampleBoard.columns,
  }]
}

// Update
export function update(state: AppState, msg: Msg): UpdateResult<AppState, Msg> {
  switch (msg.type) {
    case 'addCard': {
      const columnCards = getColumnCards(state.cards, msg.columnId)
      const lastPosition = columnCards.at(-1)?.position ?? null
      const newCard = createCard(msg.columnId, msg.title, lastPosition)
      const newCards = { ...state.cards, [newCard.id]: newCard }
      const effect: Effect<Msg> = () => { persistCard(newCard) }
      return [{ ...state, cards: newCards }, effect]
    }

    case 'moveCard': {
      const { itemId, toGroupId, toIndex } = msg.info
      const columnCards = getColumnCards(state.cards, toGroupId as ColumnId).filter(c => c.id !== itemId)
      const beforePos = columnCards[toIndex - 1]?.position ?? null
      const afterPos = columnCards[toIndex]?.position ?? null
      const updatedCard = repositionCard(state.cards[itemId], toGroupId as ColumnId, beforePos, afterPos)
      const newCards = { ...state.cards, [itemId]: updatedCard }
      return [{ ...state, cards: newCards }]
    }

    case 'moveCardEnd': {
      const { itemId } = msg.info
      const card = state.cards[itemId]
      const effect: Effect<Msg> = () => { persistCard(card) }
      return [state, effect]
    }

    case 'reset': {
      const effect: Effect<Msg> = () => { resetAll() }
      return [{ ...state, cards: sampleBoard.cards }, effect]
    }
  }
}
