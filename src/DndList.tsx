/* eslint-disable react-refresh/only-export-components */
import { type ReactNode, useMemo, useCallback, useId } from 'react'
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

const LIST_TYPE = Symbol('dndlist-list')
const GROUP_TYPE = Symbol('dndlist-group')

function constructMoveInfo(
  source: { id: unknown; type: unknown },
  target: { id: unknown; type: unknown; data?: { groupId?: string; prevId?: string | null } }
): MoveInfo {
  const targetData = target.data ?? {}
  const isContainerTarget = target.type === LIST_TYPE || target.type === GROUP_TYPE

  return {
    itemId: String(source.id),
    draggableTypeId: String(source.type),
    toGroupId: targetData.groupId ?? '',
    beforeId: isContainerTarget ? null : (targetData.prevId ?? null),
    afterId: isContainerTarget ? null : String(target.id),
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

type ItemRenderProps<T> = {
  ref: (element: HTMLElement | null) => void
  item: T
  isDragging: boolean
}

type RenderItemsFn<T> = (renderItem: (props: ItemRenderProps<T>) => ReactNode) => ReactNode

type ListRenderProps<T> = {
  containerRef: (element: HTMLElement | null) => void
  isDropTarget: boolean
  renderItems: RenderItemsFn<T>
}

type ListProps<T> = {
  config: ListConfig<T>
  children: (props: ListRenderProps<T>) => ReactNode
}

function List<T>({ config, children }: ListProps<T>) {
  const { items, getId, getGroupId, groupId, compare, draggableTypeId, acceptsDraggableTypes, collisionPriority } = config

  const listDroppableId = useId()
  const { ref: containerRef, isDropTarget } = useDroppable({
    id: listDroppableId,
    type: LIST_TYPE,
    accept: acceptsDraggableTypes,
    collisionPriority: CP.Low,
    data: {
      groupId,
    },
  })

  const sortedItems = useMemo(() => {
    return items.filter((item) => getGroupId(item) === groupId).sort(compare)
  }, [items, getGroupId, groupId, compare])

  const renderItems: RenderItemsFn<T> = (renderItem) => {
    return sortedItems.map((item, index) => {
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
          draggableTypeId={draggableTypeId}
          acceptsDraggableTypes={acceptsDraggableTypes}
          collisionPriority={collisionPriority}
        >
          {renderItem}
        </ListItem>
      )
    })
  }

  return <>{children({ containerRef, isDropTarget, renderItems })}</>
}

type ListItemProps<T> = {
  item: T
  index: number
  id: string
  groupId: string
  prevId: string | null
  draggableTypeId: string
  acceptsDraggableTypes: string[]
  collisionPriority: CollisionPriority
  children: (props: ItemRenderProps<T>) => ReactNode
}

function ListItem<T>({
  item,
  index,
  id,
  groupId,
  prevId,
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
    },
  })

  return <>{children({ ref, item, isDragging })}</>
}

type GroupConfig = {
  id: string
  index: number
  draggableTypeId: string
  acceptsDraggableTypes: string[]
  groupId: string
  prevId: string | null
  acceptsChildTypes: string[]
  collisionPriority?: CollisionPriority
}

type GroupProps = {
  config: GroupConfig
  children: (props: {
    ref: (element: HTMLElement | null) => void
    isDragging: boolean
    isDropTarget: boolean
  }) => ReactNode
}

function Group({ config, children }: GroupProps) {
  const {
    id,
    index,
    draggableTypeId,
    acceptsDraggableTypes,
    groupId,
    prevId,
    acceptsChildTypes,
    collisionPriority = CP.Low,
  } = config

  const groupDroppableId = useId()

  const { ref: sortableRef, isDragging } = useSortable({
    id,
    index,
    type: draggableTypeId,
    accept: acceptsDraggableTypes,
    group: groupId,
    collisionPriority,
    data: {
      groupId,
      prevId,
    },
  })

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: groupDroppableId,
    type: GROUP_TYPE,
    accept: acceptsChildTypes,
    collisionPriority: CP.Low,
    data: {
      groupId: id, // This group's id is the groupId for children
    },
  })

  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      sortableRef(element)
      droppableRef(element)
    },
    [sortableRef, droppableRef]
  )

  return <>{children({ ref: combinedRef, isDragging, isDropTarget })}</>
}

export const DndList = {
  Root,
  List,
  Group,
}
