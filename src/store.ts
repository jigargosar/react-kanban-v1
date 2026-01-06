import { create } from 'zustand'
import {
  type Board,
  type BoardId,
  type Card,
  type CardId,
  type Column,
  type ColumnId,
  type UserId,
  createBoard,
  createCard,
  createColumn,
  getColumnCards,
  getSortedBoards,
  getSortedColumns,
  calculatePositionBetween,
} from './model'
import * as api from './api'
import { enqueue } from './queue'

type Status = 'idle' | 'loading'

type AuthUser = {
  id: UserId
  name: string | null
}

type EditingState =
  | { type: 'card'; id: CardId }
  | { type: 'column'; id: ColumnId }
  | { type: 'board'; id: BoardId }
  | null

type AppState = {
  // Auth
  user: AuthUser | null
  authLoading: boolean
  // Data
  boards: Record<BoardId, Board>
  activeBoardId: BoardId | null
  cards: Record<CardId, Card>
  columns: Record<ColumnId, Column>
  status: Status
  error: string | null
  editing: EditingState
}

type AppActions = {
  // Auth
  initAuth: () => () => void
  signIn: () => void
  signOut: () => void
  // Data
  load: () => void
  // Board actions
  addBoard: (title: string) => void
  updateBoard: (boardId: BoardId, title: string) => void
  deleteBoard: (boardId: BoardId) => void
  setActiveBoard: (boardId: BoardId) => void
  // Card actions
  addCard: (columnId: ColumnId, title: string) => void
  updateCard: (cardId: CardId, title: string) => void
  deleteCard: (cardId: CardId) => void
  moveCard: (params: { cardId: string; toColumnId: string; beforeId: string | null; afterId: string | null; persist?: boolean }) => void
  // Column actions
  addColumn: (title: string) => void
  updateColumn: (columnId: ColumnId, title: string) => void
  deleteColumn: (columnId: ColumnId) => void
  moveColumn: (params: { columnId: string; beforeId: string | null; afterId: string | null; persist?: boolean }) => void
  // Editing
  startEditing: (type: 'card' | 'column' | 'board', id: string) => void
  stopEditing: () => void
  // Other
  reset: () => void
  clearError: () => void
}

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const persist = (fn: () => Promise<void>) => {
    enqueue(fn).catch((e) => set({ error: (e as Error).message }))
  }

  return {
  // Auth
  user: null,
  authLoading: true,
  // Data
  boards: {},
  activeBoardId: null,
  cards: {},
  columns: {},
  status: 'idle',
  error: null,
  editing: null,

  initAuth: () => {
    api.getSession().then((session) => {
      const user = session?.user
      set({
        user: user ? { id: user.id, name: user.user_metadata?.user_name ?? user.email ?? null } : null,
        authLoading: false,
      })
    })

    return api.onAuthStateChange((_event, session) => {
      const user = session?.user
      set({
        user: user ? { id: user.id, name: user.user_metadata?.user_name ?? user.email ?? null } : null,
      })
    })
  },

  signIn: () => {
    api.signInWithGitHub()
  },

  signOut: () => {
    api.signOut()
  },

  load: () => {
    set({ status: 'loading' })
    api.fetchAll()
      .then(({ boards, columns, cards, activeBoardId: storedActiveBoardId }) => {
        const boardsRecord = boards ?? {}
        const sortedBoards = getSortedBoards(boardsRecord)
        // Use stored activeBoardId if valid, otherwise fall back to first board
        const activeBoardId = (storedActiveBoardId && boardsRecord[storedActiveBoardId])
          ? storedActiveBoardId
          : (sortedBoards.length > 0 ? sortedBoards[0].id : null)
        set({
          boards: boardsRecord,
          activeBoardId,
          columns: columns ?? {},
          cards: cards ?? {},
          status: 'idle'
        })
      })
      .catch((e) => set({ error: e.message, status: 'idle' }))
  },

  // Board actions
  addBoard: (title) => {
    const { user, authLoading, boards } = get()
    if (authLoading || !user) {
      set({ error: 'Must be logged in to create a board' })
      return
    }
    const sortedBoards = getSortedBoards(boards)
    const lastPosition = sortedBoards.length > 0 ? sortedBoards[sortedBoards.length - 1].position : null
    const newBoard = createBoard(user.id, title, lastPosition)
    console.log('[ ADD_BOARD] Adding board:', newBoard.id, 'title:', title)
    set({ boards: { ...boards, [newBoard.id]: newBoard }, activeBoardId: newBoard.id })
    persist(() => api.persistBoard(newBoard))
    persist(() => api.persistActiveBoardId(newBoard.id))
  },

  updateBoard: (boardId, title) => {
    const { boards } = get()
    const board = boards[boardId]
    console.log('[UPDATE_BOARD] boardId:', boardId, 'title:', title, 'found:', !!board)
    if (!board) return
    const updated = { ...board, title }
    set({ boards: { ...boards, [boardId]: updated } })
    console.log('[UPDATE_BOARD] State updated')
    persist(() => api.persistBoard(updated))
  },

  deleteBoard: (boardId) => {
    const { boards, columns, cards, activeBoardId } = get()

    // Find columns belonging to this board
    const boardColumnIds = new Set(
      Object.values(columns)
        .filter(col => col.boardId === boardId)
        .map(col => col.id)
    )

    // Filter out cards in those columns
    const remainingCards = Object.fromEntries(
      Object.entries(cards).filter(([, card]) => !boardColumnIds.has(card.columnId))
    )

    // Filter out columns in this board
    const remainingColumns = Object.fromEntries(
      Object.entries(columns).filter(([, col]) => col.boardId !== boardId)
    )

    // Remove board
    const remainingBoards = { ...boards }
    delete remainingBoards[boardId]

    // Update active board if needed
    let newActiveBoardId = activeBoardId
    if (activeBoardId === boardId) {
      const sorted = getSortedBoards(remainingBoards)
      newActiveBoardId = sorted.length > 0 ? sorted[0].id : null
    }

    set({
      boards: remainingBoards,
      columns: remainingColumns,
      cards: remainingCards,
      activeBoardId: newActiveBoardId,
    })

    persist(() => api.deleteBoardCascade(boardId))
  },

  setActiveBoard: (boardId) => {
    set({ activeBoardId: boardId })
    persist(() => api.persistActiveBoardId(boardId))
  },

  // Card actions
  addCard: (columnId, title) => {
    const { cards } = get()
    const columnCards = getColumnCards(cards, columnId)
    const lastPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : null
    const newCard = createCard(columnId, title, lastPosition)
    set({ cards: { ...cards, [newCard.id]: newCard } })
    persist(() => api.persistCard(newCard))
  },

  updateCard: (cardId, title) => {
    const { cards } = get()
    const card = cards[cardId]
    if (!card) return
    const updated = { ...card, title }
    set({ cards: { ...cards, [cardId]: updated } })
    persist(() => api.persistCard(updated))
  },

  deleteCard: (cardId) => {
    const { cards } = get()
    const remaining = { ...cards }
    delete remaining[cardId]
    set({ cards: remaining })
    persist(() => api.deleteCard(cardId))
  },

  moveCard: ({ cardId, toColumnId, beforeId, afterId, persist: shouldPersist = true }) => {
    const { cards } = get()
    const card = cards[cardId]
    if (!card) return
    const newPosition = calculatePositionBetween(cards, beforeId, afterId)
    if (card.columnId === toColumnId && card.position === newPosition) {
      return
    }
    const updated = { ...card, columnId: toColumnId, position: newPosition }
    set({ cards: { ...cards, [cardId]: updated } })
    if (shouldPersist) {
      persist(() => api.persistCard(updated))
    }
  },

  // Column actions
  addColumn: (title) => {
    const { columns, activeBoardId } = get()
    if (!activeBoardId) return
    const sortedColumns = getSortedColumns(columns, activeBoardId)
    const lastPosition = sortedColumns.length > 0 ? sortedColumns[sortedColumns.length - 1].position : null
    const newColumn = createColumn(activeBoardId, title, lastPosition)
    set({ columns: { ...columns, [newColumn.id]: newColumn } })
    persist(() => api.persistColumn(newColumn))
  },

  updateColumn: (columnId, title) => {
    const { columns } = get()
    const column = columns[columnId]
    if (!column) return
    const updated = { ...column, title }
    set({ columns: { ...columns, [columnId]: updated } })
    persist(() => api.persistColumn(updated))
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
    persist(() => api.deleteColumnCascade(columnId))
  },

  moveColumn: ({ columnId, beforeId, afterId, persist: shouldPersist = true }) => {
    const { columns } = get()
    const column = columns[columnId]
    if (!column) return
    const newPosition = calculatePositionBetween(columns, beforeId, afterId)
    if (column.position === newPosition) return
    const updated = { ...column, position: newPosition }
    set({ columns: { ...columns, [columnId]: updated } })
    if (shouldPersist) {
      persist(() => api.persistColumn(updated))
    }
  },

  // Editing
  startEditing: (type, id) => {
    set({ editing: { type, id } })
  },

  stopEditing: () => {
    set({ editing: null })
  },

  // Other
  reset: () => {
    console.log('[RESET] Clearing state and queueing API call')
    set({ boards: {}, activeBoardId: null, cards: {}, columns: {} })
    persist(() => api.resetAll())
  },

  clearError: () => set({ error: null }),
}})
