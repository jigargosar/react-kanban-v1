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

// --- Types ---

type AuthUser = {
  id: UserId
  name: string | null
}

type MutationError = {
  message: string
}

type ReadyData = {
  user: AuthUser
  boards: Record<BoardId, Board>
  columns: Record<ColumnId, Column>
  cards: Record<CardId, Card>
  activeBoardId: BoardId | null
  mutationError: MutationError | null
}

type AppState =
  | { tag: 'initializing' }
  | { tag: 'unauthenticated' }
  | { tag: 'loading'; user: AuthUser }
  | { tag: 'ready'; data: ReadyData }

// --- Actions ---

type AppActions = {
  // Auth
  initAuth: () => () => void
  signIn: () => void
  signOut: () => void
  // Board actions
  addBoard: (title: string) => void
  updateBoard: (boardId: BoardId, title: string) => void
  deleteBoard: (boardId: BoardId) => void
  setActiveBoard: (boardId: BoardId) => void
  // Card actions
  addCard: (columnId: ColumnId, title: string) => void
  updateCard: (cardId: CardId, title: string) => void
  deleteCard: (cardId: CardId) => void
  moveCard: (params: { cardId: CardId; toColumnId: ColumnId; beforeId: CardId | null; afterId: CardId | null; persist?: boolean }) => void
  // Column actions
  addColumn: (title: string) => void
  updateColumn: (columnId: ColumnId, title: string) => void
  deleteColumn: (columnId: ColumnId) => void
  moveColumn: (params: { columnId: ColumnId; beforeId: ColumnId | null; afterId: ColumnId | null; persist?: boolean }) => void
  // Error
  clearMutationError: () => void
  // Dev/test
  reset: () => void
}

// --- Helpers ---

function createPersistQueue(onError: (e: unknown) => void) {
  let pending = Promise.resolve()
  return function persist(fn: () => Promise<void>): void {
    const result = pending.then(fn)
    pending = result.then(() => {}, () => {})
    result.catch(onError)
  }
}

// --- Store ---

type Store = { state: AppState } & AppActions

const useAppStoreV2 = create<Store>((set, get) => {
  // Helper to update ready data
  const updateData = (updater: (data: ReadyData) => Partial<ReadyData>) => {
    const { state } = get()
    if (state.tag !== 'ready') return
    set({ state: { tag: 'ready', data: { ...state.data, ...updater(state.data) } } })
  }

  const setMutationError = (message: string) => {
    updateData(() => ({ mutationError: { message } }))
  }

  const persist = createPersistQueue((e) => {
    setMutationError(e instanceof Error ? e.message : 'Unknown error')
  })

  // Helper to get ready data or null
  const getReadyData = (): ReadyData | null => {
    const { state } = get()
    return state.tag === 'ready' ? state.data : null
  }

  return {
    state: { tag: 'initializing' },

    initAuth: () => {
      // Helper to load user data (matches V1's load() pattern)
      const loadUserData = (userData: AuthUser) => {
        set({ state: { tag: 'loading', user: userData } })
        api.fetchAll()
          .then(({ boards, columns, cards, activeBoardId: storedActiveBoardId }) => {
            const sortedBoards = getSortedBoards(boards)
            const firstBoard = sortedBoards[0]
            const activeBoardId = (storedActiveBoardId != null && boards[storedActiveBoardId] != null)
              ? storedActiveBoardId
              : (firstBoard?.id ?? null)
            set({
              state: {
                tag: 'ready',
                data: { user: userData, boards, columns, cards, activeBoardId, mutationError: null }
              }
            })
          })
          .catch((e: unknown) => {
            // Non-fatal error: go to ready with empty data and error (like V1)
            set({
              state: {
                tag: 'ready',
                data: {
                  user: userData,
                  boards: {},
                  columns: {},
                  cards: {},
                  activeBoardId: null,
                  mutationError: { message: e instanceof Error ? e.message : 'Failed to load data' }
                }
              }
            })
          })
      }

      return api.onAuthStateChange((event, session) => {
        const { state } = get()
        const prevUser = state.tag === 'ready' ? state.data.user : null
        const newUser = session?.user
        const userData: AuthUser | null = newUser != null
          ? { id: newUser.id, name: (newUser.user_metadata.user_name as string | undefined) ?? newUser.email ?? null }
          : null

        switch (event) {
          case 'INITIAL_SESSION':
            console.log('[AUTH] INITIAL_SESSION', { userId: userData?.id ?? null, sessionExists: session != null })
            if (userData != null) {
              loadUserData(userData)
            } else {
              set({ state: { tag: 'unauthenticated' } })
            }
            break

          case 'SIGNED_IN':
            console.log('[AUTH] SIGNED_IN', { prevUserId: prevUser?.id ?? null, newUserId: userData?.id ?? null })
            // Match V1: only load if user changed
            if (userData != null && prevUser?.id !== userData.id) {
              loadUserData(userData)
            }
            break

          case 'SIGNED_OUT':
            console.log('[AUTH] SIGNED_OUT', { prevUserId: prevUser?.id ?? null })
            set({ state: { tag: 'unauthenticated' } })
            break

          case 'TOKEN_REFRESHED':
            console.log('[AUTH] TOKEN_REFRESHED', { userId: userData?.id ?? null })
            // No action - Supabase handles tokens internally
            break

          case 'USER_UPDATED':
            console.log('[AUTH] USER_UPDATED', { userId: userData?.id ?? null })
            if (userData != null && state.tag === 'ready') {
              updateData(() => ({ user: userData }))
            }
            break

          case 'PASSWORD_RECOVERY':
            console.log('[AUTH] PASSWORD_RECOVERY', { userId: userData?.id ?? null })
            break
        }
      })
    },

    signIn: () => {
      // No state change - page redirects to OAuth provider (like V1)
      api.signInWithGitHub()
        .catch((e: unknown) => {
          console.error('[AUTH] signIn failed', e)
          // Can't set mutation error since we might not be in ready state
          // Error will show in console, user can retry
        })
    },

    signOut: () => {
      api.signOut()
        .catch((e: unknown) => {
          console.error('[AUTH] signOut failed', e)
          setMutationError(e instanceof Error ? e.message : 'Sign out failed')
        })
    },

    // Board actions
    addBoard: (title) => {
      const data = getReadyData()
      if (data == null) return
      const sortedBoards = getSortedBoards(data.boards)
      const lastBoard = sortedBoards[sortedBoards.length - 1]
      const newBoard = createBoard(data.user.id, title, lastBoard?.position ?? null)
      console.log('[ADD_BOARD] Adding board:', newBoard.id, 'title:', title)
      updateData((d) => ({ boards: { ...d.boards, [newBoard.id]: newBoard }, activeBoardId: newBoard.id }))
      persist(() => api.persistBoard(newBoard))
      persist(() => api.persistActiveBoardId(newBoard.id))
    },

    updateBoard: (boardId, title) => {
      const data = getReadyData()
      if (data == null) return
      const board = data.boards[boardId]
      if (board == null) return
      const updated = { ...board, title }
      updateData((d) => ({ boards: { ...d.boards, [boardId]: updated } }))
      persist(() => api.persistBoard(updated))
    },

    deleteBoard: (boardId) => {
      const data = getReadyData()
      if (data == null) return

      const boardColumnIds = new Set(
        Object.values(data.columns)
          .filter(col => col.boardId === boardId)
          .map(col => col.id)
      )

      const remainingCards = Object.fromEntries(
        Object.entries(data.cards).filter(([, card]) => !boardColumnIds.has(card.columnId))
      )

      const remainingColumns = Object.fromEntries(
        Object.entries(data.columns).filter(([, col]) => col.boardId !== boardId)
      )

      const remainingBoards = Object.fromEntries(
        Object.entries(data.boards).filter(([id]) => id !== boardId)
      )

      let newActiveBoardId = data.activeBoardId
      if (data.activeBoardId === boardId) {
        const sorted = getSortedBoards(remainingBoards)
        newActiveBoardId = sorted[0]?.id ?? null
      }

      updateData(() => ({
        boards: remainingBoards,
        columns: remainingColumns,
        cards: remainingCards,
        activeBoardId: newActiveBoardId,
      }))

      persist(() => api.deleteBoardCascade(boardId))
    },

    setActiveBoard: (boardId) => {
      updateData(() => ({ activeBoardId: boardId }))
      persist(() => api.persistActiveBoardId(boardId))
    },

    // Card actions
    addCard: (columnId, title) => {
      const data = getReadyData()
      if (data == null) return
      const columnCards = getColumnCards(data.cards, columnId)
      const lastCard = columnCards[columnCards.length - 1]
      const newCard = createCard(columnId, title, lastCard?.position ?? null)
      updateData((d) => ({ cards: { ...d.cards, [newCard.id]: newCard } }))
      persist(() => api.persistCard(newCard))
    },

    updateCard: (cardId, title) => {
      const data = getReadyData()
      if (data == null) return
      const card = data.cards[cardId]
      if (card == null) return
      const updated = { ...card, title }
      updateData((d) => ({ cards: { ...d.cards, [cardId]: updated } }))
      persist(() => api.persistCard(updated))
    },

    deleteCard: (cardId) => {
      const data = getReadyData()
      if (data == null) return
      const remaining = Object.fromEntries(
        Object.entries(data.cards).filter(([id]) => id !== cardId)
      )
      updateData(() => ({ cards: remaining }))
      persist(() => api.deleteCard(cardId))
    },

    moveCard: ({ cardId, toColumnId, beforeId, afterId, persist: shouldPersist = true }) => {
      const data = getReadyData()
      if (data == null) return
      const card = data.cards[cardId]
      if (card == null) return
      const newPosition = calculatePositionBetween(data.cards, beforeId, afterId)
      if (card.columnId === toColumnId && card.position === newPosition) return
      const updated = { ...card, columnId: toColumnId, position: newPosition }
      updateData((d) => ({ cards: { ...d.cards, [cardId]: updated } }))
      if (shouldPersist) {
        persist(() => api.persistCard(updated))
      }
    },

    // Column actions
    addColumn: (title) => {
      const data = getReadyData()
      if (data == null || data.activeBoardId == null) return
      const sortedColumns = getSortedColumns(data.columns, data.activeBoardId)
      const lastColumn = sortedColumns[sortedColumns.length - 1]
      const newColumn = createColumn(data.activeBoardId, title, lastColumn?.position ?? null)
      updateData((d) => ({ columns: { ...d.columns, [newColumn.id]: newColumn } }))
      persist(() => api.persistColumn(newColumn))
    },

    updateColumn: (columnId, title) => {
      const data = getReadyData()
      if (data == null) return
      const column = data.columns[columnId]
      if (column == null) return
      const updated = { ...column, title }
      updateData((d) => ({ columns: { ...d.columns, [columnId]: updated } }))
      persist(() => api.persistColumn(updated))
    },

    deleteColumn: (columnId) => {
      const data = getReadyData()
      if (data == null) return
      const remainingColumns = Object.fromEntries(
        Object.entries(data.columns).filter(([id]) => id !== columnId)
      )
      const remainingCards = Object.fromEntries(
        Object.entries(data.cards).filter(([, card]) => card.columnId !== columnId)
      )
      updateData(() => ({ cards: remainingCards, columns: remainingColumns }))
      persist(() => api.deleteColumnCascade(columnId))
    },

    moveColumn: ({ columnId, beforeId, afterId, persist: shouldPersist = true }) => {
      const data = getReadyData()
      if (data == null) return
      const column = data.columns[columnId]
      if (column == null) return
      const newPosition = calculatePositionBetween(data.columns, beforeId, afterId)
      if (column.position === newPosition) return
      const updated = { ...column, position: newPosition }
      updateData((d) => ({ columns: { ...d.columns, [columnId]: updated } }))
      if (shouldPersist) {
        persist(() => api.persistColumn(updated))
      }
    },

    clearMutationError: () => {
      updateData(() => ({ mutationError: null }))
    },

    reset: () => {
      updateData(() => ({ boards: {}, columns: {}, cards: {}, activeBoardId: null }))
      persist(() => api.resetAll())
    },
  }
})

// --- Exports ---

export { useAppStoreV2 }
export type { AppState, ReadyData, AuthUser, MutationError }
