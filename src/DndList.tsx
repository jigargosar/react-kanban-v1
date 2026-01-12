/* eslint-disable react-refresh/only-export-components */
import { type ReactNode, useMemo } from 'react'
import { DragDropProvider, PointerSensor, useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { type CollisionPriority, CollisionPriority as CP } from '@dnd-kit/abstract'

export type MoveInfo = {
  itemId: string
  draggableTypeId: string
  toGroupId: string
  beforeId: string | null
  afterId: string | null
}

type RootConfig = {
  onDragOver: (info: MoveInfo) => void
  onDragEnd: (info: MoveInfo) => void
}

type RootProps = {
  config: RootConfig
  children: ReactNode
}

const GROUP_TYPE = Symbol('dndlist-group')

function constructMoveInfo(
  source: { id: unknown; type: unknown },
  target: { id: unknown; type: unknown; data?: { groupId?: string; prevId?: string | null; lastChildId?: string | null } }
): MoveInfo {
  const targetData = target.data ?? {}
  const isGroupTarget = target.type === GROUP_TYPE
  const isParentTarget = targetData.lastChildId !== undefined

  return {
    itemId: String(source.id),
    draggableTypeId: String(source.type),
    toGroupId: isGroupTarget ? String(target.id) : (isParentTarget ? String(target.id) : (targetData.groupId ?? '')),
    beforeId: isGroupTarget ? null : (isParentTarget ? (targetData.lastChildId ?? null) : (targetData.prevId ?? null)),
    afterId: isGroupTarget || isParentTarget ? null : String(target.id),
  }
}

function Root({ config, children }: RootProps) {
  const { onDragOver, onDragEnd } = config

  return (
    <DragDropProvider
      sensors={[PointerSensor]}
      onDragOver={(event) => {
        const { source, target } = event.operation
        if (source == null || target == null) return
        onDragOver(constructMoveInfo(source, target))
      }}
      onDragEnd={(event) => {
        if (event.canceled) return
        const { source, target } = event.operation
        if (source == null || target == null) return
        onDragEnd(constructMoveInfo(source, target))
      }}
    >
      {children}
    </DragDropProvider>
  )
}

type ListConfig<T> = {
  items: T[]
  getId: (item: T) => string
  getGroupId: (item: T) => string
  groupId: string
  compare: (a: T, b: T) => number
  draggableTypeId: string
  acceptsDraggableTypes: string[]
  collisionPriority: CollisionPriority
}

type ListProps<T> = {
  config: ListConfig<T>
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

function List<T>({ config, children }: ListProps<T>) {
  const { items, getId, getGroupId, groupId, compare, draggableTypeId, acceptsDraggableTypes, collisionPriority } = config

  const sortedItems = useMemo(() => {
    return items.filter((item) => getGroupId(item) === groupId).sort(compare)
  }, [items, getGroupId, groupId, compare])

  // Compute lastChildId for parent items (items that accept other types)
  const lastItem = sortedItems[sortedItems.length - 1]
  const lastChildId = lastItem != null ? getId(lastItem) : null

  return (
    <>
      {sortedItems.map((item, index) => {
        const prevItem = sortedItems[index - 1]
        const prevId = prevItem != null ? getId(prevItem) : null

        return (
          <ListItem
            key={getId(item)}
            item={item}
            index={index}
            id={getId(item)}
            groupId={groupId}
            prevId={prevId}
            lastChildId={acceptsDraggableTypes.length > 1 ? lastChildId : undefined}
            draggableTypeId={draggableTypeId}
            acceptsDraggableTypes={acceptsDraggableTypes}
            collisionPriority={collisionPriority}
          >
            {children}
          </ListItem>
        )
      })}
    </>
  )
}

type ListItemProps<T> = {
  item: T
  index: number
  id: string
  groupId: string
  prevId: string | null
  lastChildId: string | null | undefined
  draggableTypeId: string
  acceptsDraggableTypes: string[]
  collisionPriority: CollisionPriority
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

function ListItem<T>({
  item,
  index,
  id,
  groupId,
  prevId,
  lastChildId,
  draggableTypeId,
  acceptsDraggableTypes,
  collisionPriority,
  children,
}: ListItemProps<T>) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    type: draggableTypeId,
    accept: acceptsDraggableTypes,
    group: groupId,
    collisionPriority,
    data: {
      groupId,
      prevId,
      ...(lastChildId !== undefined && { lastChildId }),
    },
  })

  return <>{children({ ref, item, isDragging })}</>
}

type GroupConfig = {
  groupId: string
  accept: string[]
}

type GroupProps = {
  config: GroupConfig
  children: (props: { ref: (element: HTMLElement | null) => void; isDropTarget: boolean }) => ReactNode
}

function Group({ config, children }: GroupProps) {
  const { groupId, accept } = config

  const { ref, isDropTarget } = useDroppable({
    id: groupId,
    type: GROUP_TYPE,
    accept,
    collisionPriority: CP.Low,
  })

  return <>{children({ ref, isDropTarget })}</>
}

export const DndList = {
  Root,
  List,
  Group,
}
