import type { ReactNode } from 'react'
import { useRef } from 'react'
import { DragDropProvider, useDroppable, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'

export type ItemId = string
export type GroupId = string

export type MoveInfo = {
  movedItemId: ItemId
  destGroupId: GroupId
  beforeId: ItemId | null
  afterId: ItemId | null
}

type ProviderProps<TCard, TColumn> = {
  children: ReactNode
  // Cards
  cards: TCard[]
  getCardId: (card: TCard) => ItemId
  getCardGroupId: (card: TCard) => GroupId
  onCardMove: (info: MoveInfo, isEnd: boolean) => void
  // Columns
  columns: TColumn[]
  getColumnId: (column: TColumn) => ItemId
  onColumnMove: (info: MoveInfo, isEnd: boolean) => void
}

export function Provider<TCard, TColumn>({
  children,
  cards,
  getCardId,
  getCardGroupId,
  onCardMove,
  columns,
  getColumnId,
  onColumnMove,
}: ProviderProps<TCard, TColumn>) {
  const cardById = new Map(cards.map(card => [getCardId(card), card]))
  const columnIds = columns.map(getColumnId)
  const lastCardMoveRef = useRef<MoveInfo | null>(null)
  const lastColumnMoveRef = useRef<MoveInfo | null>(null)

  // Card helpers
  const getCardGroup = (cardId: ItemId): GroupId | undefined => {
    const card = cardById.get(cardId)
    return card ? getCardGroupId(card) : undefined
  }

  const getGroupCards = (groupId: GroupId): TCard[] =>
    cards.filter(card => getCardGroupId(card) === groupId)

  const getCardIndex = (cardId: ItemId): number => {
    const card = cardById.get(cardId)
    if (!card) return -1
    const groupCards = getGroupCards(getCardGroupId(card))
    return groupCards.findIndex(c => getCardId(c) === cardId)
  }

  const buildCardMoveInfo = (movedItemId: ItemId, destGroupId: GroupId, toIndex: number): MoveInfo => {
    const groupCards = getGroupCards(destGroupId).filter(card => getCardId(card) !== movedItemId)
    const beforeId = toIndex > 0 ? getCardId(groupCards[toIndex - 1]) : null
    const afterId = groupCards[toIndex] ? getCardId(groupCards[toIndex]) : null
    return { movedItemId, destGroupId, beforeId, afterId }
  }

  // Column helpers
  const getColumnIndex = (columnId: ItemId): number =>
    columns.findIndex(col => getColumnId(col) === columnId)

  const buildColumnMoveInfo = (movedItemId: ItemId, toIndex: number): MoveInfo => {
    const filteredColumns = columns.filter(col => getColumnId(col) !== movedItemId)
    const beforeId = toIndex > 0 ? getColumnId(filteredColumns[toIndex - 1]) : null
    const afterId = filteredColumns[toIndex] ? getColumnId(filteredColumns[toIndex]) : null
    return { movedItemId, destGroupId: 'columns', beforeId, afterId }
  }

  return (
    <DragDropProvider
      sensors={[PointerSensor]}
      onDragOver={(event) => {
        const { source, target } = event.operation
        if (!source || !target || event.operation.canceled) return

        // Handle card drag
        if (source.type === 'card') {
          const movedItemId = source.id as ItemId
          const currentGroup = getCardGroup(movedItemId)
          if (!currentGroup) return

          const isDropOnColumn = columnIds.includes(target.id as GroupId)
          let destGroupId: GroupId
          let toIndex: number

          if (isDropOnColumn) {
            destGroupId = target.id as GroupId
            toIndex = getGroupCards(destGroupId).filter(card => getCardId(card) !== movedItemId).length
          } else if (target.type === 'card') {
            const targetGroup = getCardGroup(target.id as ItemId)
            if (!targetGroup) return
            destGroupId = targetGroup
            toIndex = getCardIndex(target.id as ItemId)
          } else {
            return
          }

          const currentIndex = getCardIndex(movedItemId)
          if (currentGroup === destGroupId && currentIndex === toIndex) return

          const moveInfo = buildCardMoveInfo(movedItemId, destGroupId, toIndex)
          lastCardMoveRef.current = moveInfo
          onCardMove(moveInfo, false)
        }

        // Handle column drag
        if (source.type === 'column' && target.type === 'column') {
          const movedItemId = source.id as ItemId
          const toIndex = getColumnIndex(target.id as ItemId)
          const currentIndex = getColumnIndex(movedItemId)
          if (currentIndex === toIndex) return

          const moveInfo = buildColumnMoveInfo(movedItemId, toIndex)
          lastColumnMoveRef.current = moveInfo
          onColumnMove(moveInfo, false)
        }
      }}
      onDragEnd={(event) => {
        const { source } = event.operation
        if (source?.type === 'card' && lastCardMoveRef.current) {
          onCardMove(lastCardMoveRef.current, true)
        }
        if (source?.type === 'column' && lastColumnMoveRef.current) {
          onColumnMove(lastColumnMoveRef.current, true)
        }
        lastCardMoveRef.current = null
        lastColumnMoveRef.current = null
      }}
    >
      {children}
    </DragDropProvider>
  )
}

// Sortable Card
type SortableCardProps = {
  id: ItemId
  group: GroupId
  index: number
  children: (props: { ref: (el: Element | null) => void; isDragging: boolean }) => ReactNode
}

export function SortableCard({ id, group, index, children }: SortableCardProps) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    group,
    type: 'card',
  })

  return <>{children({ ref, isDragging })}</>
}

// Sortable Column
type SortableColumnProps = {
  id: ItemId
  index: number
  children: (props: { ref: (el: Element | null) => void; isDragging: boolean }) => ReactNode
}

export function SortableColumn({ id, index, children }: SortableColumnProps) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    type: 'column',
  })

  return <>{children({ ref, isDragging })}</>
}

// Droppable (for card drop zones within columns)
type DroppableProps = {
  id: GroupId
  children: (props: { ref: (el: Element | null) => void }) => ReactNode
}

export function Droppable({ id, children }: DroppableProps) {
  const { ref } = useDroppable({
    id,
    type: 'cardDropZone',
    accept: 'card',
    collisionPriority: CollisionPriority.Low,
  })

  return <>{children({ ref })}</>
}
