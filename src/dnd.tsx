import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'
import { useMemo, type ReactNode } from 'react'

// Types
export type MoveInfo = {
  itemId: string
  type: string
  toGroupId: string
  beforeId: string | null
  afterId: string | null
}

type DndType = 'card' | 'column'

// Root component
type RootProps = {
  onDragOver?: (info: MoveInfo) => void
  onDragEnd?: (info: MoveInfo) => void
  children: ReactNode
}

function constructMoveInfo(
  source: { id: unknown; type: unknown },
  target: { id: unknown; type: unknown; data?: { groupId?: string; prevId?: string | null; lastCardId?: string | null } }
): MoveInfo {
  const isColumnTarget = target.type === 'column'
  return {
    itemId: String(source.id),
    type: String(source.type),
    toGroupId: isColumnTarget ? String(target.id) : (target.data?.groupId ?? ''),
    beforeId: isColumnTarget ? (target.data?.lastCardId ?? null) : (target.data?.prevId ?? null),
    afterId: isColumnTarget ? null : String(target.id),
  }
}

export function Root({ onDragOver, onDragEnd, children }: RootProps) {
  return (
    <DragDropProvider
      sensors={[PointerSensor]}
      onDragOver={(event) => {
        if (!onDragOver) return
        const { source, target } = event.operation
        if (!source || !target) return
        if (source.type === 'column') return // columns don't trigger onDragOver
        onDragOver(constructMoveInfo(source, target))
      }}
      onDragEnd={(event) => {
        if (!onDragEnd) return
        if (event.canceled) return
        const { source, target } = event.operation
        if (!source || !target) return
        if (source.id === target.id) return // no movement
        onDragEnd(constructMoveInfo(source, target))
      }}
    >
      {children}
    </DragDropProvider>
  )
}

// List component
type ListProps<T> = {
  items: Record<string, T> | T[]
  getId: (item: T) => string
  group: string
  getGroupId: (item: T) => string
  compare: (a: T, b: T) => number
  type: DndType
  accept?: DndType | DndType[]
  collisionPriority?: CollisionPriority
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

export function List<T>({
  items,
  getId,
  group,
  getGroupId,
  compare,
  type,
  accept,
  collisionPriority,
  children,
}: ListProps<T>) {
  const sortedItems = useMemo(() => {
    const arr = Array.isArray(items) ? items : Object.values(items)
    return arr.filter((item) => getGroupId(item) === group).sort(compare)
  }, [items, group, getGroupId, compare])

  // For columns, we need to pass lastCardId - but we don't have cards here
  // This is handled by the column's useSortable data being set externally
  // Actually, columns need access to cards to compute lastCardId
  // This is a design issue - List doesn't know about other lists' items

  return (
    <>
      {sortedItems.map((item, index) => (
        <ListItem
          key={getId(item)}
          item={item}
          index={index}
          getId={getId}
          group={group}
          prevId={index > 0 ? getId(sortedItems[index - 1]) : null}
          type={type}
          accept={accept}
          collisionPriority={collisionPriority}
        >
          {children}
        </ListItem>
      ))}
    </>
  )
}

// ListItem component (handles useSortable)
type ListItemProps<T> = {
  item: T
  index: number
  getId: (item: T) => string
  group: string
  prevId: string | null
  type: DndType
  accept?: DndType | DndType[]
  collisionPriority?: CollisionPriority
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

function ListItem<T>({
  item,
  index,
  getId,
  group,
  prevId,
  type,
  accept,
  collisionPriority,
  children,
}: ListItemProps<T>) {
  const { ref, isDragging } = useSortable({
    id: getId(item),
    index,
    type,
    accept,
    group: type === 'card' ? group : undefined,
    collisionPriority,
    data: {
      groupId: group,
      prevId,
    },
  })

  return <>{children({ ref, item, isDragging })}</>
}

// Column-specific list that tracks lastCardId
type ColumnListProps<TColumn, TCard> = {
  columns: Record<string, TColumn> | TColumn[]
  cards: Record<string, TCard> | TCard[]
  getColumnId: (column: TColumn) => string
  getCardId: (card: TCard) => string
  getCardColumnId: (card: TCard) => string
  compareColumns: (a: TColumn, b: TColumn) => number
  compareCards: (a: TCard, b: TCard) => number
  accept?: DndType | DndType[]
  collisionPriority?: CollisionPriority
  children: (props: {
    ref: (element: HTMLElement | null) => void
    column: TColumn
    isDragging: boolean
    columnCards: TCard[]
  }) => ReactNode
}

export function ColumnList<TColumn, TCard>({
  columns,
  cards,
  getColumnId,
  getCardId,
  getCardColumnId,
  compareColumns,
  compareCards,
  accept = ['card', 'column'],
  collisionPriority = CollisionPriority.Low,
  children,
}: ColumnListProps<TColumn, TCard>) {
  const sortedColumns = useMemo(() => {
    const arr = Array.isArray(columns) ? columns : Object.values(columns)
    return arr.sort(compareColumns)
  }, [columns, compareColumns])

  const cardsByColumn = useMemo(() => {
    const arr = Array.isArray(cards) ? cards : Object.values(cards)
    const map = new Map<string, TCard[]>()
    for (const card of arr) {
      const columnId = getCardColumnId(card)
      if (!map.has(columnId)) map.set(columnId, [])
      map.get(columnId)!.push(card)
    }
    // Sort each column's cards
    for (const [, columnCards] of map) {
      columnCards.sort(compareCards)
    }
    return map
  }, [cards, getCardColumnId, compareCards])

  return (
    <>
      {sortedColumns.map((column, index) => {
        const columnId = getColumnId(column)
        const columnCards = cardsByColumn.get(columnId) ?? []
        const lastCardId = columnCards.length > 0 ? getCardId(columnCards[columnCards.length - 1]) : null
        const prevColumnId = index > 0 ? getColumnId(sortedColumns[index - 1]) : null

        return (
          <ColumnListItem
            key={columnId}
            column={column}
            index={index}
            columnId={columnId}
            prevColumnId={prevColumnId}
            lastCardId={lastCardId}
            columnCards={columnCards}
            accept={accept}
            collisionPriority={collisionPriority}
          >
            {children}
          </ColumnListItem>
        )
      })}
    </>
  )
}

type ColumnListItemProps<TColumn, TCard> = {
  column: TColumn
  index: number
  columnId: string
  prevColumnId: string | null
  lastCardId: string | null
  columnCards: TCard[]
  accept: DndType | DndType[]
  collisionPriority: CollisionPriority
  children: (props: {
    ref: (element: HTMLElement | null) => void
    column: TColumn
    isDragging: boolean
    columnCards: TCard[]
  }) => ReactNode
}

function ColumnListItem<TColumn, TCard>({
  column,
  index,
  columnId,
  prevColumnId,
  lastCardId,
  columnCards,
  accept,
  collisionPriority,
  children,
}: ColumnListItemProps<TColumn, TCard>) {
  const { ref, isDragging } = useSortable({
    id: columnId,
    index,
    type: 'column',
    accept,
    collisionPriority,
    data: {
      groupId: 'board',
      prevId: prevColumnId,
      lastCardId,
    },
  })

  return <>{children({ ref, column, isDragging, columnCards })}</>
}

// Export as namespace
// eslint-disable-next-line react-refresh/only-export-components
export const Dnd = {
  Root,
  List,
  ColumnList,
}
