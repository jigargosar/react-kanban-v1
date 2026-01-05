import { generateKeyBetween } from 'fractional-indexing'

// Types
export type CardId = string
export type ColumnId = string
export type BoardId = string

export type Card = {
  id: CardId
  title: string
  columnId: ColumnId
  position: string
}

export type Column = {
  id: ColumnId
  boardId: BoardId
  title: string
  position: string
}

export type UserId = string

export type Board = {
  id: BoardId
  userId: UserId
  title: string
  position: string
}

export type BoardData = {
  cards: Record<CardId, Card>
  columns: Record<ColumnId, Column>
}

// Card operations
export function createCard(columnId: ColumnId, title: string, lastPosition: string | null): Card {
  return {
    id: crypto.randomUUID(),
    title,
    columnId,
    position: generateKeyBetween(lastPosition, null),
  }
}

// Derive cards for a column, sorted by position
export function getColumnCards(cards: Record<CardId, Card>, columnId: ColumnId): Card[] {
  return Object.values(cards)
    .filter(card => card.columnId === columnId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
}

// Column operations
export function createColumn(boardId: BoardId, title: string, lastPosition: string | null): Column {
  return {
    id: crypto.randomUUID(),
    boardId,
    title,
    position: generateKeyBetween(lastPosition, null),
  }
}

// Get sorted columns for a board
export function getSortedColumns(columns: Record<ColumnId, Column>, boardId: BoardId): Column[] {
  return Object.values(columns)
    .filter(col => col.boardId === boardId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
}

// Board operations
export function createBoard(userId: UserId, title: string, lastPosition: string | null): Board {
  return {
    id: crypto.randomUUID(),
    userId,
    title,
    position: generateKeyBetween(lastPosition, null),
  }
}

// Get sorted boards
export function getSortedBoards(boards: Record<BoardId, Board>): Board[] {
  return Object.values(boards).sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
}

// Calculate position for inserting at target index (legacy)
export function calculatePosition(
  sortedItems: { position: string }[],
  targetIndex: number
): string {
  const before = sortedItems[targetIndex - 1]?.position ?? null
  const after = sortedItems[targetIndex]?.position ?? null
  return generateKeyBetween(before, after)
}

// Calculate position between two items by their ids
export function calculatePositionBetween<T extends { id: string; position: string }>(
  items: Record<string, T>,
  beforeId: string | null,
  afterId: string | null
): string {
  const beforePos = beforeId ? items[beforeId]?.position ?? null : null
  const afterPos = afterId ? items[afterId]?.position ?? null : null
  return generateKeyBetween(beforePos, afterPos)
}

