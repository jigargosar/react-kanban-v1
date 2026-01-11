import { useMemo } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
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

// ============================================================================
// State Machine Types
// ============================================================================

type User = { id: UserId; name: string | null }

// Editing targets
type EditingTarget =
  | { type: 'Card'; cardId: CardId }
  | { type: 'Column'; columnId: ColumnId }
  | { type: 'Board'; boardId: BoardId }

// Interaction sub-states (within HasBoard)
type InteractionState =
  | { type: 'Idle' }
  | { type: 'Editing'; editing: EditingTarget }

// Board data (only exists in HasBoard state)
type BoardData = {
  boards: Record<BoardId, Board>
  columns: Record<ColumnId, Column>
  cards: Record<CardId, Card>
  activeBoardId: BoardId
  searchTerm: string
}

// Ready sub-states
type ReadyState =
  | { type: 'NoBoard' }
  | { type: 'HasBoard'; data: BoardData; interaction: InteractionState }

// App State (top level discriminated union)
type AppState =
  | { type: 'Initial' }
  | { type: 'AuthLoading' }
  | { type: 'LoggedOut' }
  | { type: 'LoggedIn'; user: User }
  | { type: 'DataLoading'; user: User }
  | { type: 'Ready'; user: User; ready: ReadyState; error: string | null }

// ============================================================================
// Actions
// ============================================================================

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
  moveCard: (params: { cardId: string; toColumnId: string; beforeId: string | null; afterId: string | null; persist?: boolean }) => void
  // Column actions
  addColumn: (title: string) => void
  updateColumn: (columnId: ColumnId, title: string) => void
  deleteColumn: (columnId: ColumnId) => void
  moveColumn: (params: { columnId: string; beforeId: string | null; afterId: string | null; persist?: boolean }) => void
  // Editing
  startEditing: (type: 'card' | 'column' | 'board', id: string) => void
  stopEditing: () => void
  // Search
  setSearchTerm: (term: string) => void
  // Other
  reset: () => void
  clearError: () => void
}

type Store = { state: AppState } & AppActions

// ============================================================================
// Store
// ============================================================================

export const useAppStore = create<Store>()(immer((set, get) => {
  // ==========================================================================
  // Pattern Matching Wrappers
  // ==========================================================================

  // Only runs when: Ready > HasBoard > Idle
  const onIdle = (fn: (data: BoardData) => void) => {
    set(s => {
      if (s.state.type === 'Ready' &&
          s.state.ready.type === 'HasBoard' &&
          s.state.ready.interaction.type === 'Idle') {
        fn(s.state.ready.data)
      }
    })
  }

  // Only runs when: Ready > HasBoard (any interaction)
  const onHasBoard = (fn: (data: BoardData) => void) => {
    set(s => {
      if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
        fn(s.state.ready.data)
      }
    })
  }

  // Only runs when: Ready (NoBoard or HasBoard)
  const onReady = (fn: (state: Extract<AppState, { type: 'Ready' }>) => void) => {
    set(s => {
      if (s.state.type === 'Ready') {
        fn(s.state)
      }
    })
  }

  // For actions that modify interaction state from Idle
  const onIdleInteraction = (fn: (ready: Extract<ReadyState, { type: 'HasBoard' }>) => void) => {
    set(s => {
      if (s.state.type === 'Ready' &&
          s.state.ready.type === 'HasBoard' &&
          s.state.ready.interaction.type === 'Idle') {
        fn(s.state.ready)
      }
    })
  }

  // For actions that modify interaction state from Editing
  const onEditing = (fn: (ready: Extract<ReadyState, { type: 'HasBoard' }>) => void) => {
    set(s => {
      if (s.state.type === 'Ready' &&
          s.state.ready.type === 'HasBoard' &&
          s.state.ready.interaction.type === 'Editing') {
        fn(s.state.ready)
      }
    })
  }

  // ==========================================================================
  // Persist Helper
  // ==========================================================================

  const persistAsync = (fn: () => Promise<void>) => {
    enqueue(fn).catch((e: unknown) => {
      onReady(state => {
        state.error = e instanceof Error ? e.message : 'Unknown error'
      })
    })
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  return {
    state: { type: 'Initial' },

    initAuth: () => {
      set(s => { s.state = { type: 'AuthLoading' } })

      return api.onAuthStateChange((event, session) => {
        const currentState = get().state
        const newUser = session?.user
        const userData: User | null = newUser != null
          ? { id: newUser.id, name: (newUser.user_metadata.user_name as string | undefined) ?? newUser.email ?? null }
          : null

        switch (event) {
          case 'INITIAL_SESSION':
            console.log('[AUTH] INITIAL_SESSION', { userId: userData?.id ?? null })
            if (userData != null) {
              set(s => { s.state = { type: 'DataLoading', user: userData } })
              loadData(userData)
            } else {
              set(s => { s.state = { type: 'LoggedOut' } })
            }
            break

          case 'SIGNED_IN':
            console.log('[AUTH] SIGNED_IN', { newUserId: userData?.id ?? null })
            if (userData != null) {
              if (currentState.type === 'Ready' && currentState.user.id === userData.id) {
                return
              }
              set(s => { s.state = { type: 'DataLoading', user: userData } })
              loadData(userData)
            }
            break

          case 'SIGNED_OUT':
            console.log('[AUTH] SIGNED_OUT')
            set(s => { s.state = { type: 'LoggedOut' } })
            break

          case 'TOKEN_REFRESHED':
            console.log('[AUTH] TOKEN_REFRESHED')
            break

          case 'USER_UPDATED':
            console.log('[AUTH] USER_UPDATED')
            if (userData != null && currentState.type === 'Ready') {
              set(s => {
                if (s.state.type === 'Ready') {
                  s.state.user = userData
                }
              })
            }
            break

          case 'PASSWORD_RECOVERY':
            console.log('[AUTH] PASSWORD_RECOVERY')
            break
        }
      })

      function loadData(user: User) {
        api.fetchAll()
          .then(({ boards, columns, cards, activeBoardId: storedActiveBoardId }) => {
            const currentState = get().state
            if (currentState.type !== 'DataLoading') return

            const sortedBoards = getSortedBoards(boards)
            const firstBoard = sortedBoards[0]
            const activeBoardId = (storedActiveBoardId != null && boards[storedActiveBoardId] != null)
              ? storedActiveBoardId
              : (firstBoard?.id ?? null)

            if (activeBoardId != null) {
              set(s => {
                s.state = {
                  type: 'Ready',
                  user,
                  ready: {
                    type: 'HasBoard',
                    data: { boards, columns, cards, activeBoardId, searchTerm: '' },
                    interaction: { type: 'Idle' },
                  },
                  error: null,
                }
              })
            } else {
              set(s => {
                s.state = {
                  type: 'Ready',
                  user,
                  ready: { type: 'NoBoard' },
                  error: null,
                }
              })
            }
          })
          .catch((e: unknown) => {
            console.error('[LOAD] Failed', e)
            set(s => { s.state = { type: 'LoggedIn', user } })
          })
      }
    },

    signIn: () => {
      api.signInWithGitHub().catch((e: unknown) => {
        console.error('[AUTH] signIn failed', e)
      })
    },

    signOut: () => {
      api.signOut().catch((e: unknown) => {
        console.error('[AUTH] signOut failed', e)
      })
    },

    addBoard: (title) => {
      const state = get().state
      if (state.type !== 'Ready') return

      const existingBoards = state.ready.type === 'HasBoard' ? state.ready.data.boards : {}
      const sortedBoards = getSortedBoards(existingBoards)
      const lastBoard = sortedBoards[sortedBoards.length - 1]
      const newBoard = createBoard(state.user.id, title, lastBoard?.position ?? null)

      console.log('[ADD_BOARD] Adding board:', newBoard.id, 'title:', title)

      if (state.ready.type === 'HasBoard') {
        onHasBoard(data => {
          data.boards[newBoard.id] = newBoard
          data.activeBoardId = newBoard.id
        })
      } else {
        set(s => {
          if (s.state.type === 'Ready') {
            s.state.ready = {
              type: 'HasBoard',
              data: {
                boards: { [newBoard.id]: newBoard },
                columns: {},
                cards: {},
                activeBoardId: newBoard.id,
                searchTerm: '',
              },
              interaction: { type: 'Idle' },
            }
          }
        })
      }

      persistAsync(() => api.persistBoard(newBoard))
      persistAsync(() => api.persistActiveBoardId(newBoard.id))
    },

    updateBoard: (boardId, title) => {
      let updated: Board | null = null
      onHasBoard(data => {
        const board = data.boards[boardId]
        if (board) {
          board.title = title
          updated = { ...board }
        }
      })
      if (updated) {
        console.log('[UPDATE_BOARD] boardId:', boardId, 'title:', title)
        persistAsync(() => api.persistBoard(updated!))
      }
    },

    deleteBoard: (boardId) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return

      const { boards, columns, cards, activeBoardId } = state.ready.data

      const boardColumnIds = new Set(
        Object.values(columns)
          .filter(col => col.boardId === boardId)
          .map(col => col.id)
      )

      const remainingCards = Object.fromEntries(
        Object.entries(cards).filter(([, card]) => !boardColumnIds.has(card.columnId))
      )

      const remainingColumns = Object.fromEntries(
        Object.entries(columns).filter(([, col]) => col.boardId !== boardId)
      )

      const remainingBoards = Object.fromEntries(
        Object.entries(boards).filter(([id]) => id !== boardId)
      )

      if (Object.keys(remainingBoards).length === 0) {
        set(s => {
          if (s.state.type === 'Ready') {
            s.state.ready = { type: 'NoBoard' }
          }
        })
      } else {
        let newActiveBoardId = activeBoardId
        if (activeBoardId === boardId) {
          const sorted = getSortedBoards(remainingBoards)
          newActiveBoardId = sorted[0]?.id ?? activeBoardId
        }

        set(s => {
          if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
            s.state.ready.data.boards = remainingBoards
            s.state.ready.data.columns = remainingColumns
            s.state.ready.data.cards = remainingCards
            s.state.ready.data.activeBoardId = newActiveBoardId
          }
        })
      }

      persistAsync(() => api.deleteBoardCascade(boardId))
    },

    setActiveBoard: (boardId) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return
      if (state.ready.data.boards[boardId] == null) return

      onHasBoard(data => {
        data.activeBoardId = boardId
      })
      persistAsync(() => api.persistActiveBoardId(boardId))
    },

    addCard: (columnId, title) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return
      if (state.ready.interaction.type !== 'Idle') return

      const columnCards = getColumnCards(state.ready.data.cards, columnId)
      const lastCard = columnCards[columnCards.length - 1]
      const newCard = createCard(columnId, title, lastCard?.position ?? null)

      onIdle(data => {
        data.cards[newCard.id] = newCard
      })

      persistAsync(() => api.persistCard(newCard))
    },

    updateCard: (cardId, title) => {
      let updated: Card | null = null
      onHasBoard(data => {
        const card = data.cards[cardId]
        if (card) {
          card.title = title
          updated = { ...card }
        }
      })
      if (updated) {
        persistAsync(() => api.persistCard(updated!))
      }
    },

    deleteCard: (cardId) => {
      onHasBoard(data => {
        delete data.cards[cardId]
      })
      persistAsync(() => api.deleteCard(cardId))
    },

    moveCard: ({ cardId, toColumnId, beforeId, afterId, persist: shouldPersist = true }) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return

      const card = state.ready.data.cards[cardId]
      if (card == null) return

      const newPosition = calculatePositionBetween(state.ready.data.cards, beforeId, afterId)
      if (card.columnId === toColumnId && card.position === newPosition) return

      let updated: Card | null = null
      onHasBoard(data => {
        const c = data.cards[cardId]
        if (c) {
          c.columnId = toColumnId
          c.position = newPosition
          updated = { ...c }
        }
      })

      if (shouldPersist && updated) {
        persistAsync(() => api.persistCard(updated!))
      }
    },

    addColumn: (title) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return
      if (state.ready.interaction.type !== 'Idle') return

      const { columns, activeBoardId } = state.ready.data
      const sortedColumns = getSortedColumns(columns, activeBoardId)
      const lastColumn = sortedColumns[sortedColumns.length - 1]
      const newColumn = createColumn(activeBoardId, title, lastColumn?.position ?? null)

      onIdle(data => {
        data.columns[newColumn.id] = newColumn
      })

      persistAsync(() => api.persistColumn(newColumn))
    },

    updateColumn: (columnId, title) => {
      let updated: Column | null = null
      onHasBoard(data => {
        const column = data.columns[columnId]
        if (column) {
          column.title = title
          updated = { ...column }
        }
      })
      if (updated) {
        persistAsync(() => api.persistColumn(updated!))
      }
    },

    deleteColumn: (columnId) => {
      onHasBoard(data => {
        // Delete cards in column first
        for (const cardId of Object.keys(data.cards)) {
          if (data.cards[cardId].columnId === columnId) {
            delete data.cards[cardId]
          }
        }
        delete data.columns[columnId]
      })
      persistAsync(() => api.deleteColumnCascade(columnId))
    },

    moveColumn: ({ columnId, beforeId, afterId, persist: shouldPersist = true }) => {
      const state = get().state
      if (state.type !== 'Ready' || state.ready.type !== 'HasBoard') return

      const column = state.ready.data.columns[columnId]
      if (column == null) return

      const newPosition = calculatePositionBetween(state.ready.data.columns, beforeId, afterId)
      if (column.position === newPosition) return

      let updated: Column | null = null
      onHasBoard(data => {
        const c = data.columns[columnId]
        if (c) {
          c.position = newPosition
          updated = { ...c }
        }
      })

      if (shouldPersist && updated) {
        persistAsync(() => api.persistColumn(updated!))
      }
    },

    startEditing: (type, id) => {
      let editing: EditingTarget
      switch (type) {
        case 'card':
          editing = { type: 'Card', cardId: id }
          break
        case 'column':
          editing = { type: 'Column', columnId: id }
          break
        case 'board':
          editing = { type: 'Board', boardId: id }
          break
      }

      onIdleInteraction(ready => {
        ready.interaction = { type: 'Editing', editing }
      })
    },

    stopEditing: () => {
      onEditing(ready => {
        ready.interaction = { type: 'Idle' }
      })
    },

    setSearchTerm: (term) => {
      onHasBoard(data => {
        data.searchTerm = term
      })
    },

    reset: () => {
      console.log('[RESET] Clearing state and queueing API call')

      set(s => {
        if (s.state.type === 'Ready') {
          s.state.ready = { type: 'NoBoard' }
        }
      })

      persistAsync(() => api.resetAll())
    },

    clearError: () => {
      onReady(state => {
        state.error = null
      })
    },
  }
}))

// ============================================================================
// Selector Hooks (backwards compatibility)
// ============================================================================

// Legacy editing format for App.tsx compatibility
type LegacyEditing =
  | { type: 'card'; id: CardId }
  | { type: 'column'; id: ColumnId }
  | { type: 'board'; id: BoardId }
  | null

// Stable empty references to avoid infinite loops in selectors
const EMPTY_BOARDS: Record<BoardId, Board> = {}
const EMPTY_COLUMNS: Record<ColumnId, Column> = {}
const EMPTY_CARDS: Record<CardId, Card> = {}

export function useBoards(): Record<BoardId, Board> {
  return useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      return s.state.ready.data.boards
    }
    return EMPTY_BOARDS
  })
}

export function useColumns(): Record<ColumnId, Column> {
  return useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      return s.state.ready.data.columns
    }
    return EMPTY_COLUMNS
  })
}

export function useCards(): Record<CardId, Card> {
  return useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      return s.state.ready.data.cards
    }
    return EMPTY_CARDS
  })
}

export function useActiveBoardId(): BoardId | null {
  return useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      return s.state.ready.data.activeBoardId
    }
    return null
  })
}

export function useSearchTerm(): string {
  return useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      return s.state.ready.data.searchTerm
    }
    return ''
  })
}

// Use separate selectors for primitives, memoize the result object
export function useEditing(): LegacyEditing {
  const editingType = useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard' && s.state.ready.interaction.type === 'Editing') {
      return s.state.ready.interaction.editing.type
    }
    return null
  })
  const editingId = useAppStore((s) => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard' && s.state.ready.interaction.type === 'Editing') {
      const editing = s.state.ready.interaction.editing
      switch (editing.type) {
        case 'Card': return editing.cardId
        case 'Column': return editing.columnId
        case 'Board': return editing.boardId
      }
    }
    return null
  })

  return useMemo(() => {
    if (editingType == null || editingId == null) return null

    switch (editingType) {
      case 'Card': return { type: 'card' as const, id: editingId }
      case 'Column': return { type: 'column' as const, id: editingId }
      case 'Board': return { type: 'board' as const, id: editingId }
    }
  }, [editingType, editingId])
}

export function useUser(): User | null {
  return useAppStore((s) => {
    const state = s.state
    if (state.type === 'LoggedIn' || state.type === 'DataLoading' || state.type === 'Ready') {
      return state.user
    }
    return null
  })
}

export function useAuthLoading(): boolean {
  return useAppStore((s) => s.state.type === 'AuthLoading' || s.state.type === 'Initial')
}

export function useDataLoading(): boolean {
  return useAppStore((s) => s.state.type === 'DataLoading')
}

export function useError(): string | null {
  return useAppStore((s) => {
    if (s.state.type === 'Ready') {
      return s.state.error
    }
    return null
  })
}

export function useIsLoggedOut(): boolean {
  return useAppStore((s) => s.state.type === 'LoggedOut')
}
