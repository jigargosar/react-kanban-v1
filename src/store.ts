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
  // Fire-and-forget: void return is intentional - callers use optimistic updates
  const persist = (fn: () => Promise<void>) => {
    enqueue(fn).catch((e: unknown) => { set({ error: e instanceof Error ? e.message : 'Unknown error' }); })
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
    return api.onAuthStateChange((event, session) => {
      const prevUser = get().user
      const newUser = session?.user
      const userData = newUser != null
        ? { id: newUser.id, name: (newUser.user_metadata.user_name as string | undefined) ?? newUser.email ?? null }
        : null

      switch (event) {
        case 'INITIAL_SESSION':
          console.log('[AUTH] INITIAL_SESSION', { userId: userData?.id ?? null, sessionExists: session != null })
          set({ user: userData, authLoading: false })
          if (userData != null) {
            get().load()
          }
          break

        case 'SIGNED_IN':
          console.log('[AUTH] SIGNED_IN', { prevUserId: prevUser?.id ?? null, newUserId: userData?.id ?? null })
          if (prevUser?.id !== userData?.id) {
            set({ user: userData })
            if (userData != null) {
              get().load()
            }
          }
          break

        case 'SIGNED_OUT':
          console.log('[AUTH] SIGNED_OUT', { prevUserId: prevUser?.id ?? null })
          set({
            user: null,
            boards: {},
            columns: {},
            cards: {},
            activeBoardId: null
          })
          break

        case 'TOKEN_REFRESHED':
          console.log('[AUTH] TOKEN_REFRESHED', { userId: userData?.id ?? null })
          // No action - Supabase handles tokens internally
          break

        case 'USER_UPDATED':
          console.log('[AUTH] USER_UPDATED', { userId: userData?.id ?? null })
          set({ user: userData })
          break

        case 'PASSWORD_RECOVERY':
          console.log('[AUTH] PASSWORD_RECOVERY', { userId: userData?.id ?? null })
          set({ user: userData })
          break
      }
    })
  },

  signIn: () => {
    api.signInWithGitHub()
      .catch((e: unknown) => {
        console.error('[AUTH] signIn failed', e)
        set({ error: e instanceof Error ? e.message : 'Sign in failed' })
      })
  },

  signOut: () => {
    api.signOut()
      .catch((e: unknown) => {
        console.error('[AUTH] signOut failed', e)
        set({ error: e instanceof Error ? e.message : 'Sign out failed' })
      })
  },

  load: () => {
    set({ status: 'loading' })
    api.fetchAll()
      .then(({ boards, columns, cards, activeBoardId: storedActiveBoardId }) => {
        const sortedBoards = getSortedBoards(boards)
        // Use stored activeBoardId if valid, otherwise fall back to first board
        const firstBoard = sortedBoards[0]
        const activeBoardId = (storedActiveBoardId != null && boards[storedActiveBoardId] != null)
          ? storedActiveBoardId
          : (firstBoard != null ? firstBoard.id : null)
        set({
          boards,
          activeBoardId,
          columns,
          cards,
          status: 'idle'
        })
      })
      .catch((e: unknown) => { set({ error: e instanceof Error ? e.message : 'Unknown error', status: 'idle' }); })
  },

  // Board actions
  addBoard: (title) => {
    const { user, authLoading, boards } = get()
    if (authLoading || user == null) {
      set({ error: 'Must be logged in to create a board' })
      return
    }
    const sortedBoards = getSortedBoards(boards)
    const lastBoard = sortedBoards[sortedBoards.length - 1]
    const newBoard = createBoard(user.id, title, lastBoard?.position ?? null)
    console.log('[ ADD_BOARD] Adding board:', newBoard.id, 'title:', title)
    set({ boards: { ...boards, [newBoard.id]: newBoard }, activeBoardId: newBoard.id })
    persist(() => api.persistBoard(newBoard))
    persist(() => api.persistActiveBoardId(newBoard.id))
  },

  updateBoard: (boardId, title) => {
    const { boards } = get()
    const board = boards[boardId]
    console.log('[UPDATE_BOARD] boardId:', boardId, 'title:', title, 'found:', board != null)
    if (board == null) return
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
    const remainingBoards = Object.fromEntries(
      Object.entries(boards).filter(([id]) => id !== boardId)
    )

    // Update active board if needed
    let newActiveBoardId = activeBoardId
    if (activeBoardId === boardId) {
      const sorted = getSortedBoards(remainingBoards)
      newActiveBoardId = sorted[0]?.id ?? null
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
    const lastCard = columnCards[columnCards.length - 1]
    const newCard = createCard(columnId, title, lastCard?.position ?? null)
    set({ cards: { ...cards, [newCard.id]: newCard } })
    persist(() => api.persistCard(newCard))
  },

  updateCard: (cardId, title) => {
    const { cards } = get()
    const card = cards[cardId]
    if (card == null) return
    const updated = { ...card, title }
    set({ cards: { ...cards, [cardId]: updated } })
    persist(() => api.persistCard(updated))
  },

  deleteCard: (cardId) => {
    const { cards } = get()
    const remaining = Object.fromEntries(
      Object.entries(cards).filter(([id]) => id !== cardId)
    )
    set({ cards: remaining })
    persist(() => api.deleteCard(cardId))
  },

  moveCard: ({ cardId, toColumnId, beforeId, afterId, persist: shouldPersist = true }) => {
    const { cards } = get()
    const card = cards[cardId]
    if (card == null) return
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
    if (activeBoardId == null) return
    const sortedColumns = getSortedColumns(columns, activeBoardId)
    const lastColumn = sortedColumns[sortedColumns.length - 1]
    const newColumn = createColumn(activeBoardId, title, lastColumn?.position ?? null)
    set({ columns: { ...columns, [newColumn.id]: newColumn } })
    persist(() => api.persistColumn(newColumn))
  },

  updateColumn: (columnId, title) => {
    const { columns } = get()
    const column = columns[columnId]
    if (column == null) return
    const updated = { ...column, title }
    set({ columns: { ...columns, [columnId]: updated } })
    persist(() => api.persistColumn(updated))
  },

  deleteColumn: (columnId) => {
    const { cards, columns } = get()
    // Delete column
    const remainingColumns = Object.fromEntries(
      Object.entries(columns).filter(([id]) => id !== columnId)
    )
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
    if (column == null) return
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

  clearError: () => { set({ error: null }); },
}})
