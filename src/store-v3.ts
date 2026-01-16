import { model, Model, prop, modelAction, modelFlow, idProp, _async, _await, registerRootStore } from 'mobx-keystone'
import { computed } from 'mobx'
import { createContext, useContext } from 'react'
import { generateKeyBetween } from 'fractional-indexing'
import * as api from './api'
import type { BoardId, CardId, ColumnId, UserId } from './model'

// --- Persist Queue ---

function createPersistQueue(onError: (e: unknown) => void) {
  let pending = Promise.resolve()
  return function persist(fn: () => Promise<void>): void {
    const result = pending.then(fn)
    pending = result.then(() => {}, () => {})
    result.catch(onError)
  }
}

// --- Entity Models ---

@model('kanban/User')
class User extends Model({
  id: idProp,
  name: prop<string | null>(null),
}) {}

@model('kanban/Board')
class Board extends Model({
  id: idProp,
  userId: prop<UserId>(),
  title: prop<string>(),
  position: prop<string>(),
}) {
  @modelAction
  update(title: string): void {
    this.title = title
  }
}

@model('kanban/Column')
class Column extends Model({
  id: idProp,
  boardId: prop<BoardId>(),
  title: prop<string>(),
  position: prop<string>(),
}) {
  @modelAction
  update(title: string): void {
    this.title = title
  }

  @modelAction
  setPosition(position: string): void {
    this.position = position
  }
}

@model('kanban/Card')
class Card extends Model({
  id: idProp,
  columnId: prop<ColumnId>(),
  title: prop<string>(),
  position: prop<string>(),
}) {
  @modelAction
  update(title: string): void {
    this.title = title
  }

  @modelAction
  moveTo(columnId: ColumnId, position: string): void {
    this.columnId = columnId
    this.position = position
  }
}

// --- AppData ---

@model('kanban/AppData')
class AppData extends Model({
  activeBoardId: prop<BoardId | null>(null),
  mutationError: prop<string | null>(null),
  boards: prop<Record<BoardId, Board>>(() => ({})),
  columns: prop<Record<ColumnId, Column>>(() => ({})),
  cards: prop<Record<CardId, Card>>(() => ({})),
}) {
  private persist = createPersistQueue((e) => {
    this.setMutationError(e instanceof Error ? e.message : 'Unknown error')
  })

  // --- Error ---
  @modelAction
  setMutationError(message: string): void {
    this.mutationError = message
  }

  @modelAction
  clearMutationError(): void {
    this.mutationError = null
  }

  // --- Board Selection ---
  @modelAction
  setActiveBoard(boardId: BoardId): void {
    this.activeBoardId = boardId
    this.persist(() => api.persistActiveBoardId(boardId))
  }

  // --- Board ---
  @modelAction
  addBoard(userId: UserId, title: string): void {
    const sorted = this.sortedBoards
    const lastPos = sorted[sorted.length - 1]?.position ?? null
    const board = new Board({
      id: crypto.randomUUID(),
      userId,
      title,
      position: generateKeyBetween(lastPos, null),
    })
    this.boards[board.id] = board
    this.activeBoardId = board.id
    this.persist(() => api.persistBoard({
      id: board.id,
      userId: board.userId,
      title: board.title,
      position: board.position,
    }))
    this.persist(() => api.persistActiveBoardId(board.id))
  }

  @modelAction
  updateBoard(boardId: BoardId, title: string): void {
    const board = this.boards[boardId]
    if (board == null) return
    board.update(title)
    this.persist(() => api.persistBoard({
      id: board.id,
      userId: board.userId,
      title: board.title,
      position: board.position,
    }))
  }

  @modelAction
  deleteBoard(boardId: BoardId): void {
    const boardColumnIds = new Set(
      Object.values(this.columns)
        .filter(col => col.boardId === boardId)
        .map(col => col.id)
    )

    // Remove cards in those columns
    this.cards = Object.fromEntries(
      Object.entries(this.cards).filter(([, card]) => !boardColumnIds.has(card.columnId))
    )

    // Remove columns
    this.columns = Object.fromEntries(
      Object.entries(this.columns).filter(([, col]) => col.boardId !== boardId)
    )

    // Remove board
    this.boards = Object.fromEntries(
      Object.entries(this.boards).filter(([id]) => id !== boardId)
    )

    // Update active board
    if (this.activeBoardId === boardId) {
      const sorted = this.sortedBoards
      this.activeBoardId = sorted[0]?.id ?? null
    }

    this.persist(() => api.deleteBoardCascade(boardId))
  }

  // --- Column ---
  @modelAction
  addColumn(title: string): void {
    if (this.activeBoardId == null) return
    const sorted = this.getColumnsForBoard(this.activeBoardId)
    const lastPos = sorted[sorted.length - 1]?.position ?? null
    const column = new Column({
      id: crypto.randomUUID(),
      boardId: this.activeBoardId,
      title,
      position: generateKeyBetween(lastPos, null),
    })
    this.columns[column.id] = column
    this.persist(() => api.persistColumn({
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      position: column.position,
    }))
  }

  @modelAction
  updateColumn(columnId: ColumnId, title: string): void {
    const column = this.columns[columnId]
    if (column == null) return
    column.update(title)
    this.persist(() => api.persistColumn({
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      position: column.position,
    }))
  }

  @modelAction
  deleteColumn(columnId: ColumnId): void {
    // Remove cards in column
    this.cards = Object.fromEntries(
      Object.entries(this.cards).filter(([, card]) => card.columnId !== columnId)
    )
    this.columns = Object.fromEntries(
      Object.entries(this.columns).filter(([id]) => id !== columnId)
    )
    this.persist(() => api.deleteColumnCascade(columnId))
  }

  @modelAction
  moveColumn(columnId: ColumnId, beforeId: ColumnId | null, afterId: ColumnId | null, shouldPersist = true): void {
    const column = this.columns[columnId]
    if (column == null) return
    const beforePos = beforeId != null ? this.columns[beforeId]?.position ?? null : null
    const afterPos = afterId != null ? this.columns[afterId]?.position ?? null : null
    const newPosition = generateKeyBetween(beforePos, afterPos)
    if (column.position === newPosition) return
    column.setPosition(newPosition)
    if (shouldPersist) {
      this.persist(() => api.persistColumn({
        id: column.id,
        boardId: column.boardId,
        title: column.title,
        position: column.position,
      }))
    }
  }

  // --- Card ---
  @modelAction
  addCard(columnId: ColumnId, title: string): void {
    const sorted = this.getCardsForColumn(columnId)
    const lastPos = sorted[sorted.length - 1]?.position ?? null
    const card = new Card({
      id: crypto.randomUUID(),
      columnId,
      title,
      position: generateKeyBetween(lastPos, null),
    })
    this.cards[card.id] = card
    this.persist(() => api.persistCard({
      id: card.id,
      columnId: card.columnId,
      title: card.title,
      position: card.position,
    }))
  }

  @modelAction
  updateCard(cardId: CardId, title: string): void {
    const card = this.cards[cardId]
    if (card == null) return
    card.update(title)
    this.persist(() => api.persistCard({
      id: card.id,
      columnId: card.columnId,
      title: card.title,
      position: card.position,
    }))
  }

  @modelAction
  deleteCard(cardId: CardId): void {
    this.cards = Object.fromEntries(
      Object.entries(this.cards).filter(([id]) => id !== cardId)
    )
    this.persist(() => api.deleteCard(cardId))
  }

  @modelAction
  moveCard(cardId: CardId, toColumnId: ColumnId, beforeId: CardId | null, afterId: CardId | null, shouldPersist = true): void {
    const card = this.cards[cardId]
    if (card == null) return
    const beforePos = beforeId != null ? this.cards[beforeId]?.position ?? null : null
    const afterPos = afterId != null ? this.cards[afterId]?.position ?? null : null
    const newPosition = generateKeyBetween(beforePos, afterPos)
    if (card.columnId === toColumnId && card.position === newPosition) return
    card.moveTo(toColumnId, newPosition)
    if (shouldPersist) {
      this.persist(() => api.persistCard({
        id: card.id,
        columnId: card.columnId,
        title: card.title,
        position: card.position,
      }))
    }
  }

  // --- Reset ---
  @modelAction
  reset(): void {
    this.boards = {}
    this.columns = {}
    this.cards = {}
    this.activeBoardId = null
    this.persist(() => api.resetAll())
  }

  // --- Derived ---
  @computed
  get sortedBoards(): Board[] {
    return Object.values(this.boards).sort((a, b) =>
      a.position < b.position ? -1 : a.position > b.position ? 1 : 0
    )
  }

  @computed
  get activeBoard(): Board | null {
    return this.activeBoardId != null ? this.boards[this.activeBoardId] ?? null : null
  }

  getColumnsForBoard(boardId: BoardId): Column[] {
    return Object.values(this.columns)
      .filter(col => col.boardId === boardId)
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
  }

  getCardsForColumn(columnId: ColumnId): Card[] {
    return Object.values(this.cards)
      .filter(card => card.columnId === columnId)
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
  }
}

// --- AppState Variants ---

@model('kanban/InitializingState')
class InitializingState extends Model({}) {}

@model('kanban/UnauthenticatedState')
class UnauthenticatedState extends Model({}) {
  signIn(): void {
    api.signInWithGitHub().catch((e: unknown) => {
      console.error('[AUTH] signIn failed', e)
    })
  }
}

@model('kanban/LoadingState')
class LoadingState extends Model({
  userId: prop<string>(),
  userName: prop<string | null>(),
}) {}

@model('kanban/ReadyState')
class ReadyState extends Model({
  userId: prop<string>(),
  userName: prop<string | null>(),
  data: prop<AppData>(),
}) {
  @modelAction
  updateUserName(name: string | null): void {
    this.userName = name
  }

  signOut(): void {
    api.signOut().catch((e: unknown) => {
      console.error('[AUTH] signOut failed', e)
      this.data.setMutationError(e instanceof Error ? e.message : 'Sign out failed')
    })
  }
}

type AppState = InitializingState | UnauthenticatedState | LoadingState | ReadyState

// --- RootStore ---

@model('kanban/RootStore')
class RootStore extends Model({
  state: prop<AppState>(() => new InitializingState({})),
}) {
  @modelAction
  private setUnauthenticated(): void {
    this.state = new UnauthenticatedState({})
  }

  @modelAction
  private setLoading(userId: string, userName: string | null): void {
    this.state = new LoadingState({ userId, userName })
  }

  @modelAction
  private setReady(userId: string, userName: string | null, data: AppData): void {
    this.state = new ReadyState({ userId, userName, data })
  }

  @modelFlow
  private loadUserData = _async(function* (this: RootStore, userId: string, userName: string | null) {
    this.setLoading(userId, userName)

    try {
      const { boards, columns, cards, activeBoardId: storedActiveBoardId } = yield* _await(api.fetchAll())

      // Convert plain objects to models
      const boardModels: Record<BoardId, Board> = {}
      for (const [id, b] of Object.entries(boards)) {
        boardModels[id] = new Board({ id: b.id, userId: b.userId, title: b.title, position: b.position })
      }

      const columnModels: Record<ColumnId, Column> = {}
      for (const [id, c] of Object.entries(columns)) {
        columnModels[id] = new Column({ id: c.id, boardId: c.boardId, title: c.title, position: c.position })
      }

      const cardModels: Record<CardId, Card> = {}
      for (const [id, c] of Object.entries(cards)) {
        cardModels[id] = new Card({ id: c.id, columnId: c.columnId, title: c.title, position: c.position })
      }

      const sortedBoards = Object.values(boardModels).sort((a, b) =>
        a.position < b.position ? -1 : a.position > b.position ? 1 : 0
      )
      const firstBoard = sortedBoards[0]
      const activeBoardId = (storedActiveBoardId != null && boardModels[storedActiveBoardId] != null)
        ? storedActiveBoardId
        : (firstBoard?.id ?? null)

      const data = new AppData({
        boards: boardModels,
        columns: columnModels,
        cards: cardModels,
        activeBoardId,
        mutationError: null,
      })

      this.setReady(userId, userName, data)
    } catch (e: unknown) {
      const data = new AppData({
        boards: {},
        columns: {},
        cards: {},
        activeBoardId: null,
        mutationError: e instanceof Error ? e.message : 'Failed to load data',
      })
      this.setReady(userId, userName, data)
    }
  })

  initAuth(): () => void {
    return api.onAuthStateChange((event, session) => {
      const prevUserId = this.state instanceof ReadyState ? this.state.userId : null
      const newUser = session?.user
      const userId = newUser?.id ?? null
      const userName = newUser != null
        ? (newUser.user_metadata.user_name as string | undefined) ?? newUser.email ?? null
        : null

      switch (event) {
        case 'INITIAL_SESSION':
          console.log('[AUTH] INITIAL_SESSION', { userId, sessionExists: session != null })
          if (userId != null) {
            void this.loadUserData(userId, userName)
          } else {
            this.setUnauthenticated()
          }
          break

        case 'SIGNED_IN':
          console.log('[AUTH] SIGNED_IN', { prevUserId, newUserId: userId })
          if (userId != null && prevUserId !== userId) {
            void this.loadUserData(userId, userName)
          }
          break

        case 'SIGNED_OUT':
          console.log('[AUTH] SIGNED_OUT', { prevUserId })
          this.setUnauthenticated()
          break

        case 'TOKEN_REFRESHED':
          console.log('[AUTH] TOKEN_REFRESHED', { userId })
          break

        case 'USER_UPDATED':
          console.log('[AUTH] USER_UPDATED', { userId })
          if (userId != null && this.state instanceof ReadyState) {
            this.state.updateUserName(userName)
          }
          break

        case 'PASSWORD_RECOVERY':
          console.log('[AUTH] PASSWORD_RECOVERY', { userId })
          break
      }
    })
  }
}

// --- Store Instance & Context ---

const rootStore = new RootStore({})
registerRootStore(rootStore)

const StoreContext = createContext<RootStore>(rootStore)

function useStore(): RootStore {
  return useContext(StoreContext)
}

// --- Exports ---

export {
  rootStore,
  useStore,
  RootStore,
  AppData,
  User,
  Board,
  Column,
  Card,
  InitializingState,
  UnauthenticatedState,
  LoadingState,
  ReadyState,
}
export type { AppState }
