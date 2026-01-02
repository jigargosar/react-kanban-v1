import type { ReactNode } from 'react'
import { useRef } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
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

type ProviderProps<T> = {
  children: ReactNode
  groups: GroupId[]
  items: T[]
  getId: (item: T) => ItemId
  getGroupId: (item: T) => GroupId
  onDndMove: (info: MoveInfo, isEnd: boolean) => void
}

export function Provider<T>({
  children,
  groups,
  items,
  getId,
  getGroupId,
  onDndMove,
}: ProviderProps<T>) {
  // Build lookup maps from items
  const itemById = new Map(items.map(item => [getId(item), item]))

  // Track last move for onMoveEnd
  const lastMoveRef = useRef<MoveInfo | null>(null)

  const getItemGroup = (itemId: ItemId): GroupId | undefined => {
    const item = itemById.get(itemId)
    return item ? getGroupId(item) : undefined
  }

  const getGroupItems = (groupId: GroupId): T[] =>
    items.filter(item => getGroupId(item) === groupId)

  const getItemIndex = (itemId: ItemId): number => {
    const item = itemById.get(itemId)
    if (!item) return -1
    const groupItems = getGroupItems(getGroupId(item))
    return groupItems.findIndex(i => getId(i) === itemId)
  }

  const buildMoveInfo = (movedItemId: ItemId, destGroupId: GroupId, toIndex: number): MoveInfo => {
    const groupItems = getGroupItems(destGroupId).filter(item => getId(item) !== movedItemId)
    const beforeId = toIndex > 0 ? getId(groupItems[toIndex - 1]) : null
    const afterId = groupItems[toIndex] ? getId(groupItems[toIndex]) : null
    return { movedItemId, destGroupId, beforeId, afterId }
  }

  return (
    <DragDropProvider
      onDragOver={(event) => {
        const { source, target } = event.operation
        if (!source || !target || event.operation.canceled) return

        const movedItemId = source.id as ItemId
        const currentGroup = getItemGroup(movedItemId)
        if (!currentGroup) return

        const isDropOnGroup = groups.includes(target.id as GroupId)
        let destGroupId: GroupId
        let toIndex: number

        if (isDropOnGroup) {
          destGroupId = target.id as GroupId
          toIndex = getGroupItems(destGroupId).filter(item => getId(item) !== movedItemId).length
        } else {
          const targetGroup = getItemGroup(target.id as ItemId)
          if (!targetGroup) return
          destGroupId = targetGroup
          toIndex = getItemIndex(target.id as ItemId)
        }

        const currentIndex = getItemIndex(movedItemId)
        if (currentGroup === destGroupId && currentIndex === toIndex) return

        const moveInfo = buildMoveInfo(movedItemId, destGroupId, toIndex)
        lastMoveRef.current = moveInfo
        onDndMove(moveInfo, false)
      }}
      onDragEnd={() => {
        if (lastMoveRef.current) {
          onDndMove(lastMoveRef.current, true)
        }
        lastMoveRef.current = null
      }}
    >
      {children}
    </DragDropProvider>
  )
}

type SortableProps = {
  id: ItemId
  group: GroupId
  index: number
  children: (props: { ref: (el: Element | null) => void; isDragging: boolean }) => ReactNode
}

export function Sortable({ id, group, index, children }: SortableProps) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    group,
    type: 'item',
  })

  return <>{children({ ref, isDragging })}</>
}

type DroppableProps = {
  id: GroupId
  children: (props: { ref: (el: Element | null) => void }) => ReactNode
}

export function Droppable({ id, children }: DroppableProps) {
  const { ref } = useDroppable({
    id,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  })

  return <>{children({ ref })}</>
}
