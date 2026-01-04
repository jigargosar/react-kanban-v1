import type { CardId, Card, ColumnId, Column, BoardId, Board } from './model'

const CARDS_KEY = 'kanban-cards'
const COLUMNS_KEY = 'kanban-columns'
const BOARDS_KEY = 'kanban-boards'
const ACTIVE_BOARD_KEY = 'kanban-active-board'

// Board operations
async function fetchBoards(): Promise<Record<BoardId, Board> | null> {
  const stored = localStorage.getItem(BOARDS_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<BoardId, Board>
}

export async function persistBoard(board: Board): Promise<void> {
  const current = await fetchBoards() ?? {}
  current[board.id] = board
  localStorage.setItem(BOARDS_KEY, JSON.stringify(current))
}

async function deleteBoard(boardId: BoardId): Promise<void> {
  const current = await fetchBoards() ?? {}
  delete current[boardId]
  localStorage.setItem(BOARDS_KEY, JSON.stringify(current))
}

// Card operations
async function fetchCards(): Promise<Record<CardId, Card> | null> {
  const stored = localStorage.getItem(CARDS_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<CardId, Card>
}

export async function persistCard(card: Card): Promise<void> {
  const current = await fetchCards() ?? {}
  current[card.id] = card
  localStorage.setItem(CARDS_KEY, JSON.stringify(current))
}

export async function deleteCard(cardId: CardId): Promise<void> {
  const current = await fetchCards() ?? {}
  delete current[cardId]
  localStorage.setItem(CARDS_KEY, JSON.stringify(current))
}

// Column operations
async function fetchColumns(): Promise<Record<ColumnId, Column> | null> {
  const stored = localStorage.getItem(COLUMNS_KEY)
  if (!stored) return null
  return JSON.parse(stored) as Record<ColumnId, Column>
}

export async function persistColumn(column: Column): Promise<void> {
  const current = await fetchColumns() ?? {}
  current[column.id] = column
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(current))
}

export async function deleteColumnCascade(columnId: ColumnId): Promise<void> {
  // Delete cards in column
  const cards = await fetchCards() ?? {}
  const filteredCards = Object.fromEntries(
    Object.entries(cards).filter(([, card]) => card.columnId !== columnId)
  )
  localStorage.setItem(CARDS_KEY, JSON.stringify(filteredCards))

  // Delete column
  const columns = await fetchColumns() ?? {}
  delete columns[columnId]
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns))
}

// Board cascade delete - removes board, its columns, and their cards
export async function deleteBoardCascade(boardId: BoardId): Promise<void> {
  const columns = await fetchColumns() ?? {}
  const cards = await fetchCards() ?? {}

  // Find columns belonging to this board
  const boardColumnIds = new Set(
    Object.values(columns)
      .filter(col => col.boardId === boardId)
      .map(col => col.id)
  )

  // Filter out cards in those columns
  const filteredCards = Object.fromEntries(
    Object.entries(cards).filter(([, card]) => !boardColumnIds.has(card.columnId))
  )

  // Filter out columns in this board
  const filteredColumns = Object.fromEntries(
    Object.entries(columns).filter(([, col]) => col.boardId !== boardId)
  )

  localStorage.setItem(CARDS_KEY, JSON.stringify(filteredCards))
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(filteredColumns))
  await deleteBoard(boardId)
}

// Active board
async function fetchActiveBoardId(): Promise<BoardId | null> {
  return localStorage.getItem(ACTIVE_BOARD_KEY)
}

export async function persistActiveBoardId(boardId: BoardId): Promise<void> {
  localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
}

// Fetch all data
export async function fetchAll(): Promise<{ boards: Record<BoardId, Board> | null; columns: Record<ColumnId, Column> | null; cards: Record<CardId, Card> | null; activeBoardId: BoardId | null }> {
  const boards = await fetchBoards()
  const columns = await fetchColumns()
  const cards = await fetchCards()
  const activeBoardId = await fetchActiveBoardId()
  return { boards, columns, cards, activeBoardId }
}

// Reset all data
export async function resetAll(): Promise<void> {
  localStorage.removeItem(CARDS_KEY)
  localStorage.removeItem(COLUMNS_KEY)
  localStorage.removeItem(BOARDS_KEY)
  localStorage.removeItem(ACTIVE_BOARD_KEY)
}
