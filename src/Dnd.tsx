import type { ReactNode } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'

export type ItemId = string
export type GroupId = string

export type MoveInfo = {
  itemId: ItemId
  toGroupId: GroupId
  toIndex: number
}

type ProviderProps<T> = {
  children: ReactNode
  groups: GroupId[]
  items: T[]
  getId: (item: T) => ItemId
  getGroupId: (item: T) => GroupId
  onMove: (info: MoveInfo) => void
}

export function Provider<T>({
  children,
  groups,
  items,
  getId,
  getGroupId,
  onMove,
}: ProviderProps<T>) {
  // Build lookup maps from items
  const itemById = new Map(items.map(item => [getId(item), item]))

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

  return (
    <DragDropProvider
      onDragOver={(event) => {
        const { source, target } = event.operation
        if (!source || !target || event.operation.canceled) return

        const itemId = source.id as ItemId
        const currentGroup = getItemGroup(itemId)
        if (!currentGroup) return

        const isDropOnGroup = groups.includes(target.id as GroupId)
        let toGroupId: GroupId
        let toIndex: number

        if (isDropOnGroup) {
          toGroupId = target.id as GroupId
          toIndex = getGroupItems(toGroupId).length
        } else {
          const targetGroup = getItemGroup(target.id as ItemId)
          if (!targetGroup) return
          toGroupId = targetGroup
          toIndex = getItemIndex(target.id as ItemId)
        }

        const currentIndex = getItemIndex(itemId)
        if (currentGroup === toGroupId && currentIndex === toIndex) return

        onMove({ itemId, toGroupId, toIndex })
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
