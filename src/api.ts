import { createClient } from '@supabase/supabase-js'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Card, Column, Board, BoardId } from './model'
import type { Database, Tables, TablesInsert } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (supabaseUrl == null || supabaseAnonKey == null) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

type DbBoard = Tables<'boards'>
type DbColumn = Tables<'columns'>
type DbCard = Tables<'cards'>

const ACTIVE_BOARD_KEY = 'kanban-active-board'

function toRecord<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map(row => [row.id, row]))
}

function toBoard(row: DbBoard): Board {
  return { id: row.id, userId: row.user_id, title: row.title, position: row.position }
}

function toColumn(row: DbColumn): Column {
  return { id: row.id, boardId: row.board_id, title: row.title, position: row.position }
}

function toCard(row: DbCard): Card {
  return { id: row.id, columnId: row.column_id, title: row.title, position: row.position }
}

function fromBoard(board: Board): TablesInsert<'boards'> {
  return { id: board.id, user_id: board.userId, title: board.title, position: board.position }
}

function fromColumn(col: Column): TablesInsert<'columns'> {
  return { id: col.id, board_id: col.boardId, title: col.title, position: col.position }
}

function fromCard(card: Card): TablesInsert<'cards'> {
  return { id: card.id, column_id: card.columnId, title: card.title, position: card.position }
}

// Board operations
export async function persistBoard(board: Board): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .upsert(fromBoard(board))
  if (error != null) throw error
}

// Card operations
export async function persistCard(card: Card): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .upsert(fromCard(card))
  if (error != null) throw error
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
  if (error != null) throw error
}

// Column operations
export async function persistColumn(column: Column): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .upsert(fromColumn(column))
  if (error != null) throw error
}

export async function deleteColumnCascade(columnId: string): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId)
  if (error != null) throw error
}

// Board cascade delete - CASCADE handles columns/cards
export async function deleteBoardCascade(boardId: string): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId)
  if (error != null) throw error
}

// Active board (stays in localStorage - user preference)
export async function persistActiveBoardId(boardId: BoardId): Promise<void> {
  return Promise.resolve().then(() => {
    localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
  })
}

// Fetch all data
export async function fetchAll(): Promise<{
  boards: Record<string, Board>
  columns: Record<string, Column>
  cards: Record<string, Card>
  activeBoardId: BoardId | null
}> {
  const [boardsRes, columnsRes, cardsRes] = await Promise.all([
    supabase.from('boards').select('*'),
    supabase.from('columns').select('*'),
    supabase.from('cards').select('*'),
  ])

  if (boardsRes.error != null) throw boardsRes.error
  if (columnsRes.error != null) throw columnsRes.error
  if (cardsRes.error != null) throw cardsRes.error

  const boards = toRecord(boardsRes.data.map(toBoard))
  const columns = toRecord(columnsRes.data.map(toColumn))
  const cards = toRecord(cardsRes.data.map(toCard))
  const activeBoardId = localStorage.getItem(ACTIVE_BOARD_KEY)

  return { boards, columns, cards, activeBoardId }
}

// Reset all data
export async function resetAll(): Promise<void> {
  const { error } = await supabase.from('boards').delete().not('id', 'is', null)
  if (error != null) throw error
  localStorage.removeItem(ACTIVE_BOARD_KEY)
}

// Auth
export async function signInWithGitHub(): Promise<void> {
  await supabase.auth.signInWithOAuth({ provider: 'github' })
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}
